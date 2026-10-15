import type { ArticleView } from '../../api/types'
import { formatDate } from '../../lib/time'
import { FeatureCard } from './FeatureCard'
import styles from './ReadingList.module.css'

/**
 * Features and earlier reports, each with its own date: depth material kept out of Latest so
 * an essay from last week never sits among today's news looking new. Cards, like In focus.
 */
export function ReadingList({
  items,
  from,
  to,
  countryNames,
}: {
  items: ArticleView[]
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
          <li key={a.id}>
            <FeatureCard
              article={a}
              index={i}
              countryNames={countryNames}
              kicker={`${a.storyType === 'feature' ? 'Feature' : 'Earlier report'} · ${a.publishedAt ? formatDate(a.publishedAt) : `found ${formatDate(a.discoveredAt)}`}`}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
