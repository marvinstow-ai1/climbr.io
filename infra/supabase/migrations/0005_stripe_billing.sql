-- climbr.io — Phase 3: Stripe billing.
--
-- Adds stripe_* columns to public.users + a billing_events audit log written
-- by the webhook handler so we have a record of every state change Stripe
-- pushed to us.

alter table public.users
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status text
    check (subscription_status is null or subscription_status in (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
    )),
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists trial_end timestamptz;

create index if not exists users_stripe_customer_idx on public.users(stripe_customer_id);
create index if not exists users_stripe_subscription_idx on public.users(stripe_subscription_id);

-- ---------- billing_events: append-only audit log ----------
-- Webhooks are stored verbatim (after signature verification) so we can
-- replay or debug after the fact. event_id is unique → safe to retry without
-- duplicates.
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,            -- Stripe's evt_xxx
  user_id uuid references public.users(id) on delete set null,
  type text not null,                       -- e.g. 'customer.subscription.updated'
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index if not exists billing_events_user_idx on public.billing_events(user_id, received_at desc);
create index if not exists billing_events_type_idx on public.billing_events(type, received_at desc);

-- RLS: users can read their own billing events (audit transparency); writes
-- happen exclusively via service role from the webhook handler.
alter table public.billing_events enable row level security;
create policy "billing_events_owner_select" on public.billing_events
  for select using (auth.uid() = user_id);
