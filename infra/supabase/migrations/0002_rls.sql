-- climbr.io — Row Level Security
-- Service role bypasses RLS; the frontend uses the anon key + user JWT, so all
-- policies are written against auth.uid().

alter table public.users          enable row level security;
alter table public.projects       enable row level security;
alter table public.audits         enable row level security;
alter table public.keywords       enable row level security;
alter table public.rankings       enable row level security;
alter table public.notifications  enable row level security;
alter table public.settings       enable row level security;

-- users: each user reads/updates their own row
create policy "users_self_select" on public.users
  for select using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update using (auth.uid() = id);

-- projects: scoped to owner
create policy "projects_owner_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audits: owner via project
create policy "audits_owner_select" on public.audits
  for select using (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = audits.project_id and p.user_id = auth.uid()
    )
  );
-- writes happen via service role (server). No client insert/update policy.

-- keywords
create policy "keywords_owner_all" on public.keywords
  for all using (
    exists (select 1 from public.projects p where p.id = keywords.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = keywords.project_id and p.user_id = auth.uid())
  );

-- rankings (read-only from client)
create policy "rankings_owner_select" on public.rankings
  for select using (
    exists (select 1 from public.projects p where p.id = rankings.project_id and p.user_id = auth.uid())
  );

-- notifications: read + update seen flag
create policy "notifications_owner_select" on public.notifications
  for select using (
    exists (select 1 from public.projects p where p.id = notifications.project_id and p.user_id = auth.uid())
  );
create policy "notifications_owner_update" on public.notifications
  for update using (
    exists (select 1 from public.projects p where p.id = notifications.project_id and p.user_id = auth.uid())
  );

-- settings
create policy "settings_self_all" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
