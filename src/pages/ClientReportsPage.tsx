import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { MarkdownText } from '@/components/ui/MarkdownText'
import { Seo } from '@/components/Seo'
import { CREDIT_COSTS, creditLabel } from '@/config/creditCosts'
import {
  buildClientReportContext,
  deleteClientReport,
  finalizeClientReport,
  listClientReports,
  type ClientReportRecord,
} from '@/lib/clientReports'
import { useUser } from '@/store/UserContext'

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function notesHtml(notes: string) {
  return escapeHtml(notes)
    .split(/\n{2,}/)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function printClientReport(report: ClientReportRecord) {
  const notes = report.prep_notes
  if (!notes) return

  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return

  const details = `${report.birth_data.date} | ${report.birth_data.time_unknown ? 'Time unknown' : report.birth_data.time} | ${report.birth_data.city}, ${report.birth_data.country}`
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(report.title)} - ViaStellis</title>
        <style>
          @page { margin: 0.55in; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #fff;
            color: #20172d;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.55;
          }
          .header {
            border-bottom: 1px solid #ddd4ea;
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 18px;
            margin-bottom: 28px;
          }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand img { width: 42px; height: 42px; }
          .brand-name {
            color: #241639;
            font-family: Georgia, serif;
            font-size: 28px;
            font-weight: 700;
          }
          .url { color: #6b5c81; font-size: 13px; font-weight: 700; text-align: right; }
          h1 {
            margin: 0 0 6px;
            color: #241639;
            font-family: Georgia, serif;
            font-size: 34px;
            line-height: 1.15;
          }
          .details { color: #6b5c81; font-size: 14px; margin-bottom: 28px; }
          .meta {
            background: #fbf9ff;
            border: 1px solid #e8e1f4;
            border-radius: 14px;
            color: #5f4b7d;
            display: grid;
            gap: 4px;
            grid-template-columns: repeat(3, 1fr);
            margin-bottom: 28px;
            padding: 14px 16px;
            font-size: 12px;
          }
          .meta strong { color: #392651; display: block; font-size: 13px; }
          .notes p { margin: 0 0 14px; }
          .footer {
            border-top: 1px solid #ddd4ea;
            color: #8a7b9c;
            font-size: 11px;
            margin-top: 34px;
            padding-top: 14px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="brand">
            <img src="/logo.svg" alt="">
            <div>
              <div class="brand-name">ViaStellis</div>
              <div class="details">Professional astrologer client report</div>
            </div>
          </div>
          <div class="url">viastellis.com<br>Powered by ViaStellis</div>
        </header>
        <main>
          <h1>${escapeHtml(report.title)}</h1>
          <div class="details">${escapeHtml(details)}</div>
          <section class="meta">
            <div><strong>Status</strong>Final</div>
            <div><strong>Generated</strong>${escapeHtml(report.generated_at ? formatCreatedAt(report.generated_at) : formatCreatedAt(report.updated_at))}</div>
            <div><strong>Systems</strong>Vedic + Western</div>
          </section>
          <section class="notes">${notesHtml(notes)}</section>
        </main>
        <footer class="footer">
          Powered by ViaStellis | viastellis.com | For entertainment and self-reflection only.
        </footer>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

export function ClientReportsPage() {
  const { profile } = useUser()
  const [reports, setReports] = useState<ClientReportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const isPremium = profile?.subscription_tier === 'premium'
  const reportCost = isPremium ? CREDIT_COSTS.client_birth_chart_premium : CREDIT_COSTS.client_birth_chart
  const standardCost = CREDIT_COSTS.client_birth_chart

  useEffect(() => {
    let cancelled = false
    async function loadReports() {
      setLoading(true)
      setError('')
      try {
        const rows = await listClientReports()
        if (!cancelled) setReports(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load client reports.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadReports()
    return () => { cancelled = true }
  }, [])

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [reports],
  )

  async function handleDelete(reportId: string) {
    setError('')
    setBusyId(reportId)
    try {
      await deleteClientReport(reportId)
      setReports(prev => prev.filter(report => report.id !== reportId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this report.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleFinalize(report: ClientReportRecord) {
    setError('')
    setBusyId(report.id)
    try {
      const result = await finalizeClientReport({
        reportId: report.id,
        context: buildClientReportContext(report.birth_data),
      })
      setReports(prev => prev.map(item => item.id === report.id ? result.report : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate this report.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <Seo
        title="Client Reports - ViaStellis"
        description="Create and manage saved astrologer client report drafts in ViaStellis."
        path="/client-reports"
        noindex
      />

      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-stellar-300 font-semibold mb-3">
            Astrologer tools
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-stardust-300 mb-3">
            Client Reports
          </h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Save client birth chart drafts, return to client details, and prepare professional chart packets with the required Powered by ViaStellis marker.
          </p>
        </div>
        <Link
          to="/practitioners/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-[#0a0e27] font-semibold hover:shadow-lg hover:shadow-stardust-400/30"
        >
          <Plus size={18} />
          New Client Report
        </Link>
      </header>

      <section className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="rounded-3xl border border-stardust-400/20 bg-cosmos-900/70 p-5 md:p-6">
          {loading ? (
            <div className="min-h-[320px] grid place-items-center text-center text-slate-500">
              Loading client reports...
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="min-h-[320px] grid place-items-center text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-stardust-400/10 border border-stardust-400/20 grid place-items-center text-stardust-300">
                  <FileText size={26} />
                </div>
                <h2 className="font-display text-3xl text-stardust-300 mb-3">No client reports yet</h2>
                <p className="text-slate-500 mb-6">
                  Create a report draft from a client's birth details, then save it here for follow-up.
                </p>
                <Link
                  to="/practitioners/create"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-stardust-400/40 text-slate-100 hover:border-stardust-400/70"
                >
                  <Plus size={18} />
                  Create first report
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedReports.map(report => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-cosmos-700 bg-cosmos-800/45 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div>
                    <h2 className="font-display text-2xl text-stardust-300">{report.title}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {report.birth_data.date} | {report.birth_data.time_unknown ? 'Time unknown' : report.birth_data.time} | {report.birth_data.city}, {report.birth_data.country}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      {report.status === 'final'
                        ? `Finalized ${report.generated_at ? formatCreatedAt(report.generated_at) : formatCreatedAt(report.updated_at)} | ${creditLabel(report.credits_debited)} debited`
                        : `Saved ${formatCreatedAt(report.created_at)} | Vedic + Western draft`}
                    </p>
                    {report.prep_notes && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-stardust-300">View prep notes</summary>
                        <MarkdownText text={report.prep_notes} className="text-sm text-slate-300 mt-3 max-w-3xl" />
                      </details>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {report.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => void handleFinalize(report)}
                        disabled={busyId === report.id}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-stardust-400 to-stellar-300 text-sm font-semibold text-[#0a0e27] disabled:opacity-60"
                      >
                        {busyId === report.id ? 'Generating...' : `Generate | ${creditLabel(reportCost)}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => printClientReport(report)}
                        className="px-4 py-2 rounded-full border border-stardust-400/35 text-sm text-slate-200 hover:border-stardust-400/70"
                      >
                        Print
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(report.id)}
                      disabled={busyId === report.id}
                      className="p-2.5 rounded-full border border-cosmos-700 text-slate-500 hover:text-rose-300 hover:border-rose-400/40"
                      aria-label={`Delete ${report.title}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {error && (
            <p className="text-sm text-rose-300 mt-5">
              {error}{' '}
              {error.includes('credit') && <Link to="/upgrade" className="underline">Get credits</Link>}
            </p>
          )}
        </div>

        <aside className="rounded-3xl border border-stardust-400/20 bg-cosmos-900/70 p-6">
          <h2 className="font-display text-2xl text-stardust-300 mb-4">Credit pricing</h2>
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl bg-cosmos-800/50 border border-cosmos-700 p-4">
              <p className="text-slate-500 mb-1">Your client report cost</p>
              <p className="text-2xl font-semibold text-stellar-300">{creditLabel(reportCost)}</p>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Standard client birth charts cost {creditLabel(standardCost)}. Premium members receive a 10% discount, bringing the cost to {creditLabel(CREDIT_COSTS.client_birth_chart_premium)}.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Drafts are free. Credits are debited only when you generate the final client prep packet.
            </p>
          </div>
        </aside>
      </section>
    </div>
  )
}
