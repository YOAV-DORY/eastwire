import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { readInlineSnapshot, seedFromSnapshot } from './snapshot'

const snap = (generatedAt: string, data: Record<string, unknown>) => ({ version: 1, generatedAt, data })

afterEach(() => {
  document.getElementById('ew-snapshot')?.remove()
})

describe('readInlineSnapshot', () => {
  it('reads a well-formed snapshot baked into the page and ignores anything else', () => {
    expect(readInlineSnapshot()).toBeNull()
    const el = document.createElement('script')
    el.id = 'ew-snapshot'
    el.type = 'application/json'
    el.textContent = JSON.stringify(snap('2026-10-15T10:00:00Z', { front: { latest: [] } }))
    document.head.append(el)
    expect(readInlineSnapshot()?.generatedAt).toBe('2026-10-15T10:00:00Z')
    el.textContent = '{"version":99}'
    expect(readInlineSnapshot()).toBeNull()
    el.textContent = 'not json'
    expect(readInlineSnapshot()).toBeNull()
  })
})

describe('seedFromSnapshot', () => {
  it("seeds each view with the snapshot's own time, so it is stale and refreshed at once", () => {
    const client = new QueryClient()
    seedFromSnapshot(client, snap('2026-10-15T10:00:00Z', { front: { latest: [1] }, countries: [{ iso2: 'JP' }], social: { items: [] } }))
    expect(client.getQueryData(['front', {}])).toEqual({ latest: [1] })
    expect(client.getQueryState(['front', {}])?.dataUpdatedAt).toBe(Date.parse('2026-10-15T10:00:00Z'))
    expect(client.getQueryData(['countries'])).toEqual([{ iso2: 'JP' }])
    // Infinite queries get their pages shape.
    expect(client.getQueryData(['social', { size: 4 }])).toEqual({ pages: [{ items: [] }], pageParams: [1] })
  })

  it('never replaces something newer: a later snapshot or a newer saved copy wins', () => {
    const client = new QueryClient()
    seedFromSnapshot(client, snap('2026-10-15T10:00:00Z', { front: { latest: ['new'] } }))
    seedFromSnapshot(client, snap('2026-10-15T08:00:00Z', { front: { latest: ['old'] } }))
    expect(client.getQueryData(['front', {}])).toEqual({ latest: ['new'] })

    localStorage.setItem('eastwire.saved.v1:["countries"]', JSON.stringify({ data: ['saved'], savedAt: Date.parse('2026-10-15T11:00:00Z') }))
    seedFromSnapshot(client, snap('2026-10-15T10:00:00Z', { front: { latest: ['new'] }, countries: ['snapshot'] }))
    expect(client.getQueryData(['countries'])).toBeUndefined()
  })
})
