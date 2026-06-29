import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Adjust custom set-state check to warning or off to avoid build/lint blocks on standard patterns
      'react-hooks/set-state-in-effect': 'off',
      // Adjust Fast Refresh to warning (so it doesn't block compile for dual hook/component exports)
      'react-refresh/only-export-components': 'warn',
    }
  },
])
