import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { viaPrice, VIA_CATALOG } from '../_shared/billingCatalog.ts'
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!,{apiVersion:'2025-02-24.acacia',httpClient:Stripe.createFetchHttpClient()})
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers})
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers})
 if(req.method!=='POST') return json({error:'Method not allowed'},405)
 const {data:{user},error:authError}=await admin.auth.getUser((req.headers.get('Authorization')??'').replace(/^Bearer /,''))
 if(authError||!user) return json({error:'Unauthorized'},401)
 let body:any
 try{body=await req.json()}catch{return json({error:'Invalid request'},400)}
 if(typeof body?.priceId!=='string'||!['payment','subscription'].includes(body.mode)) return json({error:'Invalid item'},400)
 let price:Stripe.Price
 try {
  price=Object.hasOwn(VIA_CATALOG,body.priceId)
   ? (await stripe.prices.list({lookup_keys:[body.priceId],active:true,limit:1})).data[0]
   : await stripe.prices.retrieve(body.priceId)
  const item=viaPrice(price);if((body.mode==='subscription')!==!!item.interval)throw new Error('mode')
 }
 catch{return json({error:'That plan is not available. Please refresh.'},400)}
 const token=crypto.randomUUID()
 const {data:locked,error:lockError}=await admin.rpc('acquire_billing_checkout',{p_user_id:user.id,p_token:token})
 if(lockError) return json({error:'Checkout temporarily unavailable'},503)
 if(!locked) return json({error:'Checkout is already starting. Please wait.'},409)
 try {
  const {data:profile,error}=await admin.from('profiles').select('stripe_customer_id,email').eq('id',user.id).single()
  if(error) throw error
  let customerId=profile.stripe_customer_id
  if(customerId){
   const customer=await stripe.customers.retrieve(customerId)
   if(customer.deleted || (customer.metadata.app && customer.metadata.app!=='viastellis') || (customer.metadata.user_id && customer.metadata.user_id!==user.id)) throw new Error('Stored customer ownership mismatch')
  } else {
   const customer=await stripe.customers.create({email:user.email,metadata:{app:'viastellis',user_id:user.id}},{idempotencyKey:`viastellis:customer:${user.id}`})
   customerId=customer.id
   const {error}=await admin.from('profiles').update({stripe_customer_id:customerId}).eq('id',user.id)
   if(error)throw error
  }
  let prior=false
  if(body.mode==='subscription'){
   for await(const sub of stripe.subscriptions.list({customer:customerId,status:'all',limit:100})) {
    if(sub.metadata.app && sub.metadata.app!=='viastellis') throw new Error('Shared customer requires reconciliation')
    prior=true
    if(!['canceled','incomplete_expired'].includes(sub.status)) return json({error:'You already have a subscription. Manage it in Settings.'},409)
   }
  }
  for await(const open of stripe.checkout.sessions.list({customer:customerId,status:'open',limit:100})) {
   if(open.metadata?.app==='viastellis' && open.mode===body.mode){
    const lines=await stripe.checkout.sessions.listLineItems(open.id,{limit:2})
    if(lines.data.length===1 && lines.data[0].price?.id===price.id) return json({url:open.url})
    if(body.mode==='subscription') return json({error:'Another subscription checkout is open. Complete or let it expire first.'},409)
   }
  }
  const site=Deno.env.get('SITE_URL')||'https://viastellis.com'
  const session=await stripe.checkout.sessions.create({
   mode:body.mode,payment_method_types:['card'],line_items:[{price:price.id,quantity:1}],customer:customerId,
   client_reference_id:user.id,metadata:{app:'viastellis',user_id:user.id},
   ...(body.mode==='subscription'?{subscription_data:{metadata:{app:'viastellis',user_id:user.id},...(!prior&&price.lookup_key==='vs_sub_monthly'?{trial_period_days:7}:{})}}:{payment_intent_data:{metadata:{app:'viastellis',user_id:user.id}}}),
   success_url:`${site}/home?checkout=success`,cancel_url:`${site}/upgrade?checkout=cancelled`,
   expires_at:Math.floor(Date.now()/1000)+1800,
  },{idempotencyKey:`viastellis:checkout:${user.id}:${price.id}:${Math.floor(Date.now()/300000)}`})
  return json({url:session.url})
 }catch(error){console.error('Checkout failed',error);return json({error:'Could not start checkout. Please try again.'},502)}
 finally{const {error}=await admin.from('billing_checkout_locks').delete().eq('user_id',user.id).eq('token',token);if(error)console.error('Checkout lock release failed',error)}
})
