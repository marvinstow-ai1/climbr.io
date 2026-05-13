-- climbr.io — initial schema
-- All tables live in the public schema. Auth lives in auth.users (Supabase managed).

create extension if not exists "pgcrypto";

-- ---------- users (profile rows, FK to auth.users) ----------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  locale text not null default 'en' check (locale in ('en', 'de')),
  created_at timestamptz not null default now()
);

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  domain text not null,
  gsc_connected boolean not null default false,
  gsc_refresh_token_enc text,   -- AES-256-GCM ciphertext; null until OAuth complete
  gsc_site_url text,            -- e.g. sc-domain:example.com
  created_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);

-- ---------- audits ----------
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  -- audits may exist before user signup (anonymous quick audit). project_id can be null
  -- until the user converts; we keep an email shadow column for the email-capture flow.
  capture_email text,
  url text not null,
  raw_crawl_json jsonb not null,
  ai_report_json jsonb,
  score int check (score between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'crawling', 'analyzing', 'complete', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists audits_project_id_idx on public.audits(project_id);
create index if not exists audits_created_at_idx on public.audits(created_at);
create index if not exists audits_capture_email_idx on public.audits(capture_email);

-- ---------- keywords ----------
create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (project_id, keyword)
);

-- ---------- rankings ----------
create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  position int,                 -- null = not in top 100
  recorded_at timestamptz not null default now()
);
create index if not exists rankings_project_keyword_idx on public.rankings(project_id, keyword, recorded_at desc);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  old_position int,
  new_position int,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_project_seen_idx on public.notifications(project_id, seen);

-- ---------- settings ----------
create table if not exists public.settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_notifications boolean not null default true,
  locale text not null default 'en' check (locale in ('en', 'de'))
);

-- ---------- rate limits (anonymous audit IP tracking) ----------
create table if not exists public.anon_audit_log (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  url text not null,
  created_at timestamptz not null default now()
);
create index if not exists anon_audit_log_ip_idx on public.anon_audit_log(ip, created_at desc);

-- ---------- trigger: create profile row + settings on auth.users insert ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
