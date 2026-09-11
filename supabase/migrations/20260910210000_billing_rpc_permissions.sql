-- Backend-only billing entry points, including historical overloads.
-- Do not drop overloads: deployed mobile and web callers may still use them.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('grant_credits','set_subscription','claim_stripe_event','apply_stripe_event')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end $$;
