import type { LocationView } from '../../api/types'

/** The place a card is "about": a city if one is known, else the first country mentioned. */
export function primaryPlace(locations: LocationView[], countryNames: Record<string, string> = {}): string | null {
  const about = locations.filter((l) => l.role !== 'publisher')
  const city = about.find((l) => l.precision === 'city' && l.placeName)
  const first = city ?? about[0]
  if (!first) return null
  return city ? `${first.country} · ${city.placeName}` : (countryNames[first.country] ?? first.country)
}
