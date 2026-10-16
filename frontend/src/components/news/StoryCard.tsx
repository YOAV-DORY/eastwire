import clsx from 'clsx'
import { ArrowUpRight, Info } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import type { ArticleView } from '../../api/types'
import type { SlotImage } from '../../lib/imagery'
import { formatUtc, relativeTime, storyDate } from '../../lib/time'
import { SectorIcon } from '../graphics/SectorIcon'
import { ImageSlot } from '../media/ImageSlot'
import { mainCountry } from '../front/storyCountry'
import { primaryCityId, primaryPlace } from './places'
import { StoryDialog } from './StoryDialog'
import styles from './StoryCard.module.css'

/**
 * feature: picture on top, then the text (grids). row: text with a small picture beside it
 * (lists). compact: text only (map previews). standard: like feature, smaller headline.
 */
export type StoryVariant = 'feature' | 'standard' | 'row' | 'compact'

export interface StoryCardProps {
  article: ArticleView
  variant?: StoryVariant
  /** A credited picture; null draws EastWire's own tile; undefined shows no picture at all. */
  image?: SlotImage | null
  /** ISO code → country name, for the kicker and details. */
  countryNames?: Record<string, string>
  now?: Date
  /** Pointer or focus on the story, with its main city, so a map can light that pin. */
  onHighlight?: (placeId: number | null) => void
  highlighted?: boolean
  /** Position in its grid, for the staggered reveal. */
  index?: number
  /** Image sizes hint for the browser. */
  sizes?: string
  /** A label before the place in the kicker, e.g. "Feature · 9 Oct 2026" in Reading. */
  label?: string
}

/** "12 min ago" or "14 Oct", with the exact UTC time on hover; undated stories say when they were found. */
export function StoryTime({ article, now, className }: { article: ArticleView; now?: Date; className?: string }) {
  const time = article.publishedAt ?? article.discoveredAt
  return (
    <time
      className={clsx('num', className)}
      dateTime={time}
      title={
        article.publishedAt
          ? `Published ${formatUtc(article.publishedAt)}`
          : `The source gives no publication time; found ${formatUtc(article.discoveredAt)}`
      }
    >
      {article.publishedAt ? storyDate(article.publishedAt, now) : `found ${relativeTime(article.discoveredAt, now)}`}
    </time>
  )
}

/** Country (or city) and sector over the headline: where and what, before the words. */
export function StoryKicker({
  article,
  countryNames = {},
  label,
  className,
}: {
  article: ArticleView
  countryNames?: Record<string, string>
  label?: string
  className?: string
}) {
  const place = primaryPlace(article.locations, countryNames)
  const sector = article.sectors[0]
  return (
    <p className={clsx(styles.kicker, className)}>
      {label && <span className={styles.label}>{label}</span>}
      {place && <span className={styles.place}>{place}</span>}
      {sector && (
        <span className={styles.sector}>
          <SectorIcon sector={sector.slug} size={13} />
          {sector.label}
        </span>
      )}
      {!place && !sector && <span className={styles.place}>Asia</span>}
      {article.isNew && <span className={styles.new}>New</span>}
    </p>
  )
}

/**
 * One story. Kicker (place and sector), headline, a one-line summary where the source allows
 * one, then source and time. The whole card opens the story at its source (the headline link
 * covers it); "Details" opens the story's sheet with its provenance, places and tags.
 */
export function StoryCard({
  article,
  variant = 'feature',
  image,
  countryNames = {},
  now,
  onHighlight,
  highlighted,
  index = 0,
  sizes = '(min-width: 1024px) 400px, 100vw',
  label,
}: StoryCardProps) {
  const [open, setOpen] = useState(false)
  const Heading = 'h3'
  const licensed = Boolean(article.excerpt && article.license)
  const highlight = onHighlight ? () => onHighlight(primaryCityId(article.locations)) : undefined
  const showSummary = variant === 'feature' || variant === 'standard'
  const country = mainCountry(article)

  return (
    <article
      className={clsx(styles.card, styles[variant], highlighted && styles.highlighted)}
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
      onPointerEnter={highlight}
      onPointerLeave={onHighlight ? () => onHighlight(null) : undefined}
      onFocus={highlight}
    >
      {image !== undefined && variant !== 'compact' && (
        <ImageSlot
          className={styles.media}
          image={image}
          country={country}
          sector={article.sectors[0]?.slug}
          source={article.publisher}
          seed={article.id}
          ratio={variant === 'row' ? '4 / 3' : variant === 'standard' ? '16 / 9' : '3 / 2'}
          sizes={variant === 'row' ? '120px' : sizes}
          credit="short"
        />
      )}
      <div className={styles.body}>
        <StoryKicker article={article} countryNames={countryNames} label={label} />
        <Heading className={styles.headline}>
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.title}
            <span className="visually-hidden"> (read at {article.publisher}, opens in a new tab)</span>
          </a>
        </Heading>
        {showSummary && article.summary ? (
          <p className={clsx(styles.summary, 'clamp-2')} title="Summary written automatically by EastWire from the publisher's description">
            {article.summary}
          </p>
        ) : (
          showSummary && article.excerpt && <p className={clsx(styles.summary, 'clamp-2')}>{article.excerpt}</p>
        )}
        {showSummary && licensed && !article.summary && (
          <p className={styles.license}>
            {article.attribution}
            {' · '}
            <a href={article.license!.url} target="_blank" rel="noopener noreferrer license">
              license
            </a>
          </p>
        )}
        <div className={styles.foot}>
          <p className={styles.meta}>
            <span className={styles.publisher}>{article.publisher}</span>
            <StoryTime article={article} now={now} />
            {article.publisherLabel && <span className={styles.ownership}>{article.publisherLabel}</span>}
          </p>
          {variant !== 'compact' && (
            <div className={styles.actions}>
              {/* The headline link covers the card; this says plainly where it goes. */}
              <span className={styles.read} aria-hidden="true">
                Read at source
                <ArrowUpRight size={14} strokeWidth={2.25} />
              </span>
              <button
                type="button"
                className={styles.details}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
                aria-label={`Details: ${article.title}`}
              >
                <Info size={15} strokeWidth={2} aria-hidden="true" />
                <span className={styles.detailsLabel}>Details</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {open && (
        <StoryDialog article={article} image={image ?? null} countryNames={countryNames} now={now} onClose={() => setOpen(false)} />
      )}
    </article>
  )
}
