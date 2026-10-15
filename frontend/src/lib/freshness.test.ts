import { describe, expect, it } from 'vitest'
import { status } from '../test/fixtures'
import { freshnessLabel } from './freshness'

const NOW = new Date('2026-10-13T12:00:00Z')

describe('freshnessLabel', () => {
  it.each([
    ['fresh', '2026-10-13T11:48:00Z', 'Sources checked 12 min ago'],
    ['stale', '2026-10-13T09:00:00Z', 'Behind · last full check 3 h ago'],
    ['outage', '2026-10-11T09:00:00Z', 'Source checks failing · last success 11 Oct 2026'],
  ] as const)('%s', (state, at, expected) => {
    expect(freshnessLabel(status(state, at), false, NOW)).toBe(expected)
  })

  it('says so when nothing has run yet, and while loading', () => {
    expect(freshnessLabel(status('unknown', null), false, NOW)).toBe('No source check yet')
    expect(freshnessLabel(undefined, true, NOW)).toBe('Checking sources…')
  })

  it('stops checking and says so when the status request fails', () => {
    expect(freshnessLabel(undefined, false, NOW, true)).toBe('Source status unavailable')
  })
})
