import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Vite inlines VITE_* variables at build time. A production build without
// VITE_API_BASE_URL still "succeeds", but the deployed site cannot reach the
// API at all. Fail the build instead so a misconfigured deploy never goes live.
function requireApiBaseUrl(): Plugin {
  return {
    name: 'require-api-base-url',
    configResolved(config) {
      if (config.command === 'build' && config.mode === 'production' && !config.env.VITE_API_BASE_URL) {
        throw new Error(
          'VITE_API_BASE_URL is not set. Set it in the build environment ' +
            '(e.g. the Render static site env vars) to the deployed API origin.',
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), requireApiBaseUrl()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    env: {
      VITE_API_BASE_URL: 'http://localhost:3001',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Measure the application only. Test files, fixtures and render helpers
      // are the instrument, not the subject: including them inflates the
      // percentage without saying anything about how well the app is tested.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
      ],
    },
  },
})
