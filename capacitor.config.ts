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
 * Locate a native project (Android or iOS).
 *
 * The native projects deliberately live OUTSIDE this repo — Android at
 * C:\Users\hansi\AndroidStudioProjects\ViaStellis, iOS at
 * ~/Developer/viastellis-ios — matching SpamStop and retroTAP, so 18MB release
 * bundles and native build output never land in the public web repo.
 *
 * That location is machine-specific, so it must not be hard-coded here: this
 * file is committed to the PUBLIC repository, and an absolute Windows path
 * both leaks a local directory layout and breaks on any other machine.
 *
 * Resolution order (per platform):
 *   1. CAP_ANDROID_PATH / CAP_IOS_PATH environment variable
 *   2. capacitor.local.json next to this file (gitignored):
 *        { "androidPath": "C:/Users/hansi/AndroidStudioProjects/ViaStellis",
 *          "iosPath": "/Users/hansisern/Developer/viastellis-ios" }
 *      A relative value is resolved against this directory.
 *
 * If neither is set we THROW rather than fall back to Capacitor's defaults of
 * ./android and ./ios. That default is what originally created
 * `website/android` and put native build output inside the web repo; failing
 * loudly is much better than silently recreating it. The same reasoning applies
 * to ./ios, which would additionally drag in Pods/ and a .xcworkspace.
 *
 * NOTE: both blocks are evaluated eagerly when this module loads, so EVERY cap
 * command requires BOTH paths to be configured — `cap add ios` will throw about
 * the Android path if only iosPath is set. Configure both keys on every machine
 * that runs the Capacitor CLI, even one that cannot build for the other
 * platform (the Mac has no JDK and never builds Android).
 *
 * Only the Capacitor CLI loads this file — `npm run build` and the GitHub
 * Pages deploy never read it, so the throw cannot break a web deploy.
 */
type NativePlatform = 'android' | 'ios'

const PLATFORM_CONFIG = {
  android: {
    envVar: 'CAP_ANDROID_PATH',
    localKey: 'androidPath',
    example: '"androidPath": "C:/Users/hansi/AndroidStudioProjects/ViaStellis"',
  },
  ios: {
    envVar: 'CAP_IOS_PATH',
    localKey: 'iosPath',
    example: '"iosPath": "/Users/hansisern/Developer/viastellis-ios"',
  },
} as const satisfies Record<NativePlatform, { envVar: string; localKey: string; example: string }>

function resolveNativePath(platform: NativePlatform): string {
  const { envVar, localKey, example } = PLATFORM_CONFIG[platform]

  const fromEnv = process.env[envVar]?.trim()
  if (fromEnv) return fromEnv

  const localFile = resolve(here, 'capacitor.local.json')
  if (existsSync(localFile)) {
    try {
      const parsed = JSON.parse(readFileSync(localFile, 'utf8')) as Record<string, string | undefined>
      const p = parsed[localKey]?.trim()
      if (p) return isAbsolute(p) ? p : resolve(here, p)
    } catch (err) {
      throw new Error(
        `capacitor.local.json exists but could not be read as JSON: ${(err as Error).message}`,
      )
    }
  }

  throw new Error(
    `${platform} project path is not configured.\n` +
      'The native projects live outside this repo, so their locations must be set locally.\n' +
      'Note that every cap command needs BOTH paths, whichever platform you are targeting.\n\n' +
      'Create website/capacitor.local.json (gitignored) containing:\n' +
      `  { ${example} }\n\n` +
      `or set the ${envVar} environment variable before running cap commands.`,
  )
}

const config: CapacitorConfig = {
  appId: 'com.acalistudios.viastellis',
  appName: 'ViaStellis',
  webDir: 'dist',
  android: {
    path: resolveNativePath('android'),
  },
  ios: {
    path: resolveNativePath('ios'),
  },
}

export default config
