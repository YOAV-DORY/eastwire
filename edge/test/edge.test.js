import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dispatchIngest, handleRequest, refreshSnapshot, scheduled, tasksFor } from '../src/index.js'

/** An in-memory stand-in for the KV binding. */
function memoryKv(initial) {
  const store = new Map(initial ? [['snapshot', initial]] : [])
  return {
    store,
    async get(key) {
      return store.get(key)?.value ?? null
    },
    async getWithMetadata(key) {
      const entry = store.get(key)
      return { value: entry?.value ?? null, metadata: entry?.metadata ?? null }
    },
    async put(key, value, options) {
      store.set(key, { value, metadata: options?.metadata ?? null })
    },
  }
}

const FRONT = { generatedAt: '2026-10-15T10:00:00Z', lead: null, secondary: [], latest: [{ id: 1 }], reading: [] }

/** A fake API: answers every known path, records calls. */
function fakeApi({ front = FRONT, down = false } = {}) {
  const calls = []
  const fetchImpl = async (input, init) => {
    const url = String(input)
    calls.push({ url, method: init?.method ?? 'GET' })
    if (down) throw new Error('connection refused')
    if (url.startsWith('https://api.github.com/')) return new Response(null, { status: 204 })
    if (url.includes('/api/v1/health')) return Response.json({ status: 'ok' })
    if (url.includes('/api/v1/front')) return Response.json(front)
    return Response.json([])
  }
  return { calls, fetchImpl }
}

const env = (extra = {}) => ({
  API_BASE: 'https://api.example',
  GITHUB_REPO: 'owner/repo',
  INGEST_WORKFLOW: 'ingest.yml',
  SNAPSHOT: memoryKv(),
  ...extra,
})

describe('tasksFor', () => {
  it('pings every run, dispatches ingest once an hour and refreshes the snapshot once an hour', () => {
    const at = (m) => tasksFor(new Date(Date.UTC(2026, 9, 15, 8, m)))
    assert.deepEqual(at(0), { ping: true, ingest: false, snapshot: false })
    assert.deepEqual(at(10), { ping: true, ingest: true, snapshot: false })
    assert.deepEqual(at(30), { ping: true, ingest: false, snapshot: true })
    const hourly = [0, 10, 20, 30, 40, 50].map(at)
    assert.equal(hourly.filter((t) => t.ingest).length, 1)
    assert.equal(hourly.filter((t) => t.snapshot).length, 1)
  })
})

describe('refreshSnapshot', () => {
  it('stores every view the API returned, dated', async () => {
    const e = env()
    const { fetchImpl } = fakeApi()
    await refreshSnapshot(e, fetchImpl, () => new Date('2026-10-15T10:30:00Z'))
    const stored = JSON.parse(e.SNAPSHOT.store.get('snapshot').value)
    assert.equal(stored.generatedAt, '2026-10-15T10:30:00.000Z')
    assert.deepEqual(stored.data.front, FRONT)
    assert.ok('countries' in stored.data && 'map' in stored.data)
  })

  it('keeps the previous snapshot when the API is down, never storing an empty one', async () => {
    const e = env({ SNAPSHOT: memoryKv({ value: '{"old":true}', metadata: null }) })
    const result = await refreshSnapshot(e, fakeApi({ down: true }).fetchImpl)
    assert.match(result, /kept the previous snapshot/)
    assert.equal(e.SNAPSHOT.store.get('snapshot').value, '{"old":true}')
  })
})

describe('scheduled', () => {
  it('fills an empty store at once, whatever the minute', async () => {
    const e = env()
    const log = await scheduled({ scheduledTime: Date.UTC(2026, 9, 15, 8, 0) }, e, fakeApi().fetchImpl)
    assert.ok(log.some((l) => l.startsWith('snapshot: stored')))
  })

  it('dispatches the ingest workflow only with a token', async () => {
    const { calls, fetchImpl } = fakeApi()
    assert.match(await dispatchIngest(env(), fetchImpl), /skipped/)
    assert.equal(await dispatchIngest(env({ GITHUB_TOKEN: 't' }), fetchImpl), 'dispatched')
    assert.equal(calls.at(-1).url, 'https://api.github.com/repos/owner/repo/actions/workflows/ingest.yml/dispatches')
    assert.equal(calls.at(-1).method, 'POST')
  })
})

describe('handleRequest', () => {
  it('serves the stored snapshot to any origin, cacheable for a minute', async () => {
    const e = env()
    await refreshSnapshot(e, fakeApi().fetchImpl)
    const r = await handleRequest(new Request('https://edge.example/snapshot.json'), e)
    assert.equal(r.status, 200)
    assert.equal(r.headers.get('access-control-allow-origin'), '*')
    assert.match(r.headers.get('cache-control'), /max-age=60/)
    assert.equal((await r.json()).version, 1)
  })

  it('says so honestly when there is no snapshot yet', async () => {
    const r = await handleRequest(new Request('https://edge.example/snapshot.json'), env())
    assert.equal(r.status, 503)
  })

  it('accepts only reads', async () => {
    const r = await handleRequest(new Request('https://edge.example/snapshot.json', { method: 'POST' }), env())
    assert.equal(r.status, 405)
  })
})
