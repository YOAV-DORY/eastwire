import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import type { ArticleView } from '../../api/types'
import { formatUtc, relativeTime, storyDate } from '../../lib/time'
import { primaryPlace } from '../news/places'
import styles from './FeatureCard.module.css'
import { StoryArt } from './StoryArt'
import { mainCountry } from './storyCountry'

/**
 * A story as a card: artwork (EastWire's own, labelled), headline, one line of source and
 * time, and the whole card opens the story at its source.
 */
export function FeatureCard({
  article: a,
  countryNames,
  kicker,
  index = 0,
  now,
}: {
  article: ArticleView
  countryNames: Record<string, string>
  /** A line above the headline, e.g. "Feature · 9 Oct 2026". */
  kicker?: string
  /** Position in its row, for the staggered entrance. */
  index?: number
  now?: Date
}) {
  const time = a.publishedAt ?? a.discoveredAt
  const when = a.publishedAt ? storyDate(a.publishedAt, now) : `found ${relativeTime(a.discoveredAt, now)}`
  const place = primaryPlace(a.locations, countryNames)
  return (
    <article className={clsx(styles.card)} style={{ ['--i' as string]: index }}>
      <StoryArt className={styles.art} country={mainCountry(a)} sector={a.sectors[0]?.slug} seed={a.id} />
      <div className={styles.body}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h3 className={styles.headline}>
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            {a.title}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </h3>
        <p className={styles.meta}>
          <span className={styles.publisher}>{a.publisher}</span>
          {place && <span> · {place}</span>}
          <span>
            {' · '}
            <time dateTime={time} title={formatUtc(time)} className="num">
              {when}
            </time>
          </span>
        </p>
        <span className={styles.action} aria-hidden="true">
          Read at source <ArrowUpRight size={14} strokeWidth={2} />
        </span>
      </div>
    </article>
  )
}
