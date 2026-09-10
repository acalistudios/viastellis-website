-- ============================================================================
-- STRIPE APP SCOPING — 2026-08-05
--
-- WHY: the ACALI Studios Stripe account is now shared between ViaStellis and
-- Shattered Saga. Stripe delivers webhook events ACCOUNT-WIDE, so ViaStellis's
-- endpoint now receives Shattered Saga's events too.
--
-- The dangerous case is subscription lifecycle events matched on
-- stripe_customer_id: if one Stripe Customer ever represents the same human
-- across both products, cancelling a Shattered Saga subscription would set that
-- person's ViaStellis tier to 'free'. Nothing errors — they silently lose paid
-- access. Same shape in reverse for invoice.paid, which could hand out
-- ViaStellis Premium for a Shattered Saga payment.
--
-- This migration adds the two things the handler needs to be safe:
--   1. profiles.stripe_subscription_id — so lifecycle events match on the
--      SUBSCRIPTION, not the customer.
--   2. stripe_events — a seen-event ledger giving handler-level idempotency
--      for every event type (previously only grant_credits deduped, so
--      set_subscription re-ran on every Stripe re-delivery).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Track the specific subscription that belongs to ViaStellis
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists stripe_subscription_id text unique;

comment on column public.profiles.stripe_subscription_id is
  'The Stripe Subscription id for this user''s ViaStellis plan. Subscription '
  'lifecycle webhooks match on THIS, never on stripe_customer_id alone — a '
  'customer may hold subscriptions for other ACALI products.';

-- ─────────────────────────────────────────────────────────────
-- 2. Seen-event ledger (idempotency for ALL event types)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.stripe_events (
  event_id    text primary key,          -- Stripe's evt_… id
  event_type  text not null,
  app         text,                      -- metadata.app, null when unstamped (legacy)
  user_id     uuid references public.profiles(id) on delete set null,
  outcome     text not null check (outcome in ('processed', 'foreign', 'unmapped')),
  created_at  timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Service-role only: no client policy is defined, so clients see nothing.

create index if not exists stripe_events_created on public.stripe_events (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3. claim_stripe_event() — atomic "have I handled this already?"
--    Returns true if this is the first time we've seen the event id.
--    Stripe retries deliveries, so every handler path calls this first.
-- ─────────────────────────────────────────────────────────────
create or replace function public.claim_stripe_event(
  p_event_id   text,
  p_event_type text,
  p_app        text default null,
  p_user_id    uuid default null,
  p_outcome    text default 'processed'
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.stripe_events (event_id, event_type, app, user_id, outcome)
  values (p_event_id, p_event_type, p_app, p_user_id, p_outcome);
  return true;
exception when unique_violation then
  return false;  -- already handled on an earlier delivery
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. set_subscription() — now also records the subscription id.
--    Signature is additive (new arg defaults to null), so existing callers
--    keep working unchanged.
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_subscription(
  p_user_id          uuid,
  p_tier             text,
  p_status           text,
  p_price_id         text default null,
  p_period_end       timestamptz default null,
  p_customer_id      text default null,
  p_subscription_id  text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set subscription_tier       = p_tier,
      subscription_status     = p_status,
      subscription_price_id   = coalesce(p_price_id, subscription_price_id),
      subscription_period_end = coalesce(p_period_end, subscription_period_end),
      stripe_customer_id      = coalesce(p_customer_id, stripe_customer_id),
      stripe_subscription_id  = coalesce(p_subscription_id, stripe_subscription_id)
  where id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Resolve a user from a Stripe SUBSCRIPTION id (preferred path).
-- ─────────────────────────────────────────────────────────────
create or replace function public.user_for_stripe_subscription(p_subscription_id text)
returns uuid
language sql
stable security definer set search_path = public
as $$
  select id from public.profiles where stripe_subscription_id = p_subscription_id limit 1;
$$;
