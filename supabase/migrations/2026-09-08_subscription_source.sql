-- ============================================================================
-- DUAL BILLING RAIL: SUBSCRIPTION SOURCE (Stripe & Google Play) — 2026-09-08
--
-- Adds subscription_source to public.profiles and extends set_subscription()
-- to accept p_source ('stripe' | 'play').
--
-- Prevents cross-rail collisions: a cancellation or expiration from one payment
-- provider must never downgrade a subscription managed by the other.
-- ============================================================================

-- 1. Add subscription_source column
alter table public.profiles
  add column if not exists subscription_source text check (subscription_source in ('stripe', 'play'));

comment on column public.profiles.subscription_source is
  'Which payment rail owns the user''s active subscription: stripe (web) or play (Google Play / RevenueCat). '
  'Webhook downgrade handlers must only revoke premium if subscription_source matches their own provider.';

-- 2. Update set_subscription() to support p_source (additive, backward-compatible)
create or replace function public.set_subscription(
  p_user_id          uuid,
  p_tier             text,
  p_status           text,
  p_price_id         text default null,
  p_period_end       timestamptz default null,
  p_customer_id      text default null,
  p_subscription_id  text default null,
  p_source           text default null
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
      stripe_subscription_id  = coalesce(p_subscription_id, stripe_subscription_id),
      subscription_source     = coalesce(p_source, subscription_source)
  where id = p_user_id;
end;
$$;
