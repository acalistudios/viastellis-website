-- Keep the additive 8-argument implementation. Its defaults also cover old
-- named 6/7-argument requests without PostgREST's ambiguous-overload error.
drop function if exists public.set_subscription(uuid,text,text,text,timestamptz,text);
drop function if exists public.set_subscription(uuid,text,text,text,timestamptz,text,text);
revoke all on function public.set_subscription(uuid,text,text,text,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.set_subscription(uuid,text,text,text,timestamptz,text,text,text) to service_role;
