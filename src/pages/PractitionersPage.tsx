import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Starfield } from '@/components/ui/Starfield'
import { PublicMarketingNav } from '@/components/layout/PublicMarketingNav'
import { CREDIT_COSTS, creditLabel } from '@/config/creditCosts'

const FEATURES = [
  {
    title: 'Client-ready birth charts',
    body: 'Generate polished Vedic and Western chart packets from date, time, and place, with a clean export your client can actually read.',
  },
  {
    title: 'AI prep notes for astrologers',
    body: 'Use Stella to draft structured preparation notes, placement summaries, timing themes, and questions to explore in-session.',
  },
  {
    title: 'Your interpretation stays central',
    body: 'ViaStellis supports the astrologer. It does not replace your judgment, client relationship, or professional voice.',
  },
  {
    title: 'Always powered by ViaStellis',
    body: 'Exports can be quiet and professional, but every chart includes a small “Powered by ViaStellis” marker for provenance.',
  },
]

const WORKFLOW = [
  'Enter your client’s birth details.',
  'Choose Vedic, Western, or both systems.',
  'Generate the professional birth chart packet.',
  'Add AI prep notes when you want deeper interpretive scaffolding.',
  'Export a client-ready PDF with Powered by ViaStellis included.',
]

export function PractitionersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0817] via-[#1a1a3f] to-[#0a0e27] text-slate-100 relative overflow-hidden">
      <Seo
        title="ViaStellis for Astrologers - Professional Birth Chart Prep"
        description="Professional astrology chart preparation for practitioners. Create client-ready Vedic and Western birth chart packets with AI-assisted prep notes, powered by ViaStellis."
        path="/practitioners"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'ViaStellis for Astrologers',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
        }}
      />
      <Starfield count={120} />
      <PublicMarketingNav />

      <main className="relative z-10">
        <section className="px-6 py-20 md:py-28">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <p className="text-stellar-300 uppercase tracking-[0.25em] text-xs font-semibold mb-4">
                For professional astrologers
              </p>
              <h1 className="font-display text-5xl md:text-6xl text-stardust-300 leading-tight mb-6">
                Prepare client charts faster without replacing your craft.
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-2xl">
                ViaStellis gives astrologers polished chart packets and AI-assisted prep notes, so you can spend less time formatting and more time interpreting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/practitioners/create"
                  className="px-8 py-4 bg-gradient-to-r from-stardust-400 to-stellar-300 hover:from-stardust-300 hover:to-stellar-200 text-[#0a0e27] font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-stardust-400/30 text-center"
                >
                  Start preparing charts
                </Link>
                <a
                  href="#pricing"
                  className="px-8 py-4 bg-[#1a1a3f]/60 hover:bg-[#1a1a3f]/80 border border-stardust-400/40 text-slate-100 font-semibold rounded-full transition-all hover:border-stardust-400/70 text-center"
                >
                  View practitioner pricing
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1a1a3f]/80 to-[#0f0817]/80 border border-stardust-400/25 rounded-3xl p-7 shadow-2xl shadow-stardust-400/10">
              <div className="bg-white text-[#1f172a] rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-[#ddd4ea] pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <img src="/logo.svg" alt="" className="w-10 h-10" />
                    <div>
                      <p className="font-display text-2xl text-[#241639]">ViaStellis</p>
                      <p className="text-xs text-[#6b5c81]">Professional chart packet</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#6b5c81]">viastellis.com</p>
                </div>
                <p className="text-2xl font-semibold mb-1">Client Birth Chart</p>
                <p className="text-sm text-[#6b5c81] mb-5">Vedic + Western systems | PDF export</p>
                <div className="aspect-square rounded-2xl border border-[#ddd4ea] bg-[#fbf9ff] grid place-items-center mb-5">
                  <div className="w-48 h-48 rounded-full border-2 border-[#a78bfa] grid place-items-center text-[#5f4b7d]">
                    Chart wheel
                  </div>
                </div>
                <div className="rounded-xl bg-[#f7f2ff] border border-[#dfd4ef] px-4 py-3 text-sm text-[#392651]">
                  Prep notes, timing themes, and discussion prompts for the astrologer.
                </div>
                <p className="text-center text-xs text-[#8a7b9c] mt-5">Powered by ViaStellis</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 bg-gradient-to-b from-transparent via-[#1a1a3f]/30 to-transparent">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-4xl text-stardust-300 text-center mb-12">
              Built to support practitioners
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURES.map(feature => (
                <div key={feature.title} className="bg-gradient-to-br from-[#1a1a3f]/60 to-[#0f0817]/60 border border-stardust-400/20 rounded-2xl p-5">
                  <h3 className="text-stardust-300 font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto grid md:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <h2 className="font-display text-4xl text-stardust-300 mb-4">The workflow</h2>
              <p className="text-slate-400 leading-relaxed">
                The first version is intentionally focused: generate a professional chart packet and optional AI preparation notes for one client at a time.
              </p>
            </div>
            <ol className="space-y-4">
              {WORKFLOW.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-stardust-400/20 text-stardust-300 grid place-items-center font-semibold flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-slate-300 pt-1">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1a1a3f]/30 to-transparent">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-4xl text-stardust-300 text-center mb-4">
              Practitioner pricing
            </h2>
              <p className="text-slate-400 text-center max-w-2xl mx-auto mb-12">
              Free deterministic tools stay accessible. Full client-ready birth chart packets use credits because they replace labor-intensive preparation work.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl p-8 border border-stardust-400/20 bg-gradient-to-br from-[#1a1a3f]/60 to-[#0f0817]/60">
                <h3 className="font-display text-2xl text-stardust-300 mb-2">Standard Client Chart</h3>
                <p className="text-4xl font-display text-stardust-300 mb-6">
                  {creditLabel(CREDIT_COSTS.client_birth_chart)}
                </p>
                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  <li>Full professional birth chart packet</li>
                  <li>Vedic and Western chart data</li>
                  <li>Printable/exportable PDF</li>
                  <li>Powered by ViaStellis marker included</li>
                </ul>
                <Link to="/practitioners/create" className="block text-center px-6 py-3 rounded-full font-semibold bg-[#1a1a3f]/60 text-slate-100 border border-stardust-400/40 hover:border-stardust-400/70">
                  Create a chart
                </Link>
              </div>

              <div className="rounded-2xl p-8 border border-stardust-400/50 ring-1 ring-stardust-400/30 bg-gradient-to-br from-stardust-400/20 to-stellar-300/10">
                <p className="text-xs uppercase tracking-[0.25em] text-stellar-300 mb-3 font-semibold">Recommended</p>
                <h3 className="font-display text-2xl text-stardust-300 mb-2">Premium Astrologer Discount</h3>
                <p className="text-4xl font-display text-stardust-300 mb-6">
                  {creditLabel(CREDIT_COSTS.client_birth_chart_premium)}
                </p>
                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  <li>10% lower credit cost for client birth chart packets</li>
                  <li>Free deterministic chart tools</li>
                  <li>AI-assisted prep notes for client sessions</li>
                  <li>Powered by ViaStellis marker always included</li>
                </ul>
                <Link to="/practitioners/create" className="block text-center px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] hover:shadow-lg hover:shadow-stardust-400/30">
                  Create a discounted chart
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
