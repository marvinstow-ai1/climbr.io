-- climbr.io — GSC connection metadata
-- Adds connected_at timestamp + property URI form. The previous migration
-- already has gsc_connected + gsc_site_url + gsc_refresh_token_enc.

alter table public.projects
  add column if not exists gsc_connected_at timestamptz,
  add column if not exists gsc_property_uri text;

-- Defense in depth: prevent any client (anon/auth role) from selecting the
-- encrypted refresh token, even if a future policy is loosened by mistake.
revoke select (gsc_refresh_token_enc) on public.projects from anon, authenticated;
