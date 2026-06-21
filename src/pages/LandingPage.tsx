/**
 * Marketing landing page — public-facing introduction to ViaStellis.
 * Route: / (index)
 *
 * Showcases the four core offerings and the monetization model.
 */

import { Link } from 'react-router-dom'
import { Starfield } from '@/components/ui/Starfield'
import { ENTERTAINMENT_DISCLAIMER } from '@/types'

const OFFERINGS = [
  {
    emoji: '🌙',
    name: 'Transit Navigator',
    tagline: 'Your daily cosmic weather',
    description:
      'Real-time transit analysis personalized to your birth chart. Stella gives tactical daily guidance in 3 sentences — perfect for a morning briefing.',
    cta: 'Try Free',
  },
  {
    emoji: '💫',
    name: 'Stellar Synergy',
    tagline: 'How you work together',
    description:
      'Understand communication styles, collaborative strengths, and natural friction points with anyone — romantic partner, boss, friend, or yourself.',
    cta: 'Compare Charts',
  },
  {
    emoji: '🎯',
    name: 'Dilemma Decider',
    tagline: 'Make decisions with confidence',
    description:
      'Stuck on a choice? Get a clear verdict (Green Light/Caution/Reflect) based on current transits and your chart, plus detailed reasoning from Stella.',
    cta: 'Ask a Question',
  },
  {
    emoji: '✨',
    name: 'Personal Power Cycles',
    tagline: 'Find your best days',
    description:
      'A 30-day calendar showing which days are high-energy (Action) and which are low-energy (Reflection). Sync your goals with the cosmic rhythm.',
    cta: 'View Calendar',
  },
]

