import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
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
