import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { asUuid } from '../_shared/stripeApp.ts'
import { viaPrice, stripeId, invoiceSubscription } from '../_shared/billingCatalog.ts'
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-02-24.acacia', httpClient: Stripe.createFetchHttpClient() })
const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const reply = (body: unknown,status=200) => Response.json(body,{status})
async function skip(event: Stripe.Event,reason:string) {
 const {error} = await admin.rpc('claim_stripe_event',{p_event_id:event.id,p_event_type:event.type,p_app:null,p_user_id:null,p_outcome:reason==='foreign'?'foreign':'unmapped'})
 if(error) throw error
 return reply({received:true,ignored:reason})
}
async function owner(sub:any,customerId:string|null) {
 // Untagged legacy objects require an exact subscription binding.
 if(sub.metadata?.app && sub.metadata.app!=='viastellis') return null
 const {data: entitlement,error: e1}=await admin.from('billing_entitlements').select('user_id').eq('provider','stripe').eq('external_id',sub.id).maybeSingle()
 if(e1) throw e1
 let userId=entitlement?.user_id
 if(!userId) {
  const {data,error}=await admin.from('profiles').select('id').eq('stripe_subscription_id',sub.id).maybeSingle()
  if(error) throw error
  userId=data?.id
 }
 if(!userId && sub.metadata?.app==='viastellis') userId=asUuid(sub.metadata?.user_id)
 if(!userId) return null
 if(sub.metadata?.user_id && sub.metadata.user_id!==userId) throw new Error('Subscription user metadata conflict')
 const {data:profile,error}=await admin.from('profiles').select('id,stripe_customer_id').eq('id',userId).maybeSingle()
 if(error) throw error
 if(!profile) return null
 if(profile.stripe_customer_id!==customerId) throw new Error('Subscription/customer ownership mismatch')
 return userId
}
Deno.serve(async(req)=>{
 if(req.method!=='POST') return reply({error:'method'},405)
 const signature=req.headers.get('stripe-signature')
 if(!signature) return reply({error:'signature'},400)
 let event:Stripe.Event
 try {event=await stripe.webhooks.constructEventAsync(await req.text(),signature,Deno.env.get('STRIPE_WEBHOOK_SECRET')!)}
 catch {return reply({error:'signature'},400)}
 try {
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) return reply({received:true,ignored:'unsupported'})
  const object:any=event.data.object
  if(object.metadata?.app && object.metadata.app!=='viastellis') return await skip(event,'foreign')
  let subId:string|null=null, userId:string|null=null, customerId:string|null=null
  let credits=0, grantKey:string|null=null, amount:number|null=null, source='subscription'
  let sub:any=null
  const observedAt=Date.now()
  if(event.type.startsWith('checkout.session.')) {
   if(object.metadata?.app!=='viastellis') return await skip(event,'foreign')
   const session=await stripe.checkout.sessions.retrieve(object.id)
   if(session.metadata?.app!=='viastellis') return await skip(event,'foreign')
   if(session.payment_status!=='paid' && session.payment_status!=='no_payment_required') return reply({received:true,ignored:'awaiting_payment'})
   userId=asUuid(session.metadata?.user_id)
   if(!userId || (session.client_reference_id && session.client_reference_id!==userId)) return await skip(event,'unmapped')
   customerId=stripeId(session.customer)
   const {data:profile,error}=await admin.from('profiles').select('stripe_customer_id').eq('id',userId).maybeSingle()
   if(error) throw error
   if(!profile) return await skip(event,'unmapped')
   if(profile.stripe_customer_id!==customerId) throw new Error('Checkout ownership mismatch')
   if(session.mode==='payment') {
    source='pack'; grantKey=`stripe:checkout:${session.id}`; amount=session.amount_total
    for await(const line of stripe.checkout.sessions.listLineItems(session.id,{limit:100})) {
      if(!line.price) throw new Error('Missing checkout price')
      const item=viaPrice(await stripe.prices.retrieve(line.price.id),false)
      if(item.interval!==null || !Number.isSafeInteger(line.quantity) || (line.quantity??0)<1) throw new Error('Invalid pack line')
      credits+=item.credits*line.quantity!
    }
    if(credits<=0) throw new Error('Empty purchase')
   } else if(session.mode==='subscription') {
    subId=stripeId(session.subscription)
    if(!subId) throw new Error('Subscription checkout missing subscription')
   }
   else return await skip(event,'unsupported_mode')
  } else if(event.type==='invoice.paid') {
   subId=invoiceSubscription(object)
   if(!subId) return await skip(event,'unmapped')
  } else subId=object.id
  if(subId) {
   sub=await stripe.subscriptions.retrieve(subId)
   customerId=stripeId(sub.customer)
   const resolved=await owner(sub,customerId)
   if(!resolved) return await skip(event,sub.metadata?.app==='viastellis'?'unmapped':'foreign')
   if(userId && userId!==resolved) throw new Error('Conflicting user identity')
   userId=resolved
   if(sub.items.data.length!==1 || !viaPrice(sub.items.data[0].price,false).interval) throw new Error('Invalid subscription catalog')
  }
  if(event.type==='invoice.paid') {
   const invoice=await stripe.invoices.retrieve(object.id)
   if(invoice.status!=='paid' || stripeId(invoice.customer)!==customerId || invoiceSubscription(invoice)!==subId) throw new Error('Invoice ownership/status mismatch')
   grantKey=`stripe:invoice:${invoice.id}`; amount=invoice.amount_paid
   // Retrieve Prices explicitly, using our pinned API for every event version.
   if(['subscription_create','subscription_cycle'].includes(invoice.billing_reason??'')) {
    for await(const line of stripe.invoices.listLineItems(invoice.id,{limit:100})) {
     if(line.proration || (line.amount??0)<=0) continue
     if(!line.price) throw new Error('Missing invoice Price')
     const item=viaPrice(await stripe.prices.retrieve(line.price.id),false)
     if(!item.interval) throw new Error('Unexpected one-time invoice item')
     if(!Number.isSafeInteger(line.quantity??1)||(line.quantity??1)<1) throw new Error('Invalid invoice quantity')
     credits+=item.credits*(line.quantity??1)
    }
   }
  }
  if(!userId) return await skip(event,'unmapped')
  const period=sub?.current_period_end ?? sub?.items.data[0]?.current_period_end
  const {data,error}=await admin.rpc('apply_billing_event',{
   p_event_id:event.id,p_event_type:event.type,p_provider:'stripe',p_user_id:userId,
   p_external_id:subId,p_tier:sub?(['active','trialing'].includes(sub.status)?'premium':'free'):null,
   p_status:sub?.status??null,p_period_end:period?new Date(period*1000).toISOString():null,
   p_price_id:sub?.items.data[0]?.price.id??null,p_observed_at:observedAt,
   p_credits:credits,p_grant_key:grantKey,p_credit_source:source,p_amount_cents:amount,p_customer_id:customerId,
  })
  if(error) throw error
  return reply({received:true,outcome:data})
 } catch(error) {console.error('Stripe fulfillment failed',event.id,error);return reply({error:'processing_failed'},500)}
})
