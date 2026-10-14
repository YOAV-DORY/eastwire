import { describe, expect, it } from 'vitest'
import { formatUtc, relativeTime } from './time'

const NOW = new Date('2026-10-13T12:00:00Z')

describe('relativeTime', () => {
  it.each([
    ['2026-10-13T11:59:30Z', 'just now'],
    ['2026-10-13T11:48:00Z', '12 min ago'],
    ['2026-10-13T09:00:00Z', '3 h ago'],
    ['2026-10-11T12:00:00Z', '2 d ago'],
    ['2026-08-01T12:00:00Z', '1 Aug 2026'],
  ])('%s -> %s', (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected)
  })
})

describe('formatUtc', () => {
  it('shows the exact time in UTC', () => {
    expect(formatUtc('2026-10-13T11:30:00Z')).toBe('13 Oct 2026, 11:30 UTC')
  })
})
