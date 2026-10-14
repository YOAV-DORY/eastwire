import clsx from 'clsx'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { ArticleView, LocationView } from '../../api/types'
import { formatUtc, relativeTime, storyDate } from '../../lib/time'
import { Sticker } from '../ui/Sticker'
import { primaryCityId, primaryPlace } from './places'
import { SectorTags } from './SectorTags'
import styles from './StoryCard.module.css'

const ROLE_LABEL: Record<LocationView['role'], string> = {
  mentioned: 'Mentions',
  event: 'Dateline',
  publisher: 'Publisher',
}

export type StoryVariant = 'lead' | 'standard' | 'compact'

export interface StoryCardProps {
  article: ArticleView
  /** lead: the day's first story, large; standard: headline, line, summary; compact: headline and line. */
  variant?: StoryVariant
  /** ISO code → country name, for the place line and details. */
  countryNames?: Record<string, string>
  now?: Date
  /** Pointer or focus on the story, with its main city, so a map can light that pin. */
  onHighlight?: (placeId: number | null) => void
  highlighted?: boolean
}

/** Distinct place chips: the same place in the same role is shown once. */
function places(locations: LocationView[], countryNames: Record<string, string>) {
  const seen = new Set<string>()
  const out: { key: string; label: string; low: boolean; main: boolean; evidence: string | null }[] = []
  for (const l of locations) {
    const place = l.placeName ?? countryNames[l.country] ?? l.country
    const key = `${l.role}|${place}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, label: `${ROLE_LABEL[l.role]}: ${place}`, low: l.confidence === 'low', main: l.primary, evidence: l.evidence })
  }
  return out
}

/**
 * One story. Headline first (the only link to the original), then one quiet line with the
 * publisher, the place it is about and its own date, then a short summary where the source
 * allows one. Provenance, places and sectors sit behind "Details".
 */
export function StoryCard({
  article,
  variant = 'standard',
  countryNames = {},
  now,
  onHighlight,
  highlighted,
}: StoryCardProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const place = primaryPlace(article.locations, countryNames)
  const time = article.publishedAt ?? article.discoveredAt
  const when = article.publishedAt ? storyDate(article.publishedAt, now) : `found ${relativeTime(article.discoveredAt, now)}`
  const Heading = variant === 'lead' ? 'h2' : 'h3'
  const licensed = Boolean(article.excerpt && article.license)
  const highlight = onHighlight ? () => onHighlight(primaryCityId(article.locations)) : undefined

  return (
    <article
      className={clsx(styles.card, styles[variant], highlighted && styles.highlighted)}
      onPointerEnter={highlight}
      onPointerLeave={onHighlight ? () => onHighlight(null) : undefined}
      onFocus={highlight}
    >
      <Heading className={styles.headline}>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
          <ArrowUpRight className={styles.arrow} size={variant === 'lead' ? 20 : 15} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </Heading>

      <p className={styles.meta}>
        <span className={clsx(styles.item, styles.publisher)}>{article.publisher}</span>
        {place && <span className={styles.item}>{place}</span>}
        <time
          className={styles.item}
          dateTime={time}
          title={
            article.publishedAt
              ? `Published ${formatUtc(article.publishedAt)}`
              : `The source gives no publication time; found ${formatUtc(article.discoveredAt)}`
          }
        >
          {when}
        </time>
        {article.isNew && (
          <span className={styles.sticker}>
            <Sticker>New</Sticker>
          </span>
        )}
      </p>

      {article.excerpt && variant !== 'compact' && (
        <p className={clsx(styles.summary, variant === 'lead' ? 'clamp-3' : 'clamp-2')}>{article.excerpt}</p>
      )}
      {licensed && variant !== 'compact' && (
        <p className={styles.license}>
          {article.attribution}
          {' · '}
          <a href={article.license!.url} target="_blank" rel="noopener noreferrer license">
            license
          </a>
        </p>
      )}

      {variant !== 'compact' && (
        <div className={styles.detailsWrap}>
          <button
            type="button"
            className={styles.detailsToggle}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen(!open)}
          >
            Details
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className={styles.chevron} />
          </button>
          {open && (
            <div id={detailsId} className={styles.details}>
              <SectorTags sectors={article.sectors} />
              {article.locations.length > 0 && (
                <ul className={styles.places} aria-label="Places">
                  {places(article.locations, countryNames).map((c) => (
                    <li
                      key={c.key}
                      className={clsx(styles.place, c.low && styles.low, c.main && styles.main)}
                      title={c.low ? `Low confidence. ${c.evidence ?? ''}`.trim() : (c.evidence ?? undefined)}
                    >
                      {c.label}
                      {c.main && <span className="visually-hidden"> (what the story is about)</span>}
                      {c.low && <span className="visually-hidden"> (low confidence)</span>}
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.provenance}>
                {article.viaDiscovery ? 'Found through the GDELT Project' : `From ${article.source.name}`}
                {article.alsoReportedBy > 0 &&
                  ` · also reported by ${article.alsoReportedBy} ${article.alsoReportedBy === 1 ? 'other source' : 'other sources'}`}
                {!licensed && article.attribution && ` · ${article.attribution}`}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
