import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // The api client builds absolute URLs from VITE_API_BASE_URL. `.env` is
    // gitignored, so without this the variable is undefined under test,
    // `new URL(path, 'undefined/')` throws, and every request surfaces as a
    // NetworkError. Pinning a placeholder here keeps the suite runnable on a
    // clean checkout with no manual setup. No request ever reaches it: the
    // api modules are mocked in component tests and fetch is stubbed in the
    // api-layer tests.
    env: {
      VITE_API_BASE_URL: 'http://localhost:3001',
    },
  },
})
