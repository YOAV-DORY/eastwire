import type { ArticleView } from '../../api/types'
import type { SlotImage } from '../../lib/imagery'
import { formatDate } from '../../lib/time'
import { StoryCard } from '../news/StoryCard'
import styles from './ReadingList.module.css'

/**
 * Features and earlier reports, each with its own date: depth material kept out of Latest so
 * an essay from last week never sits among today's news looking new.
 */
export function ReadingList({
  items,
  images,
  from,
  to,
  countryNames,
}: {
  items: ArticleView[]
  images?: Map<number, SlotImage | null | undefined>
  from: string | null
  to: string | null
  countryNames: Record<string, string>
}) {
  if (items.length === 0) return null
  const range = from && to ? (formatDate(from) === formatDate(to) ? formatDate(to) : `${formatDate(from)} – ${formatDate(to)}`) : null
  return (
    <section className={styles.reading} aria-labelledby="reading-title">
      <header className={styles.head}>
        <h2 id="reading-title" className={styles.title}>
          Reading
        </h2>
        <p className={styles.sub}>
          Features, essays and earlier reports{range && <> · published {range}</>}. Not today&apos;s news.
        </p>
      </header>
      <ol className={styles.grid}>
        {items.map((a, i) => (
          <li key={a.id} className="reveal">
            <StoryCard
              article={a}
              variant="feature"
              image={images?.get(a.id) ?? null}
              countryNames={countryNames}
              index={i}
              sizes="(min-width: 1024px) 300px, (min-width: 560px) 50vw, 100vw"
              label={`${a.storyType === 'feature' ? 'Feature' : 'Earlier report'} · ${a.publishedAt ? formatDate(a.publishedAt) : `found ${formatDate(a.discoveredAt)}`}`}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
