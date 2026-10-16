// The "last good" snapshot: what a first-time visitor sees instantly, before the live API
// answers (the free-tier API can take about a minute to wake). Shared by three users:
//   - edge/ (Cloudflare Worker): refreshes it on a schedule and serves it from KV;
//   - vite.config.ts: bakes one into index.html at build time, as a fallback;
//   - src/lib/snapshot.ts: seeds the page's queries from it.
// Only real API responses, each kept as returned, with the time they were fetched.

/** Version of the snapshot format; bump when the shape changes. */
export const SNAPSHOT_VERSION = 1

/**
 * The API views a first screen needs, by snapshot key. The frontend maps each key to the
 * query it seeds (src/lib/snapshot.ts), so the paths must match the queries' own parameters.
 */
export const SNAPSHOT_ENDPOINTS = {
  front: '/api/v1/front',
  countries: '/api/v1/countries',
  status: '/api/v1/status',
  map: '/api/v1/map/cities?window=7d&roles=mentioned%2Cevent',
  social: '/api/v1/social?size=4&page=1',
  sectors: '/api/v1/sectors',
  suggestions: '/api/v1/search/suggestions',
  mix: '/api/v1/mix',
}

/** Polls the API's health endpoint until it answers (waking a sleeping free-tier server). */
export async function waitForApi(apiBase, { fetchImpl = globalThis.fetch, totalMs = 120_000, stepMs = 5_000 } = {}) {
  const deadline = Date.now() + totalMs
  while (Date.now() < deadline) {
    try {
      const r = await fetchImpl(new URL('/api/v1/health', apiBase), { signal: AbortSignal.timeout(30_000) })
      if (r.ok) return true
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  return false
}

/**
 * Fetches every snapshot view. Returns null unless the front page came back: a snapshot without
 * stories is not worth showing. Views that fail are simply left out.
 */
export async function collectSnapshot(apiBase, { fetchImpl = globalThis.fetch, timeoutMs = 25_000, now = () => new Date() } = {}) {
  const data = {}
  await Promise.all(
    Object.entries(SNAPSHOT_ENDPOINTS).map(async ([key, path]) => {
      try {
        const r = await fetchImpl(new URL(path, apiBase), {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (r.ok) data[key] = await r.json()
      } catch {
        // Left out; the page fetches it live.
      }
    }),
  )
  if (!data.front || !Array.isArray(data.front.latest)) return null
  return { version: SNAPSHOT_VERSION, generatedAt: now().toISOString(), data }
}

/** True for a well-formed snapshot of this version. */
export function isSnapshot(value) {
  return Boolean(
    value &&
      value.version === SNAPSHOT_VERSION &&
      typeof value.generatedAt === 'string' &&
      !Number.isNaN(Date.parse(value.generatedAt)) &&
      value.data &&
      typeof value.data === 'object' &&
      value.data.front,
  )
}
