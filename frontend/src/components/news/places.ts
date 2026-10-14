import type { LocationView } from '../../api/types'

/**
 * The place a story is about: its main-subject city if there is one, else its main-subject
 * country. Falls back to the first place mentioned only for stories stored before the API
 * marked main subjects. Never the publisher's base.
 */
export function primaryPlace(locations: LocationView[], countryNames: Record<string, string> = {}): string | null {
  const about = locations.filter((l) => l.role !== 'publisher')
  const main = about.filter((l) => l.primary)
  const pool = main.length > 0 ? main : about
  const city = pool.find((l) => l.precision === 'city' && l.placeName)
  if (city) return city.placeName
  const first = pool[0]
  return first ? (countryNames[first.country] ?? first.country) : null
}

/** The main-subject city's GeoNames id, used to light its pin on the map. */
export function primaryCityId(locations: LocationView[]): number | null {
  const city = locations.find((l) => l.role !== 'publisher' && l.primary && l.precision === 'city' && l.placeId)
  return city?.placeId ?? null
}
