/**
 * "Export PDF" — browser only, by design.
 *
 * This is `window.print()`, which the browser turns into a print dialog with a
 * "Save as PDF" destination. Android's WebView does not implement
 * `window.print()` at all: MainActivity is a stock Capacitor `BridgeActivity`
 * with no PrintManager bridge, so in the app the call returned silently and the
 * button appeared broken.
 *
 * Rather than ship a button that visibly does nothing, it is hidden in the
 * native shell. Share Card covers the same need there — it produces the same
 * branded artefact and hands it to the system share sheet, from which the user
 * can save it or send it on.
 *
 * If a real PDF is wanted on mobile later, it needs either a client-side
 * generator (jsPDF, ~350KB on a bundle already over 2MB) or a native print
 * plugin. Both are a deliberate build, not a tweak — which is why this is a
 * documented omission rather than a silent one.
 */

import { Capacitor } from '@capacitor/core'

export function ExportPdfButton() {
  if (Capacitor.isNativePlatform()) return null

  return (
    <button
      onClick={() => window.print()}
      className="text-xs text-slate-400 hover:text-stardust-300 border border-cosmos-700 hover:border-stardust-400/50 rounded-full px-4 py-2 transition-colors inline-flex items-center gap-1.5"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Export PDF
    </button>
  )
}
