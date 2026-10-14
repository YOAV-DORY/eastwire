import type { LocationView } from '../../api/types'

/**
 * The place a story is about: its main-subject city if there is one, else its main-subject
 * country. A story with no main subject among our places shows none: a passing mention is
 * not what the story is about, and the publisher's base never is.
 */
export function primaryPlace(locations: LocationView[], countryNames: Record<string, string> = {}): string | null {
  const main = locations.filter((l) => l.role !== 'publisher' && l.primary)
  const city = main.find((l) => l.precision === 'city' && l.placeName)
  if (city) return city.placeName
  const first = main[0]
  return first ? (countryNames[first.country] ?? first.country) : null
}

/** The main-subject city's GeoNames id, used to light its pin on the map. */
export function primaryCityId(locations: LocationView[]): number | null {
  const city = locations.find((l) => l.role !== 'publisher' && l.primary && l.precision === 'city' && l.placeId)
  return city?.placeId ?? null
}
