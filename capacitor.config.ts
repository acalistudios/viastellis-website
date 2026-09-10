import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

// NOTE: the Capacitor CLI transpiles this file to CommonJS and require()s it,
// even though package.json declares "type": "module". That means ESM-only
// syntax such as import.meta.url cannot be used here — it fails with
// "exports is not defined in ES module scope". process.cwd() is the portable
// equivalent, and is correct because cap commands run from the project root
// where this config lives.
const here = process.cwd()

/**
 * Locate the native Android project.
 *
 * The native project deliberately lives OUTSIDE this repo, at
 * C:\Users\hansi\AndroidStudioProjects\ViaStellis, matching SpamStop and
 * retroTAP — so 18MB release bundles and native build output never land in the
 * public web repo.
 *
 * That location is machine-specific, so it must not be hard-coded here: this
 * file is committed to the PUBLIC repository, and an absolute Windows path
 * both leaks a local directory layout and breaks on any other machine.
 *
 * Resolution order:
 *   1. CAP_ANDROID_PATH environment variable
 *   2. capacitor.local.json next to this file (gitignored):
 *        { "androidPath": "C:/Users/hansi/AndroidStudioProjects/ViaStellis" }
 *      A relative value is resolved against this directory.
 *
 * If neither is set we THROW rather than fall back to Capacitor's default of
 * ./android. That default is what originally created `website/android` and put
 * native build output inside the web repo; failing loudly is much better than
 * silently recreating it.
 *
 * Only the Capacitor CLI loads this file — `npm run build` and the GitHub
 * Pages deploy never read it, so the throw cannot break a web deploy.
 */
function resolveAndroidPath(): string {
  const fromEnv = process.env.CAP_ANDROID_PATH?.trim()
  if (fromEnv) return fromEnv

  const localFile = resolve(here, 'capacitor.local.json')
  if (existsSync(localFile)) {
    try {
      const parsed = JSON.parse(readFileSync(localFile, 'utf8')) as { androidPath?: string }
      const p = parsed.androidPath?.trim()
      if (p) return isAbsolute(p) ? p : resolve(here, p)
    } catch (err) {
      throw new Error(
        `capacitor.local.json exists but could not be read as JSON: ${(err as Error).message}`,
      )
    }
  }

  throw new Error(
    'Android project path is not configured.\n' +
      'The native project lives outside this repo, so its location must be set locally.\n\n' +
      'Create website/capacitor.local.json (gitignored) containing:\n' +
      '  { "androidPath": "C:/Users/hansi/AndroidStudioProjects/ViaStellis" }\n\n' +
      'or set the CAP_ANDROID_PATH environment variable before running cap commands.',
  )
}

const config: CapacitorConfig = {
  appId: 'com.acalistudios.viastellis',
  appName: 'ViaStellis',
  webDir: 'dist',
  android: {
    path: resolveAndroidPath(),
  },
}

export default config
