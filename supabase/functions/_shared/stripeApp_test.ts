import { assertEquals } from 'jsr:@std/assert@1'
import { APP_TAG, asUuid, isExplicitlyForeign } from './stripeApp.ts'

Deno.test('Stripe app tags are isolated', () => {
  assertEquals(APP_TAG, 'viastellis')
  assertEquals(isExplicitlyForeign({ app: 'shattered-saga' }), true)
  assertEquals(isExplicitlyForeign({ app: 'viastellis' }), false)
  assertEquals(isExplicitlyForeign({}), false)
})

Deno.test('foreign user identifiers cannot reach UUID RPC arguments', () => {
  assertEquals(asUuid('not-a-uuid'), null)
  assertEquals(asUuid('5b1a7d34-9d4c-4f8b-a63e-a7d3d0e4202d'), '5b1a7d34-9d4c-4f8b-a63e-a7d3d0e4202d')
})
