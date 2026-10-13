import { describe, expect, it } from 'vitest'
import type { CityPin } from '../api/types'
import { formatCoords, formatPopulation, pinLabel, pinSize, pinSvg, popupHtml, readMapState, writeMapState } from './map'

const PIN: CityPin = {
  id: 1850147,
  name: 'Tokyo',
  country: 'JP',
  lat: 35.69,
  lon: 139.69,
  total: 12,
  mentioned: 11,
  event: 2,
  publisher: 0,
  lowConfidenceOnly: false,
  lastItemAt: '2026-10-13T10:00:00Z',
}

describe('map state in the URL', () => {
  it('defaults to 7 days, mentioned + dateline, map view', () => {
    expect(readMapState(new URLSearchParams())).toEqual({
      window: '7d',
      roles: ['mentioned', 'event'],
      country: undefined,
      population: false,
      view: 'map',
    })
  })

  it('round-trips non-default values and ignores junk', () => {
    const state = readMapState(new URLSearchParams('window=24h&roles=event,bogus&country=JP&pop=1&view=list'))
    expect(state).toEqual({ window: '24h', roles: ['event'], country: 'JP', population: true, view: 'list' })
    expect(writeMapState(state).toString()).toBe('window=24h&roles=event&country=JP&pop=1&view=list')
    expect(writeMapState(readMapState(new URLSearchParams())).toString()).toBe('')
  })
})

describe('pins', () => {
  it('size by story count: 1–4, 5–19, 20+', () => {
    expect([1, 4, 5, 19, 20].map(pinSize)).toEqual(['s', 's', 'm', 'm', 'l'])
  })

  it('are dashed only when every story here is low confidence, and say so in text', () => {
    expect(pinSvg(PIN)).not.toContain('stroke-dasharray')
    const low = { ...PIN, lowConfidenceOnly: true }
    expect(pinSvg(low)).toContain('stroke-dasharray')
    expect(pinLabel(low)).toBe('Tokyo: 12 stories, low confidence')
  })

  it('popups escape names', () => {
    expect(popupHtml({ ...PIN, name: '<img src=x onerror=alert(1)>' })).not.toContain('<img')
  })
})

describe('formatting', () => {
  it('coordinates and population', () => {
    expect(formatCoords(34.69, 135.5)).toBe('34.69°N 135.50°E')
    expect(formatCoords(-6.2, -77)).toBe('6.20°S 77.00°W')
    expect(formatPopulation(2_753_862)).toBe('2.8 million')
    expect(formatPopulation(850_000)).toBe('850,000')
  })
})
