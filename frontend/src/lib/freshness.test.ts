import { describe, expect, it } from 'vitest'
import { status } from '../test/fixtures'
import { freshnessLabel } from './freshness'

const NOW = new Date('2026-10-13T12:00:00Z')

describe('freshnessLabel', () => {
  it.each([
    ['fresh', '2026-10-13T11:48:00Z', 'Updated 12 min ago'],
    ['stale', '2026-10-13T09:00:00Z', 'Stale · updated 3 h ago'],
    ['outage', '2026-10-11T09:00:00Z', 'Sources offline · last update 11 Oct 2026'],
  ] as const)('%s', (state, at, expected) => {
    expect(freshnessLabel(status(state, at), false, NOW)).toBe(expected)
  })

  it('says so when nothing has run yet, and while loading', () => {
    expect(freshnessLabel(status('unknown', null), false, NOW)).toBe('No update yet')
    expect(freshnessLabel(undefined, true, NOW)).toBe('Checking…')
  })
})
