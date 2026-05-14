-- climbr.io — Phase 2: DataForSEO integration, keyword research, competitor
-- analysis, dashboard cache, advanced notification settings.

-- ---------- dataforseo response cache ----------
-- Generic key-value cache for any DataForSEO call. We hash the (endpoint, args)
-- into `cache_key` so any module can share entries. `expires_at` lets the daily
-- cron / on-demand refresh decide when to bust an entry.
create table if not exists public.dataforseo_cache (
  cache_key text primary key,
  endpoint text not null,
  payload jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists dataforseo_cache_expires_idx on public.dataforseo_cache(expires_at);
create index if not exists dataforseo_cache_endpoint_idx on public.dataforseo_cache(endpoint);

-- ---------- keyword research history ----------
create table if not exists public.keyword_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  keyword text not null,
  location_code int not null default 2276, -- DataForSEO: Germany (de)
  language_code text not null default 'de',
  search_volume int,
  cpc numeric(10, 2),
  competition numeric(5, 2),       -- 0..1 from DataForSEO
  keyword_difficulty int,          -- 0..100 (estimated when KD unavailable)
  serp_top10 jsonb,                -- [{position, title, url, domain, snippet}]
  related_keywords jsonb,          -- [{keyword, search_volume, cpc, kd}]
  raw jsonb,                       -- raw provider response for debugging
  created_at timestamptz not null default now()
);
create index if not exists keyword_research_user_created_idx on public.keyword_research(user_id, created_at desc);
create index if not exists keyword_research_keyword_idx on public.keyword_research(keyword);

-- ---------- competitor analysis history ----------
create table if not exists public.competitor_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  domain text not null,
  compare_domain text,             -- optional 2nd domain when comparing
  location_code int not null default 2276,
  language_code text not null default 'de',
  organic_keywords_count int,
  organic_traffic int,
  paid_traffic int,
  backlinks_count int,
  referring_domains int,
  top_keywords jsonb,              -- [{keyword, position, search_volume, traffic, url}]
  top_competitors jsonb,           -- [{domain, intersections, organic_traffic}]
  compare_snapshot jsonb,          -- when compare_domain set: same shape for it
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists competitor_analysis_user_created_idx on public.competitor_analysis(user_id, created_at desc);

-- ---------- dashboard snapshot (per project, refreshed daily) ----------
create table if not exists public.dashboard_snapshots (
  project_id uuid primary key references public.projects(id) on delete cascade,
  organic_traffic int,
  organic_keywords_count int,
  traffic_trend jsonb,             -- [{date: 'YYYY-MM-DD', traffic: n}]
  top_gainers jsonb,               -- [{keyword, old_position, new_position}]
  top_losers jsonb,                -- [{keyword, old_position, new_position}]
  competitor_moves jsonb,          -- [{domain, change}]
  refreshed_at timestamptz not null default now()
);

-- ---------- notification settings (extends public.settings semantics) ----------
-- We extend the existing `settings` row with phase-2 thresholds rather than
-- creating a new table — keeps the per-user notification config in one place.
alter table public.settings
  add column if not exists ranking_threshold int not null default 3
    check (ranking_threshold between 1 and 50);
alter table public.settings
  add column if not exists notification_frequency text not null default 'daily'
    check (notification_frequency in ('daily', 'weekly', 'off'));
alter table public.settings
  add column if not exists last_notification_email_at timestamptz;

-- ---------- per-project notification overrides (optional, fine-grained) ----------
-- A user can override the global threshold for a specific project. NULL = use
-- the user-level default from `settings`.
alter table public.projects
  add column if not exists notification_threshold int
    check (notification_threshold is null or notification_threshold between 1 and 50);

-- ---------- traffic_history (daily cache of DataForSEO domain traffic) ----------
create table if not exists public.traffic_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  recorded_at date not null,
  organic_traffic int,
  organic_keywords_count int,
  unique (project_id, recorded_at)
);
create index if not exists traffic_history_project_date_idx on public.traffic_history(project_id, recorded_at desc);

-- ---------- RLS ----------
alter table public.dataforseo_cache    enable row level security;
alter table public.keyword_research    enable row level security;
alter table public.competitor_analysis enable row level security;
alter table public.dashboard_snapshots enable row level security;
alter table public.traffic_history     enable row level security;

-- dataforseo_cache: never readable by end users — server-only via service role.
-- (We don't add any policy => no client read possible.)

-- keyword_research: scoped to owner.
create policy "keyword_research_owner_select" on public.keyword_research
  for select using (auth.uid() = user_id);
create policy "keyword_research_owner_delete" on public.keyword_research
  for delete using (auth.uid() = user_id);
-- writes via service-role server only.

-- competitor_analysis: scoped to owner.
create policy "competitor_analysis_owner_select" on public.competitor_analysis
  for select using (auth.uid() = user_id);
create policy "competitor_analysis_owner_delete" on public.competitor_analysis
  for delete using (auth.uid() = user_id);

-- dashboard_snapshots: owner via project.
create policy "dashboard_snapshots_owner_select" on public.dashboard_snapshots
  for select using (
    exists (select 1 from public.projects p
            where p.id = dashboard_snapshots.project_id and p.user_id = auth.uid())
  );

-- traffic_history: owner via project.
create policy "traffic_history_owner_select" on public.traffic_history
  for select using (
    exists (select 1 from public.projects p
            where p.id = traffic_history.project_id and p.user_id = auth.uid())
  );
