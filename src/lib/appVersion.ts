/**
 * The version string shown in Settings. Never hand-typed: it used to be a
 * literal "v0.1.0" that drifted from every real release.
 *
 *  - Android/iOS app: the installed package's own versionName (versionCode),
 *    from @capacitor/app — always exactly what Play / the App Store installed.
 *  - Web: the git commit the deploy was built from (__APP_BUILD__, injected by
 *    vite.config.ts), since the website has no release numbers of its own.
 */
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

export async function getAppVersionLabel(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo()
      return `v${info.version} (${info.build})`
    } catch {
      /* fall through to the web build id */
    }
  }
  return `web · ${__APP_BUILD__}`
}
