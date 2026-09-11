-- Credit consumption/refunds are backend operations, just like Stripe grants.
do $$
declare f record;
begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('debit_credit','refund_credit','consume_premium_reading','user_for_stripe_subscription')
 loop
  execute format('revoke all on function %s from public, anon, authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;

create or replace function public.refund_credit(p_user_id uuid,p_ledger_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare amount integer;
begin
 perform 1 from profiles where id=p_user_id for update;
 if not found then return; end if;
 update usage_ledger set status='refunded'
 where id=p_ledger_id and user_id=p_user_id and status<>'refunded' and credits_debited>0
 returning credits_debited into amount;
 if found then
  update profiles set credits_remaining=credits_remaining+amount where id=p_user_id;
 end if;
end $$;
revoke all on function public.refund_credit(uuid,uuid) from public,anon,authenticated;
grant execute on function public.refund_credit(uuid,uuid) to service_role;
