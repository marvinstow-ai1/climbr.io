-- climbr.io — SEO workflow tables (opportunities, tasks, briefs, workflow_steps, reports, integrations)
-- Adds the persistence layer for the SEO workflow assistant.

-- ---------- integrations (per-user provider status) ----------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('gsc', 'dataforseo', 'openai')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  credentials_enc text, -- AES-256-GCM ciphertext (login:password for DataForSEO, API key for OpenAI)
  meta jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
create index if not exists integrations_user_idx on public.integrations(user_id);

-- Defense in depth: never let the encrypted credentials reach the client.
revoke select (credentials_enc) on public.integrations from anon, authenticated;

-- ---------- opportunities ----------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in (
    'high_impressions_low_ctr',
    'striking_distance',
    'declining_clicks',
    'stagnant_impressions',
    'missing_meta'
  )),
  page_url text,
  query text,
  impressions int,
  clicks int,
  ctr numeric(6,4),
  position numeric(6,2),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  impact text not null default 'medium' check (impact in ('high', 'medium', 'low')),
  effort text not null default 'medium' check (effort in ('low', 'medium', 'high')),
  score int not null default 0,
  status text not null default 'open' check (status in ('open', 'taskified', 'dismissed')),
  data jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists opportunities_project_idx on public.opportunities(project_id, status, score desc);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  why text,
  expected_impact text,
  effort text not null default 'medium' check (effort in ('low', 'medium', 'high')),
  suggested_action text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'ignored')),
  lane text not null default 'optimize' check (lane in ('connect', 'discover', 'optimize', 'publish', 'review', 'local')),
  data jsonb not null default '{}'::jsonb,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks(project_id, status);

-- ---------- briefs ----------
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  page_url text,
  intent text,
  brief jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists briefs_project_idx on public.briefs(project_id, created_at desc);

-- ---------- workflow_steps (per project, per month) ----------
create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  period text not null, -- YYYY-MM
  step text not null check (step in ('connect', 'discover', 'optimize', 'publish', 'review')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  progress int not null default 0,
  updated_at timestamptz not null default now(),
  unique (project_id, period, step)
);
create index if not exists workflow_steps_project_idx on public.workflow_steps(project_id, period);

-- ---------- reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  period text not null, -- YYYY-MM
  metrics jsonb not null,
  summary text,
  created_at timestamptz not null default now(),
  unique (project_id, period)
);
create index if not exists reports_project_idx on public.reports(project_id, period desc);

-- ---------- RLS ----------
alter table public.integrations    enable row level security;
alter table public.opportunities   enable row level security;
alter table public.tasks           enable row level security;
alter table public.briefs          enable row level security;
alter table public.workflow_steps  enable row level security;
alter table public.reports         enable row level security;

create policy "integrations_self_all" on public.integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "opportunities_owner_select" on public.opportunities
  for select using (
    exists (select 1 from public.projects p where p.id = opportunities.project_id and p.user_id = auth.uid())
  );
create policy "opportunities_owner_update" on public.opportunities
  for update using (
    exists (select 1 from public.projects p where p.id = opportunities.project_id and p.user_id = auth.uid())
  );

create policy "tasks_owner_all" on public.tasks
  for all using (
    exists (select 1 from public.projects p where p.id = tasks.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = tasks.project_id and p.user_id = auth.uid())
  );

create policy "briefs_owner_select" on public.briefs
  for select using (
    exists (select 1 from public.projects p where p.id = briefs.project_id and p.user_id = auth.uid())
  );

create policy "workflow_steps_owner_select" on public.workflow_steps
  for select using (
    exists (select 1 from public.projects p where p.id = workflow_steps.project_id and p.user_id = auth.uid())
  );
create policy "workflow_steps_owner_update" on public.workflow_steps
  for update using (
    exists (select 1 from public.projects p where p.id = workflow_steps.project_id and p.user_id = auth.uid())
  );

create policy "reports_owner_select" on public.reports
  for select using (
    exists (select 1 from public.projects p where p.id = reports.project_id and p.user_id = auth.uid())
  );