const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'Forever',
    features: [
      'Your personal Vedic birth chart',
      'Real-time transit data (panchanga, gochara, eclipses)',
      'Yogas & classical astrological combinations',
      'Deterministic vibe scores & verdicts',
      'Daily transit briefing (no Stella AI)',
      '30-day best-days calendar',
    ],
    cta: 'Get Started',
    ctaLink: '/auth',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$4.99/mo',
    features: [
      'Everything in Free, plus:',
      '30 monthly credits for Stella AI',
      'Daily horoscope with Stella narrative',
      'Ask Stella about any day or question',
      'Placement deep-dive readings',
      'Synergy profiles with detailed guidance',
      'Journal pattern scanning',
      'Weekly forecasts',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth',
    highlight: true,
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-100 relative overflow-hidden">
      <Starfield count={150} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#0f0817]/90 to-transparent backdrop-blur-md border-b border-stardust-400/10 px-6 py-4 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-2xl font-display text-stardust-300 flex items-center gap-2 hover:text-stellar-300 transition-colors">
            <img src="/logo.svg" alt="" className="w-8 h-8" /> ViaStellis
          </Link>
          <nav className="flex items-center gap-5 sm:gap-8 text-sm">
            {/* Secondary links: hidden on phones to avoid overflow; the hero CTAs
                and page sections still cover these on mobile. */}
            <a href="#offerings" className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium">
              Features
            </a>
            <a href="#pricing" className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium">
              Pricing
            </a>
            <Link
              to="/compatibility"
              className="hidden sm:inline text-slate-400 hover:text-stardust-300 transition-colors font-medium"
            >
              Try Demo
            </Link>
            <Link
              to="/auth"
              className="whitespace-nowrap px-4 sm:px-6 py-2 bg-gradient-to-r from-stardust-400/20 to-stellar-300/20 hover:from-stardust-400/30 hover:to-stellar-300/30 border border-stardust-400/50 text-stardust-300 rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-stardust-400/20"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-20 md:py-32 z-10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-stardust-400/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <h1 className="text-5xl md:text-6xl font-display text-stardust-300 leading-tight mb-6">
                Your Personal Guide Through the Stars
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Meet Stella, your AI astrologer. Using your Vedic birth chart, she helps you navigate daily transits, understand your relationships, make confident decisions, and sync your life with cosmic timing.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                All insights are for entertainment purposes only.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth"
                  className="px-8 py-4 bg-gradient-to-r from-stardust-400 to-stellar-300 hover:from-stardust-300 hover:to-stellar-200 text-[#0a0e27] font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-stardust-400/30 text-center"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/compatibility"
                  className="px-8 py-4 bg-[#1a1a3f]/60 hover:bg-[#1a1a3f]/80 border border-stardust-400/40 text-slate-100 font-semibold rounded-full transition-all hover:border-stardust-400/70 hover:shadow-lg hover:shadow-stardust-400/10 text-center"
                >
                  Try Vibe Match Demo
                </Link>
              </div>
            </div>

            {/* Right: Hero artwork — Stella holding the zodiac wheel */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-stardust-400/10 blur-3xl rounded-full" aria-hidden="true" />
                <img
                  src="/stella-hero.png"
                  alt="Stella, your AI astrologer, holding a glowing zodiac wheel among the stars"
                  className="relative w-full rounded-3xl border border-stardust-400/20 shadow-2xl shadow-stardust-400/10"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offerings */}
      <section id="offerings" className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1a1a3f]/30 to-transparent relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display text-center text-stardust-300 mb-16">
            Four Ways to Navigate Your Stars
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {OFFERINGS.map(offering => (
              <Link
                key={offering.name}
                to="/auth"
                className="group bg-gradient-to-br from-[#1a1a3f]/60 to-[#0f0817]/60 backdrop-blur border border-stardust-400/20 hover:border-stardust-400/50 rounded-2xl p-8 transition-all hover:shadow-lg hover:shadow-stardust-400/20"
              >
                <div className="text-5xl mb-4">{offering.emoji}</div>
                <h3 className="text-xl font-medium text-stardust-300 mb-1 group-hover:text-stardust-200 transition-colors">
                  {offering.name}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{offering.tagline}</p>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  {offering.description}
                </p>
                <button className="text-xs text-stardust-400 group-hover:text-stardust-300 font-medium transition-colors">
                  {offering.cta} →
                </button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-display text-stardust-300 mb-12">
            How ViaStellis Works
          </h2>
          <div className="space-y-8">
            <div className="flex gap-6 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-stardust-400/20 rounded-full flex items-center justify-center">
                <span className="text-stardust-300 font-display text-lg">1</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stardust-300 mb-2">
                  Tell us your birth details
                </h3>
                <p className="text-slate-400">
                  Date, time, and location. This generates your Vedic birth chart — a snapshot of the sky at your birth.
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-stardust-400/20 rounded-full flex items-center justify-center">
                <span className="text-stardust-300 font-display text-lg">2</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stardust-300 mb-2">
                  Explore your chart
                </h3>
                <p className="text-slate-400">
                  View your kundali, yogas, dasha cycles, and more. All deterministic — no AI costs.
                </p>
              </div>
            </div>
            <div className="flex gap-6 text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-stardust-400/20 rounded-full flex items-center justify-center">
                <span className="text-stardust-300 font-display text-lg">3</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stardust-300 mb-2">
                  Ask Stella anything
                </h3>
                <p className="text-slate-400">
                  When you're ready for deeper insight, Premium gives you 30 credits/month to chat with Stella.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1a1a3f]/30 to-transparent relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-display text-center text-stardust-300 mb-16">
            Simple, Transparent Pricing
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {PRICING_TIERS.map(tier => (
              <div
                key={tier.name}
                className={[
                  'rounded-2xl p-8 border backdrop-blur transition-all',
                  tier.highlight
                    ? 'bg-gradient-to-br from-stardust-400/20 to-stellar-300/10 border-stardust-400/50 ring-1 ring-stardust-400/30 md:scale-105 hover:shadow-lg hover:shadow-stardust-400/20'
                    : 'bg-gradient-to-br from-[#1a1a3f]/60 to-[#0f0817]/60 border-stardust-400/20 hover:border-stardust-400/40',
                ].join(' ')}
              >
                <h3 className="text-2xl font-display text-stardust-300 mb-2">
                  {tier.name}
                </h3>
                <p className="text-3xl font-display text-stardust-300 mb-6">
                  {tier.price}
                </p>
                <ul className="space-y-3 mb-8 text-sm text-slate-300">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-stardust-400 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={tier.ctaLink}
                  className={[
                    'block text-center px-6 py-3 rounded-full font-semibold transition-all',
                    tier.highlight
                      ? 'bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] hover:shadow-lg hover:shadow-stardust-400/30'
                      : 'bg-[#1a1a3f]/60 text-slate-100 border border-stardust-400/40 hover:border-stardust-400/70 hover:bg-[#1a1a3f]/80',
                  ].join(' ')}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-stardust-400/20 relative z-10 bg-gradient-to-t from-[#0a0e27]/40 to-transparent">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-500">
          <p className="mb-4">{ENTERTAINMENT_DISCLAIMER}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <Link to="/auth" className="hover:text-stardust-400 transition-colors">
              Sign Up
            </Link>
            <span className="text-cosmos-700">·</span>
            <Link to="/terms" className="hover:text-stardust-400 transition-colors">
              Terms
            </Link>
            <span className="text-cosmos-700">·</span>
            <Link to="/privacy" className="hover:text-stardust-400 transition-colors">
              Privacy
            </Link>
            <span className="text-cosmos-700">·</span>
            <Link to="/refund" className="hover:text-stardust-400 transition-colors">
              Refunds
            </Link>
            <span className="text-cosmos-700">·</span>
            <Link to="/contact" className="hover:text-stardust-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
