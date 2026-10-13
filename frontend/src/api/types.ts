/** Response shapes of the EastWire API (backend/api). Keep in sync with the Java records. */

export type LocationRole = 'mentioned' | 'event' | 'publisher'
export type Precision = 'city' | 'admin1' | 'country'
export type Confidence = 'high' | 'medium' | 'low'

export interface LocationView {
  role: LocationRole
  precision: Precision
  confidence: Confidence
  method: string
  country: string
  placeId: number | null
  placeName: string | null
  evidence: string | null
}

export interface ArticleView {
  id: number
  title: string
  url: string
  publisher: string
  domain: string
  source: { slug: string; name: string }
  viaDiscovery: boolean
  publishedAt: string | null
  discoveredAt: string
  isNew: boolean
  excerpt: string | null
  attribution: string | null
  license: { name: string; url: string } | null
  locations: LocationView[]
  sectors: string[]
  alsoReportedBy: number
}

export interface ArticlePage {
  items: ArticleView[]
  page: number
  size: number
  total: number
  hasMore: boolean
}

export type FreshnessState = 'fresh' | 'stale' | 'outage' | 'unknown'

export interface SourceStatus {
  slug: string
  name: string
  state: FreshnessState
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  newestItemAt: string | null
  consecutiveFailures: number
  circuitOpen: boolean
}

export interface Status {
  state: FreshnessState
  lastSuccessAt: string | null
  sources: SourceStatus[]
}

export interface CountryView {
  iso2: string
  name: string
  last24h: number
  total: number
}

export interface PlaceView {
  id: number
  name: string
  country: string
  admin1: string | null
  lat: number
  lon: number
  population: number
  capital: boolean
}

export interface SourceView {
  slug: string
  name: string
  kind: string
  status: 'verified' | 'conditional' | 'excluded'
  enabled: boolean
  displayMode: string
  attribution: string | null
  label: string | null
  evidenceUrl: string
  evidenceCheckedOn: string
  evidenceNote: string | null
}

export type MapWindow = '24h' | '7d' | '30d'

/** A city pin: stories placed in this city (city precision only), counted once each. */
export interface CityPin {
  id: number
  name: string
  country: string
  lat: number
  lon: number
  total: number
  mentioned: number
  event: number
  publisher: number
  lowConfidenceOnly: boolean
  lastItemAt: string
}

export interface MapData {
  window: MapWindow
  roles: LocationRole[]
  cities: CityPin[]
  /** Stories that name a country but no city on the list there; never pinned to a capital. */
  countryOnly: { country: string; count: number }[]
}
