-- Independent provider/subscription state; no cancellation can revoke a
-- different subscription. The profile is a projection, not the event ledger.
alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check check
 (subscription_status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused','none'));

create table if not exists public.billing_entitlements (
 provider text not null check(provider in ('stripe','play','manual')),
 external_id text not null,
 user_id uuid not null references public.profiles(id) on delete cascade,
 tier text not null check(tier in ('free','premium')),
 status text not null,
 period_end timestamptz,
 price_id text,
 observed_at bigint not null default 0,
 primary key(provider,external_id)
);
alter table public.billing_entitlements enable row level security;
revoke all on public.billing_entitlements from anon,authenticated;
grant all on public.billing_entitlements to service_role;

-- Preserve existing access while transitioning, including manual Premium.
insert into public.billing_entitlements(provider,external_id,user_id,tier,status,period_end,price_id)
select case when subscription_source='play' then 'play'
            when stripe_subscription_id is not null and subscription_source is distinct from 'play' then 'stripe'
            else 'manual' end,
       case when subscription_source='play' then 'legacy:'||id::text
            when stripe_subscription_id is not null then stripe_subscription_id
            else 'manual:'||id::text end,
       id,subscription_tier,coalesce(subscription_status,'active'),subscription_period_end,subscription_price_id
from public.profiles where subscription_tier='premium' or stripe_subscription_id is not null
on conflict do nothing;

create table if not exists public.billing_checkout_locks (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 token uuid not null, expires_at timestamptz not null
);
alter table public.billing_checkout_locks enable row level security;
revoke all on public.billing_checkout_locks from anon,authenticated;
grant all on public.billing_checkout_locks to service_role;

create or replace function public.acquire_billing_checkout(p_user_id uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into billing_checkout_locks values(p_user_id,p_token,now()+interval '2 minutes')
 on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at
 where billing_checkout_locks.expires_at<now();
 get diagnostics n=row_count;
 return n=1;
end $$;
revoke all on function public.acquire_billing_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.acquire_billing_checkout(uuid,uuid) to service_role;

create or replace function public.apply_billing_event(
 p_event_id text,p_event_type text,p_provider text,p_user_id uuid,
 p_external_id text default null,p_tier text default null,p_status text default null,
 p_period_end timestamptz default null,p_price_id text default null,
 p_observed_at bigint default 0,p_credits integer default 0,
 p_grant_key text default null,p_credit_source text default 'subscription',
 p_amount_cents integer default null,p_customer_id text default null
) returns text language plpgsql security definer set search_path=public as $$
declare n integer; chosen billing_entitlements%rowtype;
begin
 if p_provider not in ('stripe','play') or p_credits<0 then raise exception 'Invalid billing input'; end if;
 -- Serialize updates for the entire account, including concurrent providers.
 perform 1 from profiles where id=p_user_id for update;
 if not found then raise exception 'Missing billing user'; end if;
 insert into stripe_events(event_id,event_type,app,user_id,outcome)
 values(p_event_id,p_event_type,'viastellis',p_user_id,'processed') on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then return 'duplicate'; end if;
 if p_credits>0 then
   if p_grant_key is null then raise exception 'Missing grant identity'; end if;
   perform grant_credits(p_user_id,p_credits,p_credit_source,p_grant_key,p_amount_cents,null);
 end if;
 if p_external_id is not null then
   if exists(select 1 from billing_entitlements where provider=p_provider and external_id=p_external_id and user_id<>p_user_id)
   then raise exception 'Subscription ownership conflict'; end if;
   insert into billing_entitlements(provider,external_id,user_id,tier,status,period_end,price_id,observed_at)
   values(p_provider,p_external_id,p_user_id,p_tier,p_status,p_period_end,p_price_id,p_observed_at)
   on conflict(provider,external_id) do update set tier=excluded.tier,status=excluded.status,
     period_end=excluded.period_end,price_id=excluded.price_id,observed_at=excluded.observed_at
   where billing_entitlements.user_id=excluded.user_id and billing_entitlements.observed_at<=excluded.observed_at;
   if exists(select 1 from billing_entitlements where provider=p_provider and external_id=p_external_id and user_id<>p_user_id)
   then raise exception 'Subscription ownership conflict'; end if;
   if p_provider='play' and p_external_id not like 'legacy:%' then
     delete from billing_entitlements where provider='play' and external_id='legacy:'||p_user_id::text;
   end if;
   select * into chosen from billing_entitlements where user_id=p_user_id
   order by (tier='premium' and (provider='manual' or period_end is null or period_end>now())) desc,
            period_end desc nulls last,observed_at desc,external_id limit 1;
   update profiles set
    subscription_tier=case when chosen.tier='premium' and (chosen.provider='manual' or chosen.period_end is null or chosen.period_end>now()) then 'premium' else 'free' end,
    subscription_status=chosen.status,subscription_period_end=chosen.period_end,
    subscription_price_id=chosen.price_id,
    subscription_source=case when chosen.provider='manual' then null else chosen.provider end,
    stripe_subscription_id=case when p_provider='stripe' and (chosen.provider='stripe' or stripe_subscription_id is null) then
       case when chosen.provider='stripe' then chosen.external_id else p_external_id end else stripe_subscription_id end
   where id=p_user_id;
 end if;
 if p_customer_id is not null then
   update profiles set stripe_customer_id=p_customer_id where id=p_user_id and (stripe_customer_id is null or stripe_customer_id=p_customer_id);
   if not found then raise exception 'Customer ownership conflict'; end if;
 end if;
 return 'applied';
end $$;
revoke all on function public.apply_billing_event(text,text,text,uuid,text,text,text,timestamptz,text,bigint,integer,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.apply_billing_event(text,text,text,uuid,text,text,text,timestamptz,text,bigint,integer,text,text,integer,text) to service_role;
