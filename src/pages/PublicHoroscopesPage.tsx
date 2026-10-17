/**
 * PublicHoroscopesPage — a public, no-signup "Today's Horoscopes" demo.
 * All 12 signs, with a Western (Sun) ↔ Vedic (Moon) toggle, for the visitor's
 * local date. Doubles as a marketing/SEO front door; the real demo, vs. the old
 * "demo" button that just bounced people to login.
 */

import { Link } from 'react-router-dom'
import { Starfield } from '@/components/ui/Starfield'
import { Seo } from '@/components/Seo'
import { PublicMarketingNav } from '@/components/layout/PublicMarketingNav'
import { AllSignsHoroscopes } from '@/components/horoscopes/AllSignsHoroscopes'
import { trackEvent } from '@/lib/analytics'

export function PublicHoroscopesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-200 relative overflow-hidden">
      <Seo
        title="Today's Horoscopes — All 12 Signs (Vedic & Western)"
        description="Free daily horoscopes for every zodiac sign, in both Vedic (Moon-sign) and Western (Sun-sign) astrology. No sign-up required — read today's reading for your sign."
        path="/horoscopes"
      />
      <Starfield count={90} />

      <PublicMarketingNav />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <AllSignsHoroscopes />

        {/* CTA */}
        <div className="text-center mt-12 bg-[#1a1a3f]/40 border border-stardust-400/15 rounded-2xl px-6 py-8">
          <h2 className="font-display text-2xl text-stardust-300">Want your full chart?</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            These are general sign readings. Create a free account to generate your full Vedic
            and Western birth chart from your exact birth date, time, and place, then get daily
            readings, transits, compatibility, and Stella.
          </p>
          <Link
            to="/auth?mode=signup"
            onClick={() => trackEvent('signup_cta_click', { source_page: 'public_horoscopes' })}
            className="inline-block mt-5 rounded-full px-6 py-3 bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] text-sm font-semibold"
          >
            Get my full chart free →
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          For reflection and entertainment only.
        </p>
      </div>
    </div>
  )
}
