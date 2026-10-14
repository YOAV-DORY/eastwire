import type { Page, Route } from '@playwright/test'
import type { ArticleView, CityPin, MapData, PlaceView } from '../src/api/types'
import { article, COUNTRIES, ECONOMY_TAG, page, SECTORS_VIEW, socialItem, status, VIDEO } from '../src/test/fixtures'

/** Invented stories: two in India, one in Japan. */
export const ARTICLES: ArticleView[] = [
  article({ sectors: [ECONOMY_TAG] }),
  article({
    id: 2,
    title: 'Port expansion approved in Osaka',
    url: 'https://mainichi.jp/english/articles/2/made-up',
    publisher: 'The Mainichi (English edition)',
    domain: 'mainichi.jp',
    locations: [
      {
        role: 'mentioned',
        precision: 'city',
        confidence: 'medium',
        method: 'gdelt_gkg',
        country: 'JP',
        placeId: 1853909,
        placeName: 'Osaka',
        evidence: 'Mentions Osaka',
        primary: true,
      },
    ],
  }),
  article({ id: 3, title: 'Rupee steadies after central bank move', sectors: [ECONOMY_TAG] }),
]

const PLACES: PlaceView[] = [
  { id: 1277333, name: 'Bengaluru', country: 'IN', admin1: 'Karnataka', lat: 12.97, lon: 77.59, population: 8443675, capital: false },
  { id: 1853909, name: 'Osaka', country: 'JP', admin1: 'Osaka', lat: 34.69, lon: 135.5, population: 2753862, capital: false },
]

const PINS: CityPin[] = [
  { id: 1277333, name: 'Bengaluru', country: 'IN', lat: 12.97, lon: 77.59, total: 2, mentioned: 2, event: 0, publisher: 0, lowConfidenceOnly: false, lastItemAt: '2026-10-14T10:00:00Z' },
  { id: 1853909, name: 'Osaka', country: 'JP', lat: 34.69, lon: 135.5, total: 1, mentioned: 1, event: 0, publisher: 0, lowConfidenceOnly: false, lastItemAt: '2026-10-14T09:00:00Z' },
]

/** A 1×1 transparent PNG, so map tiles never hit OpenStreetMap from tests. */
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

function articlesFor(url: URL) {
  const country = url.searchParams.get('country')
  const city = Number(url.searchParams.get('city')) || undefined
  const sector = url.searchParams.get('sector')
  const q = url.searchParams.get('q')?.toLowerCase()
  const items = ARTICLES.filter(
    (a) =>
      (!country || a.locations.some((l) => l.country === country)) &&
      (!city || a.locations.some((l) => l.primary && l.placeId === city)) &&
      (!sector || a.sectors.some((s) => s.slug === sector)) &&
      (!q || a.title.toLowerCase().includes(q.replaceAll('"', ''))),
  )
  return page(items)
}

function mapFor(url: URL): MapData {
  const country = url.searchParams.get('country')
  return {
    window: '7d',
    roles: ['mentioned', 'event'],
    cities: PINS.filter((p) => !country || p.country === country),
    countryOnly: [{ country: 'IN', count: 4 }],
  }
}

/** Answers every /api/v1 call with invented data and stubs map tiles. Returns the API URLs requested. */
export async function mockApi(page: Page): Promise<URL[]> {
  const calls: URL[] = []
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ body: TILE, contentType: 'image/png' }))
  await page.route('**/api/v1/**', (route: Route) => {
    const url = new URL(route.request().url())
    calls.push(url)
    const body = (() => {
      switch (url.pathname) {
        case '/api/v1/articles':
        case '/api/v1/search':
          return articlesFor(url)
        case '/api/v1/countries':
          return COUNTRIES
        case '/api/v1/status':
          return status('fresh')
        case '/api/v1/places':
          return PLACES.filter((p) => !url.searchParams.get('country') || p.country === url.searchParams.get('country'))
        case '/api/v1/map/cities':
          return mapFor(url)
        case '/api/v1/sectors':
          return SECTORS_VIEW
        case '/api/v1/social':
          return { items: [socialItem(), VIDEO], page: 1, size: 12, total: 2, hasMore: false }
        case '/api/v1/sources':
          return []
        case '/api/v1/search/suggestions':
          return [
            { q: 'Osaka', count: 1 },
            { q: 'rupee', count: 1 },
            { q: 'metro', count: 1 },
          ]
        default:
          return null
      }
    })()
    return body === null
      ? route.fulfill({ status: 404, json: { error: 'not found' } })
      : route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  return calls
}

/** Collects Content-Security-Policy violations reported by the page. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) violations.push(msg.text())
  })
  return violations
}
