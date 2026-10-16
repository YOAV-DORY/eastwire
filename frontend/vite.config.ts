import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { collectSnapshot, isSnapshot, waitForApi, type Snapshot } from './snapshot/snapshot-core.mjs'

/**
 * Writes the API's origin (and the edge snapshot's, if set) into dist/_headers, so the CSP
 * allows exactly those hosts.
 */
function originsInHeaders(mode: string): Plugin {
  let outDir = 'dist'
  return {
    name: 'eastwire-origins-in-headers',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      const api = new URL(env.VITE_API_BASE_URL ?? 'http://localhost:8080').origin
      const origins = new Set([api])
      if (env.VITE_SNAPSHOT_URL) origins.add(new URL(env.VITE_SNAPSHOT_URL).origin)
      const file = resolve(outDir, '_headers')
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__API_ORIGIN__', [...origins].join(' ')))
    },
  }
}

/**
 * Bakes a "last good" snapshot of the first screen into index.html at build time, so even a
 * visitor whose live API call is slow sees real, dated stories on first paint. Runs on
 * Cloudflare Pages builds (CF_PAGES) or with BAKE_SNAPSHOT=1; anywhere else (tests, CI) it does
 * nothing. Prefers the edge Worker's copy; otherwise asks the API, waiting for it to wake.
 * A failure never fails the build: the page simply starts without a baked snapshot.
 */
function bakedSnapshot(mode: string): Plugin {
  let snapshot: Snapshot | null = null
  return {
    name: 'eastwire-baked-snapshot',
    apply: 'build',
    async buildStart() {
      if (!process.env.CF_PAGES && !process.env.BAKE_SNAPSHOT) return
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      try {
        if (env.VITE_SNAPSHOT_URL) {
          const r = await fetch(env.VITE_SNAPSHOT_URL, { signal: AbortSignal.timeout(15_000) })
          const parsed: unknown = r.ok ? await r.json() : null
          if (isSnapshot(parsed)) snapshot = parsed
        }
        if (!snapshot && env.VITE_API_BASE_URL && (await waitForApi(env.VITE_API_BASE_URL))) {
          snapshot = await collectSnapshot(env.VITE_API_BASE_URL)
        }
      } catch {
        snapshot = null
      }
      this.info(snapshot ? `baked snapshot from ${snapshot.generatedAt}` : 'no snapshot baked')
    },
    transformIndexHtml(html) {
      if (!snapshot) return html
      // A JSON data block is never executed, so the CSP's script-src does not apply to it.
      const json = JSON.stringify(snapshot).replace(/</g, '\\u003c')
      return html.replace('</head>', `    <script id="ew-snapshot" type="application/json">${json}</script>\n  </head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), bakedSnapshot(mode), originsInHeaders(mode)],
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
