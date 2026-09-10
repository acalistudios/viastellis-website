-- Apply a Stripe event and its entitlement mutation in one Postgres transaction.
-- If any mutation fails, the event claim rolls back so Stripe may retry safely.
create or replace function public.apply_stripe_event(
  p_event_id text,
  p_event_type text,
  p_app text,
  p_user_id uuid,
  p_action text,
  p_credits integer default 0,
  p_credit_source text default null,
  p_amount_cents integer default null,
  p_tier text default null,
  p_status text default null,
  p_price_id text default null,
  p_period_end timestamptz default null,
  p_customer_id text default null,
  p_subscription_id text default null,
  p_source text default 'stripe'
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_inserted integer;
  v_updated integer;
begin
  if p_action not in ('checkout_subscription', 'checkout_pack', 'invoice_paid', 'subscription_state') then
    raise exception 'unsupported Stripe action: %', p_action;
  end if;

  insert into public.stripe_events (event_id, event_type, app, user_id, outcome)
  values (p_event_id, p_event_type, p_app, p_user_id, 'processed')
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  if p_action in ('checkout_pack', 'invoice_paid') and coalesce(p_credits, 0) > 0 then
    perform public.grant_credits(
      p_user_id, p_credits, p_credit_source, p_event_id, p_amount_cents, null
    );
  end if;

  if p_action = 'checkout_pack' then
    update public.profiles
       set stripe_customer_id = coalesce(p_customer_id, stripe_customer_id)
     where id = p_user_id;
  elsif p_action = 'subscription_state' and p_tier = 'free' then
    -- A Stripe cancellation must not revoke a Google Play entitlement.
    update public.profiles
       set subscription_tier = p_tier,
           subscription_status = p_status,
           subscription_price_id = coalesce(p_price_id, subscription_price_id),
           subscription_period_end = coalesce(p_period_end, subscription_period_end),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id)
     where id = p_user_id and subscription_source is distinct from 'play';
  else
    update public.profiles
       set subscription_tier = coalesce(p_tier, subscription_tier),
           subscription_status = coalesce(p_status, subscription_status),
           subscription_price_id = coalesce(p_price_id, subscription_price_id),
           subscription_period_end = coalesce(p_period_end, subscription_period_end),
           stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
           stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
           subscription_source = coalesce(p_source, subscription_source)
     where id = p_user_id;
  end if;

  get diagnostics v_updated = row_count;
  if v_updated = 0 and not (p_action = 'subscription_state' and p_tier = 'free') then
    raise exception 'Stripe event % mapped to missing profile %', p_event_id, p_user_id;
  end if;
  return 'applied';
end;
$$;

revoke all on function public.apply_stripe_event(text,text,text,uuid,text,integer,text,integer,text,text,text,timestamptz,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_stripe_event(text,text,text,uuid,text,integer,text,integer,text,text,text,timestamptz,text,text,text) to service_role;
