import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import type { FrontStory } from '../../api/types'
import { formatUtc, relativeTime, storyDate } from '../../lib/time'
import { primaryCityId, primaryPlace } from '../news/places'
import { isCleared } from './cleared'
import { IllustrativeFigure } from './IllustrativeFigure'
import styles from './LeadStory.module.css'

/**
 * The lead story on its deep-ink panel: the headline (the only link to the original), one
 * quiet line, the summary if the source allows one, why it leads, and a cleared illustrative
 * photo when one fits. Without a cleared photo the panel is a deliberate text-only layout.
 */
export function LeadStory({
  story,
  countryNames,
  now,
  onHighlight,
}: {
  story: FrontStory
  countryNames: Record<string, string>
  now?: Date
  onHighlight?: (placeId: number | null) => void
}) {
  const a = story.article
  const place = primaryPlace(a.locations, countryNames)
  const time = a.publishedAt ?? a.discoveredAt
  const when = a.publishedAt ? storyDate(a.publishedAt, now) : `found ${relativeTime(a.discoveredAt, now)}`
  const image = isCleared(story.image) ? story.image : null
  const highlight = onHighlight ? () => onHighlight(primaryCityId(a.locations)) : undefined
  return (
    <article
      className={clsx(styles.lead, image && styles.withImage)}
      aria-labelledby={`lead-${a.id}`}
      onPointerEnter={highlight}
      onPointerLeave={onHighlight ? () => onHighlight(null) : undefined}
      onFocus={highlight}
    >
      <div className={styles.head}>
        <p className={styles.kicker}>
          Lead story{place && <span> · {place}</span>}
        </p>
        <h2 id={`lead-${a.id}`} className={styles.headline}>
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            {a.title}
            <ArrowUpRight className={styles.arrow} size={22} strokeWidth={2} aria-hidden="true" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </h2>
        <p className={styles.meta}>
          <span className={styles.publisher}>{a.publisher}</span>
          <time
            className="num"
            dateTime={time}
            title={a.publishedAt ? `Published ${formatUtc(a.publishedAt)}` : `The source gives no publication time; found ${formatUtc(a.discoveredAt)}`}
          >
            {when}
          </time>
          {a.isNew && <span className={styles.new}>New</span>}
        </p>
      </div>
      {image && (
        <IllustrativeFigure
          className={styles.figure}
          image={image}
          variant="lead"
          sizes="(min-width: 1024px) 420px, (min-width: 720px) 45vw, 100vw"
        />
      )}
      {(a.excerpt || story.why.length > 0) && (
        <div className={styles.body}>
          {a.excerpt && <p className={styles.summary}>{a.excerpt}</p>}
          {a.excerpt && a.license && (
            <p className={styles.license}>
              {a.attribution} ·{' '}
              <a href={a.license.url} target="_blank" rel="noopener noreferrer license">
                license
              </a>
            </p>
          )}
          {story.why.length > 0 && (
            <p className={styles.why}>
              <span>Why it leads</span> {story.why.join(' · ')}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
