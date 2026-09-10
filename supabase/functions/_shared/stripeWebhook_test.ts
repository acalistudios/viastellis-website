import { assertEquals } from 'jsr:@std/assert@1'
import { creditsFromLineItems, subscriptionIdFromInvoice } from './stripeWebhook.ts'

Deno.test('credit calculation accepts only safe Stripe metadata integers', () => {
  assertEquals(creditsFromLineItems([
    { price: { metadata: { credits: '30' } }, quantity: 2 },
    { price: { metadata: { credits: 'not-a-number' } }, quantity: 1 },
    { price: { metadata: { credits: '-5' } }, quantity: 1 },
  ]), 60)
})

Deno.test('invoice subscription id supports legacy and current webhook shapes', () => {
  assertEquals(subscriptionIdFromInvoice({ subscription: 'sub_legacy' }), 'sub_legacy')
  assertEquals(subscriptionIdFromInvoice({ parent: { subscription_details: { subscription: { id: 'sub_current' } } } }), 'sub_current')
  assertEquals(subscriptionIdFromInvoice({}), null)
})
