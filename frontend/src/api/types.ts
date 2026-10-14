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
  /** The story is about this place (headline, dateline, lead), not a passing mention. */
  primary: boolean
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
  sectors: SectorTag[]
  alsoReportedBy: number
}

export type SectorRuleKind = 'keyword' | 'negative' | 'gdelt_theme' | 'feed_category'

/** One rule that contributed to a sector tag. */
export interface SectorRule {
  kind: SectorRuleKind
  /** The keyword as written in the rules, the GDELT theme code, or the publisher's topic tag. */
  value: string
  /** Where a keyword was found. */
  field: 'headline' | 'excerpt' | null
  /** What it added to the score (negative for negative phrases). */
  weight: number
}

export interface SectorTag {
  slug: string
  label: string
  score: number
  rules: SectorRule[]
}

export interface WeightedRule {
  rule: string
  weight: number
}

export interface SectorDefinitionView {
  slug: string
  label: string
  definition: string
  last7d: number
  keywords: WeightedRule[]
  negative: WeightedRule[]
  gdeltThemes: WeightedRule[]
  feedCategories: WeightedRule[]
}

/** GET /api/v1/sectors: the rules from config/sectors.yaml plus 7-day counts. */
export interface SectorsView {
  version: string
  threshold: number
  maxSectors: number
  excerptFactor: number
  themeCap: number
  untagged7d: number
  sectors: SectorDefinitionView[]
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
  /** Database size against the free tier's limit; "warn" from 800 MB. */
  database?: { sizeBytes: number; limitBytes: number; state: 'ok' | 'warn' }
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

export type SocialPlatform = 'bluesky' | 'youtube'

/** A curated post or video (GET /api/v1/social). Never mixed into news results. */
export interface SocialItemView {
  id: number
  platform: SocialPlatform
  url: string
  /** Bluesky at:// URI or YouTube video id. */
  externalId: string
  /** Bluesky record version, needed by the official embed. */
  cid: string | null
  /** Bluesky post text: the plain fallback shown until the embed is loaded. */
  text: string | null
  /** YouTube video title. */
  title: string | null
  thumbnailUrl: string | null
  createdAt: string
  account: { handle: string; name: string; kind: 'newsroom' | 'journalist' | 'official'; reason: string; evidenceUrl: string }
  countries: string[]
  related: { articleId: number; title: string; url: string; publisher: string; linkType: 'shares_url' | 'text_overlap' }[]
  /** e.g. "Social post · not verified reporting" */
  label: string
}

export interface SocialPage {
  items: SocialItemView[]
  page: number
  size: number
  total: number
  hasMore: boolean
}
