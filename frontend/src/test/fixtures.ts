import type { ArticlePage, ArticleView, CountryView, Status } from '../api/types'

/** Invented test data in the API's shape. */
export function article(overrides: Partial<ArticleView> = {}): ArticleView {
  return {
    id: 1,
    title: 'Metro line opens in Bengaluru',
    url: 'https://scroll.in/article/1/made-up',
    publisher: 'Scroll.in',
    domain: 'scroll.in',
    source: { slug: 'gdelt-gkg', name: 'GDELT' },
    viaDiscovery: true,
    publishedAt: null,
    discoveredAt: '2026-10-13T11:48:00Z',
    isNew: true,
    excerpt: null,
    attribution: 'Data: The GDELT Project (gdeltproject.org)',
    license: null,
    locations: [
      {
        role: 'mentioned',
        precision: 'city',
        confidence: 'medium',
        method: 'gdelt_gkg',
        country: 'IN',
        placeId: 1277333,
        placeName: 'Bengaluru',
        evidence: 'Mentions Bangalore',
      },
      {
        role: 'publisher',
        precision: 'country',
        confidence: 'high',
        method: 'source_registry',
        country: 'IN',
        placeId: null,
        placeName: null,
        evidence: 'Publisher: Scroll.in',
      },
    ],
    sectors: [],
    alsoReportedBy: 0,
    ...overrides,
  }
}

export function page(items: ArticleView[], overrides: Partial<ArticlePage> = {}): ArticlePage {
  return { items, page: 1, size: 20, total: items.length, hasMore: false, ...overrides }
}

export const COUNTRIES: CountryView[] = [
  { iso2: 'CN', name: 'China', last24h: 3, total: 10 },
  { iso2: 'IN', name: 'India', last24h: 78, total: 83 },
  { iso2: 'JP', name: 'Japan', last24h: 2, total: 7 },
  { iso2: 'KR', name: 'South Korea', last24h: 1, total: 3 },
]

export function status(state: Status['state'], lastSuccessAt: string | null = new Date().toISOString()): Status {
  return { state, lastSuccessAt, sources: [] }
}
