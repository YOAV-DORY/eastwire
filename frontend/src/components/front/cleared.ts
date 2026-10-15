import type { IllustrativeImage } from '../../api/types'

/**
 * Shown only with every rights field present. The API already rejects incomplete entries;
 * this is the second gate, so a half-credited image can never reach the page.
 */
export function isCleared(image: IllustrativeImage | null | undefined): image is IllustrativeImage {
  return Boolean(
    image &&
      image.illustrative === true &&
      image.creator?.trim() &&
      image.attribution?.trim() &&
      image.license?.trim() &&
      image.alt?.trim() &&
      image.filePage?.startsWith('https://commons.wikimedia.org/wiki/File:'),
  )
}
