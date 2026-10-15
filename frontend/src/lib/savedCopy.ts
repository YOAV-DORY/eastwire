/**
 * The last successfully fetched copy of a few views (front page, status, country counts),
 * kept on this device so a return visit shows real, dated news at once while the free-tier
 * server wakes. Never synthetic: only what the API actually returned, with when it did.
 */

const PREFIX = 'eastwire.saved.v1:'
/** Older copies are not worth showing: the reader should see an honest error instead. */
export const SAVED_COPY_MAX_AGE_MS = 7 * 24 * 60 * 60_000
const MAX_BYTES = 400_000
/** At most this many saved views; the oldest goes first. */
const MAX_ENTRIES = 16

/** When this page load started: data older than this came from a saved copy, not a fetch. */
export const PAGE_LOADED_AT = Date.now()

export interface SavedCopy<T> {
  data: T
  savedAt: number
}

function storageKey(key: readonly unknown[]): string {
  return PREFIX + JSON.stringify(key)
}

export function readSaved<T>(key: readonly unknown[], now = Date.now()): SavedCopy<T> | undefined {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as SavedCopy<T>
    if (typeof parsed?.savedAt !== 'number' || now - parsed.savedAt > SAVED_COPY_MAX_AGE_MS) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function writeSaved<T>(key: readonly unknown[], data: T, now = Date.now()): void {
  try {
    const value = JSON.stringify({ data, savedAt: now } satisfies SavedCopy<T>)
    if (value.length > MAX_BYTES) return
    localStorage.setItem(storageKey(key), value)
    prune()
  } catch {
    // Storage full or unavailable: the page still works, just without a saved copy next time.
  }
}

function prune(): void {
  const entries: { key: string; savedAt: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    try {
      entries.push({ key, savedAt: (JSON.parse(localStorage.getItem(key) ?? '{}') as SavedCopy<unknown>).savedAt ?? 0 })
    } catch {
      entries.push({ key, savedAt: 0 })
    }
  }
  entries.sort((a, b) => b.savedAt - a.savedAt)
  for (const old of entries.slice(MAX_ENTRIES)) localStorage.removeItem(old.key)
}

/** True when the data on screen is a saved copy from an earlier visit, not this page load's fetch. */
export function isSavedCopy(dataUpdatedAt: number): boolean {
  return dataUpdatedAt > 0 && dataUpdatedAt < PAGE_LOADED_AT
}
