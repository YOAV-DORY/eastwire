import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { isSnapshot, type Snapshot } from '../../snapshot/snapshot-core.mjs'
import { DEFAULT_ROLES } from './map'
import { readSaved } from './savedCopy'

/**
 * The "last good" snapshot of the first screen (snapshot/snapshot-core.mjs): real API responses
 * with the time they were fetched. Two copies can exist:
 *   - one baked into index.html at build time (always there, may be older);
 *   - one served by the edge Worker (VITE_SNAPSHOT_URL), refreshed hourly.
 * The page starts from the newest of these and the copy saved on this device, then the live
 * API replaces it in the background. Nothing is ever invented: an absent view stays absent.
 */
export const SNAPSHOT_URL: string | undefined = import.meta.env.VITE_SNAPSHOT_URL || undefined

/** Each snapshot view and the query it seeds; the keys must match src/api/queries.ts. */
const QUERY_FOR: Record<keyof Snapshot['data'], { key: QueryKey; infinite?: boolean }> = {
  front: { key: ['front', {}] },
  countries: { key: ['countries'] },
  status: { key: ['status'] },
  map: { key: ['map', { window: '7d', roles: DEFAULT_ROLES }] },
  social: { key: ['social', { size: 4 }], infinite: true },
  sectors: { key: ['sectors'] },
  suggestions: { key: ['search-suggestions'] },
  mix: { key: ['mix'] },
}

/** The snapshot baked into index.html, if this build has one. */
export function readInlineSnapshot(doc: Document = document): Snapshot | null {
  const el = doc.getElementById('ew-snapshot')
  if (!el?.textContent) return null
  try {
    const parsed: unknown = JSON.parse(el.textContent)
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** The edge Worker's snapshot, or null if it is not configured, slow or unreadable. */
export async function fetchEdgeSnapshot(url = SNAPSHOT_URL, timeoutMs = 2_500): Promise<Snapshot | null> {
  if (!url) return null
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } })
    if (!r.ok) return null
    const parsed: unknown = await r.json()
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Puts each snapshot view into its query, unless the query (or this device's saved copy) already
 * holds something newer. The data keeps the snapshot's own time, so it counts as stale and the
 * live API is asked at once; it never presents an old copy as fresh.
 */
export function seedFromSnapshot(client: QueryClient, snapshot: Snapshot | null): void {
  if (!snapshot) return
  const at = Date.parse(snapshot.generatedAt)
  for (const [view, value] of Object.entries(snapshot.data) as [keyof Snapshot['data'], unknown][]) {
    const target = QUERY_FOR[view]
    if (!target || value === undefined || value === null) continue
    const current = client.getQueryState(target.key)?.dataUpdatedAt ?? 0
    const saved = readSaved(target.key)?.savedAt ?? 0
    if (current >= at || saved >= at) continue
    client.setQueryData(target.key, target.infinite ? { pages: [value], pageParams: [1] } : value, { updatedAt: at })
  }
}
