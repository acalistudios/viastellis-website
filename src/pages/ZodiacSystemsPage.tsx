/**
 * ZodiacSystemsPage — public explainer: Western (tropical) vs Vedic (sidereal),
 * why your signs differ, the trade-offs of each, and the mean vs. true node
 * choice. Linked from Settings and the Western chart view. Pure content.
 */

import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'

export function ZodiacSystemsPage() {
  return (
    <div className="min-h-screen bg-cosmos-950 text-slate-300">
      <Seo
        title="Vedic vs Western Astrology: What's the Difference?"
        description="Sidereal vs tropical zodiac, why your Vedic and Western signs differ, nakshatras, houses, and which system to read. A clear, side-by-side explainer."
        path="/zodiac-systems"
        type="article"
      />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/chart" className="text-stardust-400 hover:text-stardust-300 text-sm">
          ← Back
        </Link>
        <h1 className="font-display text-4xl text-stardust-300 mt-6 mb-1">
          Western vs. Vedic — why your signs differ
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          The short version: it all comes down to where you place 0° Aries.
        </p>

        <div className="space-y-5 text-sm leading-relaxed [&_h2]:text-slate-100 [&_h2]:font-display [&_h2]:text-xl [&_h2]:mt-9 [&_h2]:mb-2 [&_a]:text-stardust-400 [&_a]:underline">

          <h2>One sky, two zodiacs</h2>
          <p>
            Both systems divide the sky into twelve 30° signs. They disagree on one thing: the
            anchor point.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 marker:text-stardust-400">
            <li>
              <strong className="text-slate-100">Western (tropical)</strong> anchors 0° Aries to the{' '}
              <strong className="text-slate-100">spring equinox</strong> — the Sun's position around
              March 21st. It follows the seasons.
            </li>
            <li>
              <strong className="text-slate-100">Vedic (sidereal)</strong> anchors the zodiac to the{' '}
              <strong className="text-slate-100">actual fixed stars</strong>. It follows the
              constellations.
            </li>
          </ul>

          <h2>The ~24° gap (the ayanamsa)</h2>
          <p>
            The equinox isn't fixed — it slowly drifts backward against the stars, a motion called{' '}
            <em>precession</em> (one full circle every ~25,800 years). Over the last ~1,700 years the
            two zodiacs have drifted about <strong className="text-slate-100">24°</strong> apart. That
            gap is called the <strong className="text-slate-100">ayanamsa</strong>, and it's exactly
            what ViaStellis subtracts to convert a tropical position into a sidereal one.
          </p>
          <p>
            Practically: because 24° is most of a whole sign, a great many people land in a{' '}
            <em>different</em> Sun sign in Vedic. A late-Aries Sun in Western becomes a Pisces Sun in
            Vedic. You haven't changed — the two traditions are simply measuring from different
            starting lines.
          </p>

          <h2>What each system is good at</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse mt-1">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium"></th>
                  <th className="py-2 pr-4 font-medium">Western (tropical)</th>
                  <th className="py-2 font-medium">Vedic (sidereal)</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_tr]:border-t [&_tr]:border-cosmos-800">
                <tr>
                  <td className="text-slate-500">Zodiac anchor</td>
                  <td>The seasons (equinox)</td>
                  <td>The fixed stars</td>
                </tr>
                <tr>
                  <td className="text-slate-500">Emphasis</td>
                  <td>Sun sign; psychological / personality</td>
                  <td>Moon sign + nakshatra; timing & prediction</td>
                </tr>
                <tr>
                  <td className="text-slate-500">Houses</td>
                  <td>Usually Placidus (unequal)</td>
                  <td>Whole Sign (one sign = one house)</td>
                </tr>
                <tr>
                  <td className="text-slate-500">Planets</td>
                  <td>Adds Uranus, Neptune, Pluto</td>
                  <td>Seven visible grahas + Rahu/Ketu</td>
                </tr>
                <tr>
                  <td className="text-slate-500">Timing tools</td>
                  <td>Transits, progressions</td>
                  <td>Dashas, gochara — planetary periods</td>
                </tr>
                <tr>
                  <td className="text-slate-500">Where it's rooted</td>
                  <td>Europe & the Americas; modern pop astrology</td>
                  <td>The Indian subcontinent; Jyotish tradition</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>Why ViaStellis centers Vedic</h2>
          <p>
            We default to Vedic because its toolkit is built for the questions people actually bring
            to astrology — <em>when</em>, not just <em>what</em>. The dasha system (planetary periods),
            gochara (transit timing), and the 27 nakshatras give a level of timing precision the
            tropical system doesn't natively carry. The sidereal zodiac also stays aligned with the
            constellations you can actually see.
          </p>
          <p>
            That isn't a claim that Western is "wrong." It's an elegant, internally consistent system
            with deep psychological insight, and for many people the tropical Sun sign simply{' '}
            <em>feels</em> like them. That's why we offer it in full — Placidus houses, the outer
            planets, and a complete aspect grid. You can switch anytime in{' '}
            <Link to="/settings">Settings</Link>.
          </p>

          <h2>A note on Rahu &amp; Ketu (the lunar nodes)</h2>
          <p>
            The Moon's orbit crosses the Sun's path at two points — the nodes. In Vedic astrology
            these are <strong className="text-slate-100">Rahu</strong> (north) and{' '}
            <strong className="text-slate-100">Ketu</strong> (south), the karmic axis.
          </p>
          <p>
            There are two ways to measure them. The <strong className="text-slate-100">mean node</strong>{' '}
            follows a smooth average path; the <strong className="text-slate-100">true node</strong>{' '}
            tracks the Moon's actual wobble and can sit up to ~1.5° away. ViaStellis uses the{' '}
            <strong className="text-slate-100">mean node</strong>, the traditional choice in classical
            Vedic work. It's why our nodes can occasionally differ by a degree or so from tools that
            use the true node — both are valid, they're just measuring the same thing two ways.
          </p>

          <h2>So which is "really" your sign?</h2>
          <p>
            Both are. They're two coordinate systems describing the same sky. Western tells you where
            the Sun sat relative to the <em>seasons</em> when you were born; Vedic tells you where it
            sat relative to the <em>stars</em>. Read whichever speaks to you — or read both.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/chart"
              className="rounded-full px-5 py-2 bg-gradient-to-r from-stardust-400 to-stellar-300 text-cosmos-950 text-sm font-semibold no-underline"
            >
              View your chart
            </Link>
            <Link
              to="/settings"
              className="rounded-full px-5 py-2 border border-cosmos-700 text-slate-300 text-sm no-underline hover:border-cosmos-600"
            >
              Switch system in Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
