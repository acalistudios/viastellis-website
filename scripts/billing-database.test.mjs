// Real PostgreSQL/PLpgSQL, isolated in memory. Never connects to production.
// Run: node --test scripts/billing-database.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('Postgres billing permissions, atomicity, ownership and provider isolation', async t => {
 const db = new PGlite();
 const migration = name => readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
   CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
   CREATE TABLE profiles(id uuid PRIMARY KEY, display_name text,avatar_url text,stella_persona text,
    credits_remaining integer DEFAULT 0,subscription_tier text DEFAULT 'free',subscription_source text);`);
  await db.exec(await migration('2026-06-14_billing.sql'));
  await db.exec(await migration('2026-08-05_stripe_app_scoping.sql'));
  await db.exec(await migration('2026-09-08_subscription_source.sql'));
  await db.exec(await migration('20260910130000_atomic_stripe_events.sql'));
  await db.exec(await migration('20260910210000_billing_rpc_permissions.sql'));
  await db.exec(await migration('20260910211000_provider_entitlements.sql'));
  await db.exec("CREATE TABLE usage_ledger(id uuid PRIMARY KEY,user_id uuid,credits_debited integer,status text DEFAULT 'success')");
  await db.exec(await migration('20260910220000_credit_helper_permissions.sql'));
  await db.exec(await migration('20260910223000_subscription_rpc_signature.sql'));
  const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
  await db.query('INSERT INTO profiles(id,stripe_customer_id) VALUES($1,\'cus_a\'),($2,\'cus_b\')',[alice,bob]);
  const state=async()=> (await db.query('SELECT * FROM profiles WHERE id=$1',[alice])).rows[0];
  const count=async table => (await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;
  const apply=async(o={})=> (await db.query(`SELECT apply_billing_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) result`,
   [o.event,'test',o.provider??'stripe',o.user??alice,o.sub??null,o.tier??null,o.status??null,o.end??null,null,o.time??100,o.credits??0,o.grant??null,'subscription',null,o.customer??null])).rows[0].result;
  await t.test('all billing mutation overloads are backend-only',async()=>{
   const {rows}=await db.query(`SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') a,has_function_privilege('authenticated',p.oid,'EXECUTE') b,has_function_privilege('service_role',p.oid,'EXECUTE') s FROM pg_proc p WHERE proname IN ('grant_credits','set_subscription','claim_stripe_event','apply_stripe_event','apply_billing_event','acquire_billing_checkout')`);
   assert.ok(rows.length>=6); for(const row of rows){assert.equal(row.a,false,row.proname);assert.equal(row.b,false,row.proname);assert.equal(row.s,true,row.proname)}
  });
  await t.test('duplicate deliveries and duplicate objects grant exactly once',async()=>{
   await Promise.all(Array.from({length:8},()=>apply({event:'evt1',credits:30,grant:'invoice:1'})));
   await apply({event:'evt2',credits:30,grant:'invoice:1'});
   assert.equal((await state()).credits_remaining,30);assert.equal(await count('credit_purchases'),1);
  });
  await t.test('failure after credit grant rolls back claim, grant, balance and permits retry',async()=>{
   const before=await count('stripe_events');
   await assert.rejects(apply({event:'retry',credits:10,grant:'checkout:2',customer:'cus_wrong'}));
   assert.equal(await count('stripe_events'),before);assert.equal((await state()).credits_remaining,30);
   await apply({event:'retry',credits:10,grant:'checkout:2',customer:'cus_a'});
   assert.equal((await state()).credits_remaining,40);
  });
  const end=new Date(Date.now()+86400000).toISOString();
  await t.test('old cancellation cannot revoke new Stripe or Play entitlement',async()=>{
   await apply({event:'s1',sub:'old',tier:'premium',status:'active',end});
   await apply({event:'s2',sub:'new',tier:'premium',status:'active',end,time:200});
   await apply({event:'s3',sub:'old',tier:'free',status:'canceled',end,time:300});
   assert.equal((await state()).subscription_tier,'premium');assert.equal((await state()).stripe_subscription_id,'new');
   await apply({event:'p1',provider:'play',sub:'play1',tier:'premium',status:'active',end,time:400});
   await apply({event:'s4',sub:'new',tier:'free',status:'canceled',end,time:500});
   assert.equal((await state()).subscription_tier,'premium');assert.equal((await state()).subscription_source,'play');
   await apply({event:'s5',sub:'new',tier:'premium',status:'active',end,time:600});
   await apply({event:'p2',provider:'play',sub:'play1',tier:'free',status:'canceled',end,time:700});
   assert.equal((await state()).subscription_tier,'premium');assert.equal((await state()).subscription_source,'stripe');
  });
  await t.test('stale snapshot cannot downgrade recovered subscription',async()=>{
   await apply({event:'stale',sub:'new',tier:'free',status:'unpaid',end,time:550});
   assert.equal((await state()).subscription_tier,'premium');
  });
  await t.test('subscription reassignment rejected without poisoned event',async()=>{
   const before=await count('stripe_events');
   await assert.rejects(apply({event:'stolen',user:bob,sub:'new',tier:'premium',status:'active',end,credits:100,grant:'stolen'}));
   assert.equal(await count('stripe_events'),before);
  });
  await t.test('checkout lock serializes requests',async()=>{
   const result=await Promise.all([alice,bob].map(token=>db.query('SELECT acquire_billing_checkout($1,$2) ok',[alice,token])));
   assert.equal(result.filter(r=>r.rows[0].ok).length,1);
  });
  await t.test('refund requires a real own debit and is idempotent',async()=>{
   const before=(await state()).credits_remaining;
   await db.query('SELECT refund_credit($1,$2)',[alice,bob]);assert.equal((await state()).credits_remaining,before);
   await db.query('INSERT INTO usage_ledger(id,user_id,credits_debited) VALUES($1,$2,1)',[alice,alice]);
   await db.query('SELECT refund_credit($1,$2)',[bob,alice]);assert.equal((await state()).credits_remaining,before);
   await Promise.all([1,2,3].map(()=>db.query('SELECT refund_credit($1,$2)',[alice,alice])));
   assert.equal((await state()).credits_remaining,before+1);
   const {rows}=await db.query("SELECT has_function_privilege('authenticated','refund_credit(uuid,uuid)','EXECUTE') allowed");assert.equal(rows[0].allowed,false);
  });
 } finally {await db.close()}
});
