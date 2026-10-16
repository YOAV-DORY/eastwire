// EastWire edge: a Cloudflare Worker on the free plan (docs/edge.md).
//
// On a 10-minute Cron Trigger it
//   - pings the API's health endpoint, so the free-tier Render service never reaches its
//     15-minute idle spin-down (the ping does not touch the database, so Neon still scales
//     to zero between real queries);
//   - once an hour (the run between :10 and :19) asks GitHub to run the ingest workflow, when a
//     GITHUB_TOKEN secret is set: GitHub's own hourly schedule was observed firing only every
//     few hours;
//   - once an hour (between :30 and :39), or whenever none is stored, refreshes the "last good"
//     snapshot of the first screen in KV.
// Over HTTP it serves that snapshot (GET /snapshot.json) to the site, so a first visit shows
// real, dated stories at once while the live API answers in the background.
import { collectSnapshot, isSnapshot } from '../../frontend/snapshot/snapshot-core.mjs'

const SNAPSHOT_KEY = 'snapshot'

/** What a scheduled run at this time does. */
export function tasksFor(date) {
  const minute = date.getUTCMinutes()
  return {
    ping: true,
    ingest: minute >= 10 && minute < 20,
    snapshot: minute >= 30 && minute < 40,
  }
}

async function ping(env, fetchImpl) {
  try {
    // A sleeping service takes about a minute to wake; allow for it.
    const r = await fetchImpl(new URL('/api/v1/health', env.API_BASE), { signal: AbortSignal.timeout(90_000) })
    return r.ok
  } catch {
    return false
  }
}

export async function dispatchIngest(env, fetchImpl) {
  if (!env.GITHUB_TOKEN) return 'skipped: no GITHUB_TOKEN secret'
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.INGEST_WORKFLOW}/dispatches`
  const r = await fetchImpl(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'eastwire-edge',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  })
  return r.status === 204 ? 'dispatched' : `failed: HTTP ${r.status}`
}

export async function refreshSnapshot(env, fetchImpl, now = () => new Date()) {
  const snapshot = await collectSnapshot(env.API_BASE, { fetchImpl, now })
  if (!snapshot) return 'kept the previous snapshot: the API did not return the front page'
  await env.SNAPSHOT.put(SNAPSHOT_KEY, JSON.stringify(snapshot), { metadata: { generatedAt: snapshot.generatedAt } })
  return `stored snapshot ${snapshot.generatedAt}`
}

export async function scheduled(event, env, fetchImpl = fetch) {
  const tasks = tasksFor(new Date(event.scheduledTime))
  const log = []
  if (tasks.ping) log.push(`ping: ${(await ping(env, fetchImpl)) ? 'ok' : 'no answer'}`)
  if (tasks.ingest) log.push(`ingest: ${await dispatchIngest(env, fetchImpl).catch((e) => `failed: ${e.message}`)}`)
  const stored = await env.SNAPSHOT.getWithMetadata(SNAPSHOT_KEY, 'text')
  if (tasks.snapshot || !stored.value) log.push(`snapshot: ${await refreshSnapshot(env, fetchImpl)}`)
  return log
}

const CORS = {
  // Public data, read by the site and its preview deployments.
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
}

export async function handleRequest(request, env) {
  const { pathname } = new URL(request.url)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: CORS })
  if (pathname === '/snapshot.json') {
    const body = await env.SNAPSHOT.get(SNAPSHOT_KEY, 'text')
    if (!body) return Response.json({ error: 'No snapshot yet' }, { status: 503, headers: CORS })
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      parsed = null
    }
    if (!isSnapshot(parsed)) return Response.json({ error: 'Snapshot unreadable' }, { status: 503, headers: CORS })
    return new Response(body, {
      headers: {
        ...CORS,
        'content-type': 'application/json; charset=utf-8',
        // Browsers may reuse it for a minute, and show a stale copy while fetching a new one.
        'cache-control': 'public, max-age=60, stale-while-revalidate=600',
        'x-content-type-options': 'nosniff',
      },
    })
  }
  if (pathname === '/health') {
    const { metadata } = await env.SNAPSHOT.getWithMetadata(SNAPSHOT_KEY, 'text')
    return Response.json({ status: 'ok', snapshotGeneratedAt: metadata?.generatedAt ?? null }, { headers: CORS })
  }
  return new Response('Not found', { status: 404, headers: CORS })
}

export default {
  fetch: (request, env) => handleRequest(request, env),
  scheduled: (event, env, ctx) => ctx.waitUntil(scheduled(event, env).then((log) => console.log(log.join(' | ')))),
}
