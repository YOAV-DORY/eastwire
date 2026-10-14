import type { CityPin, LocationRole, MapWindow } from '../api/types'
import { isSectorId } from '../sectors'

/** Map view state, kept in the URL so a map view can be shared. */
export interface MapState {
  window: MapWindow
  roles: LocationRole[]
  country?: string
  sector?: string
  population: boolean
  /** map and list together (phones show one at a time), or the accessible city table. */
  view: 'map' | 'list' | 'table'
}

const WINDOWS: MapWindow[] = ['24h', '7d', '30d']
const ROLES: LocationRole[] = ['mentioned', 'event', 'publisher']
export const DEFAULT_ROLES: LocationRole[] = ['mentioned', 'event']

export function readMapState(params: URLSearchParams): MapState {
  const window = WINDOWS.find((w) => w === params.get('window')) ?? '7d'
  const roles = (params.get('roles') ?? '')
    .split(',')
    .filter((r): r is LocationRole => (ROLES as string[]).includes(r))
  return {
    window,
    roles: roles.length > 0 ? roles : DEFAULT_ROLES,
    country: params.get('country') ?? undefined,
    sector: isSectorId(params.get('sector')) ? (params.get('sector') ?? undefined) : undefined,
    population: params.get('pop') === '1',
    view: params.get('view') === 'list' ? 'list' : params.get('view') === 'table' ? 'table' : 'map',
  }
}

/** Only non-default values go into the URL, so the plain map link stays "/map". */
export function writeMapState(state: MapState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.window !== '7d') p.set('window', state.window)
  const rolesKey = [...state.roles].sort().join(',')
  if (rolesKey !== [...DEFAULT_ROLES].sort().join(',')) p.set('roles', state.roles.join(','))
  if (state.country) p.set('country', state.country)
  if (state.sector) p.set('sector', state.sector)
  if (state.population) p.set('pop', '1')
  if (state.view !== 'map') p.set('view', state.view)
  return p
}

export type PinSize = 's' | 'm' | 'l'

/** Pin size buckets from the design: 1–4, 5–19, 20+ stories. */
export function pinSize(total: number): PinSize {
  if (total >= 20) return 'l'
  if (total >= 5) return 'm'
  return 's'
}

export const PIN_PIXELS: Record<PinSize, [number, number]> = { s: [22, 29], m: [28, 37], l: [34, 45] }

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Flat pink teardrop with a black outline; dashed when every story placing it here is low confidence. */
export function pinSvg(pin: CityPin): string {
  const [w, h] = PIN_PIXELS[pinSize(pin.total)]
  const dash = pin.lowConfidenceOnly ? ' stroke-dasharray="3 2"' : ''
  return (
    `<svg width="${w}" height="${h}" viewBox="0 0 24 32" aria-hidden="true" focusable="false">` +
    `<path d="M12 1a11 11 0 0 1 11 11c0 8-11 19-11 19S1 20 1 12A11 11 0 0 1 12 1Z" fill="#ff90e8" stroke="#000" stroke-width="1.5"${dash}/>` +
    `<circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`
  )
}

/** Screen-reader text for a pin. */
export function pinLabel(pin: CityPin): string {
  const stories = `${pin.total} ${pin.total === 1 ? 'story' : 'stories'}`
  return `${pin.name}: ${stories}${pin.lowConfidenceOnly ? ', low confidence' : ''}`
}

export function popupHtml(pin: CityPin): string {
  return (
    `<div class="ew-popup"><strong>${escapeHtml(pin.name)}</strong>` +
    `<span class="ew-popup-counts">${pin.mentioned} mentioned · ${pin.event} dateline · ${pin.publisher} publisher</span>` +
    (pin.lowConfidenceOnly ? '<span class="ew-popup-note">Low confidence only</span>' : '') +
    `<a href="/map/city/${pin.id}" data-city="${pin.id}">Open city →</a></div>`
  )
}

/** "34.69°N 135.50°E" for mono coordinate labels. */
export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`
}

/** "2.7 million" / "850,000". */
export function formatPopulation(population: number): string {
  if (population >= 1_000_000) return `${(population / 1_000_000).toFixed(1)} million`
  return population.toLocaleString('en-US')
}

/** Population layer circle radius in pixels: area grows with population, clamped to stay readable. */
export function populationRadius(population: number): number {
  return Math.max(3, Math.min(22, Math.sqrt(population) / 180))
}
