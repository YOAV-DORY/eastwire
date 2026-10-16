import { describe, expect, it } from 'vitest'
import type { Status } from '../api/types'
import { status } from '../test/fixtures'
import { freshnessLabel, freshnessShort } from './freshness'

const NOW = new Date('2026-10-13T12:00:00Z')

/** One source fell behind: an operator matter, which readers should not be told about. */
const oneSourceBehind = (updatedAt: string): Status => ({
  ...status('stale', '2026-10-12T09:00:00Z'),
  updateState: 'fresh',
  updatedAt,
})

describe('freshnessLabel', () => {
  it.each([
    ['fresh', '2026-10-13T11:48:00Z', 'Updated 12 min ago'],
    // Six hours or more without any refresh: still calm words, but the tone (icon, colour) changes.
    ['stale', '2026-10-13T05:00:00Z', 'Updated 7 h ago'],
    ['outage', '2026-10-11T09:00:00Z', 'Not updated since 11 Oct 2026'],
  ] as const)('%s', (state, at, expected) => {
    expect(freshnessLabel(status(state, at), false, NOW)).toBe(expected)
  })

  it('tells readers when the news was refreshed, not that one source is behind', () => {
    const s = oneSourceBehind('2026-10-13T11:20:00Z')
    expect(freshnessLabel(s, false, NOW)).toBe('Updated 40 min ago')
    expect(freshnessShort(s, false, NOW)).toBe('40 min ago')
  })

  it('says so when nothing has run yet, and while loading', () => {
    expect(freshnessLabel(status('unknown', null), false, NOW)).toBe('Not updated yet')
    expect(freshnessLabel(undefined, true, NOW)).toBe('Loading…')
  })

  it('stops loading and says so when the status request fails', () => {
    expect(freshnessLabel(undefined, false, NOW, true)).toBe('Update time unavailable')
  })
})
