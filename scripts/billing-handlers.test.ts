// Exercises the actual Edge Function handlers and Stripe SDK. Network boundaries
// are fixtures; SQL/transaction semantics are tested separately in PGlite.
import { assertEquals, assert } from 'jsr:@std/assert@1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
const uid='11111111-1111-4111-8111-111111111111'
for(const [key,value] of Object.entries({STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture',REVENUECAT_WEBHOOK_SECRET:'rc_fixture'})) Deno.env.set(key,value)
let handler: (request:Request)=>Promise<Response>
const serve=Deno.serve
const fetchOriginal=globalThis.fetch
let fixtureFetch: typeof fetch
globalThis.fetch=(...args)=>fixtureFetch(...args)
// Capture the actual entrypoint without opening a port.
Object.defineProperty(Deno,'serve',{value:(fn:typeof handler)=>{handler=fn}})
await import('../supabase/functions/stripe-webhook/index.ts')
const webhook=handler!
await import('../supabase/functions/create-checkout-session/index.ts')
const checkout=handler!
await import('../supabase/functions/cancel-subscription/index.ts')
const cancel=handler!
await import('../supabase/functions/revenuecat-webhook/index.ts')
const revenuecat=handler!
Object.defineProperty(Deno,'serve',{value:serve})
const sdk=new Stripe('sk_test_fixture')
const monthly={id:'price_month',object:'price',lookup_key:'vs_sub_monthly',active:true,currency:'usd',unit_amount:499,metadata:{app:'viastellis',credits:'30'},recurring:{interval:'month',interval_count:1}}
const pack={...monthly,id:'price_pack',lookup_key:'vs_pack_taster',unit_amount:99,metadata:{app:'viastellis',credits:'10'},recurring:null}
let rpc:any[], calls:any[], paid=true, foreign=false, dbError=false, legacy=false, existing=false
const list=(data:any[],url='/v1/items')=>({object:'list',data,has_more:false,url})
function reset() {
 rpc=[];calls=[];paid=true;foreign=false;dbError=false;legacy=false;existing=false
 fixtureFetch=async(input:any,init:any={})=>{
  const url=new URL(typeof input==='string'?input:input.url??input.toString());const path=url.pathname
  calls.push({path,method:init.method??'GET',body:init.body,headers:init.headers})
  const out=(v:any,status=200)=>Response.json(v,{status})
  if(path==='/auth/v1/user')return out({id:uid,email:'fixture@example.test',aud:'authenticated',role:'authenticated'})
  if(path.startsWith('/rest/v1/rpc/')){
   const body=JSON.parse(init.body);rpc.push({name:path.split('/').pop(),...body});return out(path.endsWith('acquire_billing_checkout')?true:'applied')
  }
  if(path==='/rest/v1/profiles'){
   const row={id:uid,stripe_customer_id:'cus_via',stripe_subscription_id:'sub_via',subscription_tier:'free'}
   return dbError?out({message:'injected failure'},500):out(new Headers(init.headers).get('accept')?.includes('vnd.pgrst.object')?row:[row])
  }
  if(path==='/rest/v1/billing_entitlements')return out(legacy?[{user_id:uid}]:[])
  if(path==='/rest/v1/billing_checkout_locks')return out([])
  if(path==='/v1/customers/cus_via')return out({id:'cus_via',metadata:{app:'viastellis',user_id:uid}})
  if(path==='/v1/subscriptions')return out(list(existing?[{id:'sub_via',status:'active',metadata:{app:'viastellis'}}]:[]))
  if(path==='/v1/subscriptions/sub_via')return out({id:'sub_via',customer:'cus_via',status:'active',current_period_end:Math.floor(Date.now()/1000)+86400,metadata:foreign?{app:'shattered-saga'}:legacy?{}:{app:'viastellis',user_id:uid},items:{data:[{price:monthly}]}})
  if(path==='/v1/invoices/in_via')return out({id:'in_via',subscription:'sub_via',customer:'cus_via',status:'paid',amount_paid:499,billing_reason:'subscription_cycle'})
  if(path==='/v1/invoices/in_via/lines')return out(list([{id:'il_1',price:monthly,quantity:1,amount:499,proration:false}],path))
  if(path==='/v1/prices/price_month')return out(monthly)
  if(path==='/v1/prices/price_pack')return out(pack)
  if(path==='/v1/prices')return out(list([monthly]))
  if(path==='/v1/checkout/sessions')return out(init.method==='POST'?{id:'cs_new',url:'https://checkout.stripe.com/c/pay/fixture'}:list([]))
  if(path==='/v1/checkout/sessions/cs_pack')return out({id:'cs_pack',mode:'payment',customer:'cus_via',client_reference_id:uid,metadata:{app:'viastellis',user_id:uid},payment_status:paid?'paid':'unpaid',amount_total:99})
  if(path==='/v1/checkout/sessions/cs_pack/line_items')return out(list([{id:'li_1',price:pack,quantity:1}],path))
  throw new Error('Unexpected fixture network request: '+path)
 }
}
async function deliver(type:string,object:any,id='evt_fixture') {
 const body=JSON.stringify({id,object:'event',type,data:{object}})
 const signature=await sdk.webhooks.generateTestHeaderStringAsync({payload:body,secret:'whsec_fixture'})
 return webhook(new Request('https://test/webhook',{method:'POST',body,headers:{'stripe-signature':signature}}))
}
Deno.test('actual billing handlers',async t=>{
 try {
  await t.step('signature rejection before DB/network',async()=>{reset();assertEquals((await webhook(new Request('https://test',{method:'POST',body:'{}'}))).status,400);assertEquals(calls.length,0)})
  await t.step('foreign events never mutate entitlements',async()=>{reset();assertEquals((await deliver('customer.subscription.deleted',{id:'sub_foreign',metadata:{app:'shattered-saga'}})).status,200);assertEquals(rpc.map(r=>r.name),['claim_stripe_event'])})
  await t.step('current-version invoice resolves parent subscription and retrieves price',async()=>{
   reset();const response=await deliver('invoice.paid',{id:'in_via',parent:{subscription_details:{subscription:'sub_via'}}});assertEquals(response.status,200)
   assertEquals(rpc.at(-1).p_credits,30);assertEquals(rpc.at(-1).p_grant_key,'stripe:invoice:in_via');assert(calls.some(c=>c.path==='/v1/prices/price_month'))
  })
  await t.step('foreign invoice subscription cannot use Via customer fallback',async()=>{reset();foreign=true;assertEquals((await deliver('invoice.paid',{id:'in_via',subscription:'sub_via'})).status,200);assertEquals(rpc.at(-1).name,'claim_stripe_event')})
  await t.step('untagged legacy exact binding survives without strict flag',async()=>{reset();legacy=true;assertEquals((await deliver('customer.subscription.updated',{id:'sub_via'})).status,200);assertEquals(rpc.at(-1).p_tier,'premium')})
  await t.step('lookup failure retries rather than permanently acknowledging',async()=>{reset();dbError=true;assertEquals((await deliver('customer.subscription.updated',{id:'sub_via'})).status,500);assertEquals(rpc.length,0)})
  await t.step('unpaid completion grants nothing; async success uses stable object key',async()=>{
   reset();paid=false;assertEquals((await deliver('checkout.session.completed',{id:'cs_pack',metadata:{app:'viastellis'}})).status,200);assertEquals(rpc.length,0)
   paid=true;assertEquals((await deliver('checkout.session.async_payment_succeeded',{id:'cs_pack',metadata:{app:'viastellis'}},'evt_async')).status,200);assertEquals(rpc.at(-1).p_credits,10);assertEquals(rpc.at(-1).p_grant_key,'stripe:checkout:cs_pack')
  })
  const start=()=>checkout(new Request('https://test',{method:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify({priceId:'vs_sub_monthly',mode:'subscription'})}))
  await t.step('checkout resolves server catalog and stamps all subscription objects',async()=>{
   reset();assertEquals((await start()).status,200)
   const call=calls.find(c=>c.path==='/v1/checkout/sessions'&&c.method==='POST'),params=new URLSearchParams(call.body)
   assertEquals(params.get('line_items[0][price]'),'price_month');assertEquals(params.get('metadata[app]'),'viastellis');assertEquals(params.get('subscription_data[metadata][app]'),'viastellis');assertEquals(params.get('payment_method_types[0]'),'card')
  })
  await t.step('existing subscription prevents a second subscription',async()=>{reset();existing=true;assertEquals((await start()).status,409);assertEquals(calls.filter(c=>c.path==='/v1/checkout/sessions'&&c.method==='POST').length,0)})
  await t.step('past-due/free user can still cancel their own subscription',async()=>{reset();assertEquals((await cancel(new Request('https://test',{method:'POST',headers:{authorization:'Bearer fixture'}}))).status,200)})
  await t.step('cancel rejects foreign subscription despite stored ID',async()=>{reset();foreign=true;assertEquals((await cancel(new Request('https://test',{method:'POST',headers:{authorization:'Bearer fixture'}}))).status,502);assertEquals(calls.filter(c=>c.path==='/v1/subscriptions/sub_via'&&c.method==='POST').length,0)})
  await t.step('RevenueCat rejects foreign product/environment and authenticates',async()=>{
   reset();assertEquals((await revenuecat(new Request('https://test',{method:'POST',body:'{}'}))).status,401)
   for(const event of [{product_id:'other:monthly',environment:'PRODUCTION'},{product_id:'credits_taster',environment:'SANDBOX'}])await revenuecat(new Request('https://test',{method:'POST',headers:{authorization:'Bearer rc_fixture'},body:JSON.stringify({event:{id:'rc',type:'INITIAL_PURCHASE',app_user_id:uid,...event}})}))
   assertEquals(calls.length,0)
  })
 }finally{globalThis.fetch=fetchOriginal}
})
