import type { ArticlePage, ArticleView, CountryView, SectorsView, SectorTag, Status } from '../api/types'

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

export const ECONOMY_TAG: SectorTag = {
  slug: 'economy',
  label: 'Economy',
  score: 5,
  rules: [
    { kind: 'keyword', value: 'inflation', field: 'headline', weight: 3 },
    { kind: 'gdelt_theme', value: 'ECON_INFLATION', field: null, weight: 1 },
    { kind: 'gdelt_theme', value: 'ECON_DEBT', field: null, weight: 1 },
    { kind: 'gdelt_theme', value: 'ECON_TAXATION', field: null, weight: 1 },
  ],
}

const NO_RULES = { keywords: [], negative: [], gdeltThemes: [], feedCategories: [] }

export const SECTORS_VIEW: SectorsView = {
  version: 'abc123def456',
  threshold: 3,
  maxSectors: 2,
  excerptFactor: 0.5,
  themeCap: 2,
  untagged7d: 40,
  sectors: [
    {
      slug: 'economy',
      label: 'Economy',
      definition: 'The economy as a whole.',
      last7d: 12,
      keywords: [{ rule: 'inflation', weight: 3 }, { rule: 'tariff*', weight: 3 }],
      negative: [{ rule: 'economy class', weight: 3 }],
      gdeltThemes: [{ rule: 'ECON_INFLATION', weight: 1 }],
      feedCategories: [{ rule: 'Economics & Business', weight: 1 }],
    },
    ...(['geopolitics', 'technology', 'business', 'society', 'environment'] as const).map((slug) => ({
      slug,
      label: slug[0].toUpperCase() + slug.slice(1),
      definition: `About ${slug}.`,
      last7d: 1,
      ...NO_RULES,
    })),
  ],
}
