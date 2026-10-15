import type {
  ArticlePage,
  ArticleView,
  CountryView,
  FrontPage,
  FrontStory,
  IllustrativeImage,
  SectorsView,
  SectorTag,
  SocialItemView,
  Status,
} from '../api/types'

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
        primary: true,
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
        primary: false,
      },
    ],
    sectors: [],
    alsoReportedBy: 0,
    ingestedAt: '2026-10-13T11:50:00Z',
    storyType: 'news',
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

/** Invented posts in the API's shape. */
export function socialItem(overrides: Partial<SocialItemView> = {}): SocialItemView {
  return {
    id: 1,
    platform: 'bluesky',
    url: 'https://bsky.app/profile/desk.example/post/abc',
    externalId: 'at://did:plc:desk/app.bsky.feed.post/abc',
    cid: 'bafyabc',
    text: 'Metro line opens in Bengaluru today',
    title: null,
    thumbnailUrl: null,
    createdAt: '2026-10-14T11:00:00Z',
    account: {
      handle: 'desk.example',
      name: 'Example Desk',
      kind: 'newsroom',
      reason: 'Invented newsroom for tests.',
      evidenceUrl: 'https://bsky.app/profile/desk.example',
    },
    countries: ['IN'],
    related: [],
    label: 'Social post · not verified reporting',
    ...overrides,
  }
}

export const VIDEO = socialItem({
  id: 2,
  platform: 'youtube',
  url: 'https://www.youtube.com/watch?v=vid123',
  externalId: 'vid123',
  cid: null,
  text: 'Inside the new metro',
  title: 'Inside the new metro',
  thumbnailUrl: 'https://i.ytimg.com/vi/vid123/mqdefault.jpg',
  account: { ...socialItem().account, handle: '@desk', name: 'Desk Video' },
  label: 'Video · not verified reporting',
})

/** A cleared illustrative image, as config/images.yaml would give it (invented file). */
export const IMAGE: IllustrativeImage = {
  id: 'tokyo-test',
  src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Invented.jpg/960px-Invented.jpg',
  srcSet: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Invented.jpg/500px-Invented.jpg 500w',
  width: 4000,
  height: 3000,
  alt: 'An invented street in Tokyo',
  caption: 'An invented street, Tokyo',
  position: '50% 50%',
  creator: 'A. Photographer',
  attribution: 'A. Photographer',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  filePage: 'https://commons.wikimedia.org/wiki/File:Invented.jpg',
  shareAlike: true,
  changes: 'Resized and cropped',
  illustrative: true,
}

export function frontStory(a: ArticleView, image: IllustrativeImage | null = null, why = ['Published 1 h ago']): FrontStory {
  return { article: a, image, why }
}

/** A front page: the first story leads, the next two are secondary, the rest are Latest. */
export function front(stories: ArticleView[], reading: ArticleView[] = [], overrides: Partial<FrontPage> = {}): FrontPage {
  const [lead, ...rest] = stories
  return {
    generatedAt: '2026-10-13T12:00:00Z',
    latestWindowHours: 48,
    lead: lead ? frontStory(lead, IMAGE, ['Published 12 min ago', 'Geopolitics']) : null,
    secondary: rest.slice(0, 2).map((a) => frontStory(a)),
    latest: rest.slice(2),
    latestCount: stories.length,
    reading,
    readingWindowDays: 30,
    readingFrom: reading.length ? (reading[reading.length - 1].publishedAt ?? reading[reading.length - 1].discoveredAt) : null,
    readingTo: reading.length ? (reading[0].publishedAt ?? reading[0].discoveredAt) : null,
    ...overrides,
  }
}
