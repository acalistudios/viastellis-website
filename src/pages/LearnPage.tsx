/**
 * LearnPage — the concept hub index. `/learn`
 * Lists the concept articles (from data/concepts.ts). Each links to its own
 * SEO'd page. This is the top of the content cluster.
 */

import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { CONCEPTS } from '@/data/concepts'

export function LearnPage() {
  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-300">
      <Seo
        title="Learn Astrology: Vedic & Western Concepts Explained"
        description="Clear, beginner-friendly guides to key astrology concepts — nakshatras, dashas, kundli matching, and how the Vedic and Western systems differ."
        path="/learn"
      />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="text-stardust-400 hover:text-stardust-300 text-sm">← ViaStellis</Link>

        <h1 className="font-display text-4xl text-stardust-200 mt-6 mb-2">Learn astrology</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xl leading-relaxed">
          Plain-language guides to the ideas behind your chart — with a focus on the Vedic concepts
          most sites skip. New guides are added regularly.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {CONCEPTS.map(c => (
            <Link key={c.slug} to={`/learn/${c.slug}`}
              className="block bg-cosmos-900 border border-cosmos-700 rounded-2xl p-5 hover:border-stardust-400/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{c.emoji}</span>
                <span className="text-[10px] uppercase tracking-wider text-stellar-300 border border-stellar-300/40 rounded-full px-2 py-0.5">
                  {c.tradition}
                </span>
              </div>
              <p className="text-slate-100 font-display text-lg leading-snug">{c.title}</p>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{c.teaser}</p>
              <span className="inline-block mt-3 text-stardust-300 text-xs">Read →</span>
            </Link>
          ))}
        </div>

        {/* Cross-link the tool + the explainer */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/horoscopes"
            className="rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold px-5 py-2.5">
            Read today's free horoscopes →
          </Link>
          <Link to="/zodiac-systems"
            className="rounded-full border border-cosmos-700 text-slate-300 hover:border-stardust-400/50 text-sm px-5 py-2.5">
            Vedic vs Western explained
          </Link>
        </div>
      </div>
    </div>
  )
}
