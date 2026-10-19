import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { execSync } from 'node:child_process'

// Commit the bundle is built from, shown in Settings on the web build.
function gitShortSha(): string {
  try { return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim() } catch { return 'dev' }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(gitShortSha()),
  },
  // Keep Vite's dep cache outside Dropbox — sync locks cause EBUSY crashes
  cacheDir: resolve(process.env.LOCALAPPDATA ?? __dirname, 'vite-cache/viastellis'),
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
