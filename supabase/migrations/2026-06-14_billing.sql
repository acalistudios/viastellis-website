-- ============================================================
-- BILLING: Stripe subscriptions + credit packs
-- Run in the Supabase SQL editor (or via supabase db push).
--
-- Contents:
--   1. SECURITY FIX — lock down which profile columns clients may write
--   2. Stripe-related columns on profiles
--   3. credit_purchases ledger (immutable record of every credit grant)
--   4. grant_credits()       — idempotent, server-side credit granting
--   5. set_subscription()    — server-side tier/status updates
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SECURITY FIX
-- The existing "profiles: own row update" RLS policy allowed clients to UPDATE
-- ANY column on their own row — including credits_remaining and subscription_tier.
-- That lets a user mint unlimited credits / Premium for free from the browser.
--
-- Fix: keep the own-row RLS policy, but use COLUMN-LEVEL privileges so clients
-- can only change cosmetic fields. Balance/tier/ban/stripe columns become
-- writable solely by the SECURITY DEFINER functions below (which run as the
-- table owner and bypass these grants).
-- ─────────────────────────────────────────────────────────────
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, avatar_url, stella_persona)
  on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Stripe columns on profiles
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists stripe_customer_id      text unique,
  add column if not exists subscription_status     text
    check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  add column if not exists subscription_price_id    text,
  add column if not exists subscription_period_end  timestamptz;

-- ─────────────────────────────────────────────────────────────
-- 3. credit_purchases — immutable ledger of credit grants
-- Written server-side only (via grant_credits). Clients read their own rows.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.credit_purchases (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  source           text not null check (source in ('subscription', 'pack', 'trial', 'manual', 'refund')),
  credits_granted  integer not null check (credits_granted > 0),
  amount_cents     integer,             -- what they paid, in cents (null for trial/manual)
  currency         text default 'usd',
  -- Idempotency key: Stripe can deliver the same event more than once, so we
  -- dedupe on the event id and never double-grant.
  stripe_event_id  text unique,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists credit_purchases_user_created
  on public.credit_purchases (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 4. grant_credits() — idempotent credit granting
-- Returns the number of credits actually granted (0 if this event was already
-- processed). Called only from the trusted stripe-webhook Edge Function.
-- ─────────────────────────────────────────────────────────────
create or replace function public.grant_credits(
  p_user_id         uuid,
  p_credits         integer,
  p_source          text,
  p_stripe_event_id text default null,
  p_amount_cents    integer default null,
  p_metadata        jsonb default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_inserted integer;
begin
  if p_credits is null or p_credits <= 0 then
    return 0;
  end if;

  -- Idempotent insert: if this stripe_event_id was already recorded, do nothing.
  insert into public.credit_purchases
    (user_id, source, credits_granted, amount_cents, stripe_event_id, metadata)
  values
    (p_user_id, p_source, p_credits, p_amount_cents, p_stripe_event_id, p_metadata)
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_inserted = row_count;

  -- Only bump the balance if this was a NEW (non-duplicate) grant.
  if v_inserted = 1 then
    update public.profiles
    set credits_remaining = credits_remaining + p_credits
    where id = p_user_id;
    return p_credits;
  end if;

  return 0;  -- duplicate event — already granted
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. set_subscription() — server-side tier/status updates
-- Called from stripe-webhook on subscription lifecycle events.
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_subscription(
  p_user_id      uuid,
  p_tier         text,
  p_status       text,
  p_price_id     text default null,
  p_period_end   timestamptz default null,
  p_customer_id  text default null
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
      stripe_customer_id      = coalesce(p_customer_id, stripe_customer_id)
  where id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS for credit_purchases — read-only for clients
-- ─────────────────────────────────────────────────────────────
alter table public.credit_purchases enable row level security;

create policy "credit_purchases: own rows read only"
  on public.credit_purchases for select
  using (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE — grants happen server-side only.
