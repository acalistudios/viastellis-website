/**
 * "Export PDF".
 *
 * Web uses the browser print dialog; Android goes through a native bridge to
 * PrintManager, because the WebView does not implement window.print(). Both
 * end at a system dialog with a "Save as PDF" destination, printing the same
 * live document, so the app's @media print rules apply either way. See
 * src/lib/nativePrint.ts.
 *
 * The button hides itself where no PDF path exists (currently iOS), rather than
 * rendering something that cannot work — which is how this feature originally
 * came to look broken on Android.
 */

import { useState } from 'react'
import { canExportPdf, exportPdf } from '@/lib/nativePrint'

export function ExportPdfButton() {
  const [error, setError] = useState('')

  if (!canExportPdf()) return null

  async function handleExport() {
    setError('')
    try {
      await exportPdf('ViaStellis Birth Chart')
    } catch (err) {
      // Do NOT swallow this. A silent failure here is precisely the bug that
      // made the button appear dead on Android in the first place.
      setError(err instanceof Error ? err.message : 'Could not open the print dialog.')
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={() => void handleExport()}
        className="text-xs text-slate-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-4 py-2 transition-colors inline-flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export PDF
      </button>
      {error && <p className="text-[11px] text-rose-400 max-w-[16rem] text-right">{error}</p>}
    </div>
  )
}
