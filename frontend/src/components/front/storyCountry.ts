import type { ArticleView } from '../../api/types'

/** The country a story is about (its first main-subject place), for its artwork. */
export function mainCountry(a: ArticleView): string | undefined {
  return a.locations.find((l) => l.primary && l.role !== 'publisher')?.country
}
