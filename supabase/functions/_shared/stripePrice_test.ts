import { assertEquals } from 'jsr:@std/assert@1'
import { priceScope, taggedPriceMetadata } from './stripePrice.ts'

Deno.test('ViaStellis prices require an explicit tag or the legacy credits fingerprint', () => {
  assertEquals(priceScope({ app: 'viastellis', credits: '30' }), 'ours')
  assertEquals(priceScope({ credits: '30' }), 'legacy-ours')
  assertEquals(priceScope({ app: 'shattered-saga', credits: '30' }), 'foreign')
  assertEquals(priceScope({}), 'foreign')
  assertEquals(priceScope(null), 'foreign')
})

Deno.test('legacy price promotion preserves credits and adds the app tag', () => {
  assertEquals(taggedPriceMetadata({ credits: '30' }), { credits: '30', app: 'viastellis' })
})
