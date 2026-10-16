import type { ArticleView, IllustrativeImage } from '../api/types'
import { IMAGE_LIBRARY, type LibraryImage } from './imageLibrary'
import type { PageImage } from './pageImages'

/**
 * One shape for every picture on the site, whatever its source: a Commons file from the
 * catalog, a header image, or an image the API cleared for a story. Every one carries the
 * label shown on it ("Illustrative image", "Historical map") and its full credit.
 */
export interface SlotImage {
  id: string
  src: string
  srcSet: string
  alt: string
  caption: string
  credit: string
  license: string
  licenseUrl: string
  filePage: string
  position: string
  label: string
}

const sized = (url: string, w: number) => url.replace('{width}', String(w))

export function fromLibrary(image: LibraryImage | PageImage, label = 'Illustrative image'): SlotImage {
  return {
    id: image.id,
    src: sized(image.url, 960),
    srcSet: [500, 960, 1920].map((w) => `${sized(image.url, w)} ${w}w`).join(', '),
    alt: image.alt,
    caption: image.caption,
    credit: image.credit,
    license: image.license,
    licenseUrl: image.licenseUrl,
    filePage: image.filePage,
    position: image.position,
    label,
  }
}

export function fromApi(image: IllustrativeImage): SlotImage {
  return {
    id: image.id,
    src: image.src,
    srcSet: image.srcSet,
    alt: image.alt,
    caption: image.caption,
    credit: image.attribution,
    license: image.license,
    licenseUrl: image.licenseUrl ?? '',
    filePage: image.filePage,
    position: image.position,
    label: 'Illustrative image',
  }
}

/** The city the story is about (its primary, city-precision place), with its name. */
function primaryCity(a: ArticleView): { id: number; name: string } | undefined {
  const l = a.locations.find((x) => x.primary && x.role !== 'publisher' && x.placeId != null && x.placeName)
  return l ? { id: l.placeId!, name: l.placeName! } : undefined
}

const words = (text: string) => ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `

/**
 * A photo only when the match is real, by the same rules as the API's image matcher
 * (backend ImageMatcher, docs/images.md):
 *   - a city photo when the story's main city is that city and the headline names it;
 *   - a subject photo (e.g. Japan + geopolitics: the National Diet) when the story is about that
 *     country and sector and the headline contains one of the photo's keywords.
 * Each file at most once per page (`used` is shared by everything on the page). No match: null,
 * and the card shows EastWire's graphic card instead. A story about a country we do not cover
 * (North Korea datelined Beijing) gets no photo of the dateline city.
 */
export function storyImage(a: ArticleView, country: string | undefined, used: Set<string>): SlotImage | null {
  const title = words(a.title)
  const free = IMAGE_LIBRARY.filter((img) => !used.has(img.id))
  const city = primaryCity(a)
  const sector = a.sectors[0]?.slug
  const cityMatch =
    city && title.includes(words(city.name)) ? free.find((img) => img.cities.includes(city.id)) : undefined
  const topicMatch =
    !cityMatch && country && sector
      ? free.find(
          (img) =>
            img.country === country &&
            img.sectors.includes(sector) &&
            img.headlineWords.some((w) => title.includes(words(w))),
        )
      : undefined
  const match = cityMatch ?? topicMatch
  if (!match || OTHER_SUBJECT.test(a.title)) return null
  used.add(match.id)
  return fromLibrary(match)
}

/** Headlines about countries we do not cover: their dateline city is not what they are about. */
const OTHER_SUBJECT = /\b(North Korea|N\. ?Korea|Pyongyang|KCNA|Pakistan|Russia|Ukraine|Iran|Israel|Gaza)\b/i

/** A country's picture for its hero: its capital's, else any of its photos. */
const CAPITALS: Record<string, number> = { CN: 1816670, IN: 1261481, JP: 1850147, KR: 1835848 }

export function countryImage(country: string): SlotImage | null {
  const capital = CAPITALS[country]
  const img =
    IMAGE_LIBRARY.find((i) => i.country === country && i.cities.includes(capital)) ??
    IMAGE_LIBRARY.find((i) => i.country === country)
  return img ? fromLibrary(img) : null
}

/** A city's own photo, if the catalog has one. */
export function cityImage(cityId: number): SlotImage | null {
  const img = IMAGE_LIBRARY.find((i) => i.cities.includes(cityId))
  return img ? fromLibrary(img) : null
}
