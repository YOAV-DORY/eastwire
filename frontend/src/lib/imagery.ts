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

/** The city the story is about (its primary, city-precision place), if any. */
function primaryCity(a: ArticleView): number | undefined {
  return a.locations.find((l) => l.primary && l.placeId != null)?.placeId ?? undefined
}

/**
 * A picture of the place or subject a story is about, never of the event: the photo of its
 * main city, else a subject photo for its country and sector; with `loose` (big slots: the
 * lead, the cards), else any photo from the same country, whose caption names the place it
 * shows. Each file is used once per page (`used` is shared by everything on the page).
 * No match: null, and the card shows EastWire's own illustrated tile instead.
 */
export function storyImage(
  a: ArticleView,
  country: string | undefined,
  used: Set<string>,
  loose = false,
): SlotImage | null {
  const city = primaryCity(a)
  const sector = a.sectors[0]?.slug
  const free = IMAGE_LIBRARY.filter((img) => !used.has(img.id))
  const match =
    (city !== undefined && free.find((img) => img.cities.includes(city))) ||
    (country && sector && free.find((img) => img.country === country && img.sectors.includes(sector))) ||
    (loose && country && free.find((img) => img.country === country)) ||
    null
  if (!match) return null
  used.add(match.id)
  return fromLibrary(match)
}

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
