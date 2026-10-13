import { ArrowUpRight } from 'lucide-react'
import type { ArticleView, LocationView } from '../../api/types'
import { formatUtc, relativeTime } from '../../lib/time'
import { Sticker } from '../ui/Sticker'
import { primaryPlace } from './places'
import styles from './StoryCard.module.css'

const ROLE_LABEL: Record<LocationView['role'], string> = {
  mentioned: 'Mentions',
  event: 'Dateline',
  publisher: 'Publisher',
}

export interface StoryCardProps {
  article: ArticleView
  /** ISO code → country name, for location chips. */
  countryNames?: Record<string, string>
  now?: Date
}

/** Distinct chips, at most four: the same place in the same role is shown once. */
function chips(locations: LocationView[], countryNames: Record<string, string>) {
  const seen = new Set<string>()
  const out: { key: string; label: string; low: boolean; evidence: string | null }[] = []
  for (const l of locations) {
    const place = l.placeName ?? countryNames[l.country] ?? l.country
    const key = `${l.role}|${place}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, label: `${ROLE_LABEL[l.role]}: ${place}`, low: l.confidence === 'low', evidence: l.evidence })
  }
  return out.slice(0, 4)
}

export function StoryCard({ article, countryNames = {}, now }: StoryCardProps) {
  const time = article.publishedAt ?? article.discoveredAt
  const timeLabel = article.publishedAt ? relativeTime(time, now) : `found ${relativeTime(time, now)}`
  const place = primaryPlace(article.locations, countryNames)
  return (
    <article className={styles.card}>
      <div className={`${styles.meta} mono`}>
        {place && <span className={styles.place}>{place}</span>}
        <time dateTime={time} title={formatUtc(time)} className="muted">
          {timeLabel}
        </time>
        {article.isNew && <Sticker>New</Sticker>}
      </div>
      <h3 className={styles.headline}>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
          <ArrowUpRight className={styles.arrow} size={16} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </h3>
      {article.excerpt && <p className={`${styles.excerpt} clamp-2`}>{article.excerpt}</p>}
      <div className={styles.footer}>
        <span className={`${styles.publisher} mono`}>{article.publisher}</span>
        {article.viaDiscovery && <span className={`${styles.badge} mono`}>via GDELT</span>}
        {article.alsoReportedBy > 0 && (
          <span className={`${styles.badge} mono`}>
            Also reported by {article.alsoReportedBy} {article.alsoReportedBy === 1 ? 'source' : 'sources'}
          </span>
        )}
      </div>
      {article.locations.length > 0 && (
        <ul className={styles.locations} aria-label="Places">
          {chips(article.locations, countryNames).map((c) => (
            <li
              key={c.key}
              className={c.low ? `${styles.location} ${styles.low}` : styles.location}
              title={c.low ? `Low confidence. ${c.evidence ?? ''}`.trim() : (c.evidence ?? undefined)}
            >
              {c.label}
              {c.low && <span className="visually-hidden"> (low confidence)</span>}
            </li>
          ))}
        </ul>
      )}
      {article.attribution && (
        <p className={`${styles.attribution} muted`}>
          {article.attribution}
          {article.license && (
            <>
              {' · '}
              <a href={article.license.url} target="_blank" rel="noopener noreferrer license">
                license
              </a>
            </>
          )}
        </p>
      )}
    </article>
  )
}
