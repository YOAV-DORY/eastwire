import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** Writes the API's origin into dist/_headers, so the CSP allows exactly that one API host. */
function apiOriginInHeaders(mode: string): Plugin {
  return {
    name: 'eastwire-api-origin-in-headers',
    apply: 'build',
    closeBundle() {
      const base = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL ?? 'http://localhost:8080'
      const file = resolve('dist', '_headers')
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__API_ORIGIN__', new URL(base).origin))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiOriginInHeaders(mode)],
  // 5174, not Vite's default 5173, so EastWire can run next to other local projects.
  server: { port: 5174, strictPort: true },
  test: {
    environment: 'jsdom',
    // e2e/ holds Playwright tests (npm run e2e), not Vitest ones.
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
}))
