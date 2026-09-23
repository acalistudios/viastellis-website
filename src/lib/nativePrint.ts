/**
 * "Export PDF" across web and the native shell.
 *
 * On the web this is `window.print()`, which the browser turns into a print
 * dialog whose destination list always includes "Save as PDF".
 *
 * Android's WebView does not implement `window.print()`, so the app needs a
 * bridge. `NativePrintPlugin` (Java, in the viastellis-android repo) hands the
 * live WebView to Android's PrintManager, which shows the system print dialog —
 * and Android has included a built-in "Save as PDF" destination on every device
 * since 4.4, so no printer is involved. Because it prints the live document,
 * the app's existing `@media print` rules apply unchanged and the PDF matches
 * what the website produces.
 *
 * The plugin is registered natively rather than shipped as an npm package, so
 * there is no JS implementation to fall back on: calling it anywhere other than
 * Android rejects with "not implemented". `canExportPdf()` is what keeps the
 * button off those platforms.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

interface NativePrintPlugin {
  /**
   * Opens the system print dialog. Resolving means the dialog was handed off,
   * NOT that a PDF was written — Android reports nothing about what the user
   * then chose, so callers must not claim the export succeeded.
   */
  print(options?: { name?: string }): Promise<void>
}

const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint')

/**
 * Whether this platform can export a PDF at all.
 *
 * Web: yes, via the browser print dialog.
 * Android: yes, via the native bridge.
 * iOS: NO — the Swift half does not exist yet. It would be a
 *   UIPrintInteractionController wrapper around the WKWebView's
 *   viewPrintFormatter(). Until that lands, the button stays hidden there
 *   rather than shown and broken, which is the exact failure this whole change
 *   set was fixing.
 */
export function canExportPdf(): boolean {
  return !Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android'
}

export async function exportPdf(documentName = 'ViaStellis'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await NativePrint.print({ name: documentName })
    return
  }
  window.print()
}
