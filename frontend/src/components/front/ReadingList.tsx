import type { ArticleView } from '../../api/types'
import { formatDate, formatUtc } from '../../lib/time'
import { primaryPlace } from '../news/places'
import styles from './ReadingList.module.css'

/**
 * Features and earlier reports, each with its own date: depth material kept out of Latest so
 * an essay from last week never sits among today's news looking new.
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
        {items.map((a) => {
          const time = a.publishedAt ?? a.discoveredAt
          const place = primaryPlace(a.locations, countryNames)
          return (
            <li key={a.id} className={styles.item}>
              <p className={styles.kind}>
                {a.storyType === 'feature' ? 'Feature' : 'Earlier report'} ·{' '}
                <time dateTime={time} title={formatUtc(time)}>
                  {a.publishedAt ? formatDate(a.publishedAt) : `found ${formatDate(a.discoveredAt)}`}
                </time>
              </p>
              <h3 className={styles.headline}>
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.title}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </h3>
              <p className={styles.meta}>
                {a.publisher}
                {place && <> · {place}</>}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
