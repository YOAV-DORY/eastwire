import { ArrowUpRight, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import type { FrontStory } from '../../api/types'
import type { SlotImage } from '../../lib/imagery'
import { ImageSlot } from '../media/ImageSlot'
import { primaryCityId } from '../news/places'
import { StoryKicker, StoryTime } from '../news/StoryCard'
import { StoryDialog } from '../news/StoryDialog'
import { mainCountry } from './storyCountry'
import styles from './LeadStory.module.css'

/**
 * The lead story: a large picture (a credited illustrative photo of the place or subject, or
 * EastWire's own tile, never a photo of the event), then the kicker, a big headline, the
 * summary where the source allows one, source and time, and why it leads. The whole block
 * opens the story at its source; "Details" opens its sheet.
 */
export function LeadStory({
  story,
  image,
  countryNames,
  now,
  onHighlight,
}: {
  story: FrontStory
  image: SlotImage | null
  countryNames: Record<string, string>
  now?: Date
  onHighlight?: (placeId: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const a = story.article
  const highlight = onHighlight ? () => onHighlight(primaryCityId(a.locations)) : undefined
  return (
    <article
      className={styles.lead}
      aria-labelledby={`lead-${a.id}`}
      onPointerEnter={highlight}
      onPointerLeave={onHighlight ? () => onHighlight(null) : undefined}
      onFocus={highlight}
    >
      <ImageSlot
        className={styles.media}
        image={image}
        country={mainCountry(a)}
        sector={a.sectors[0]?.slug}
        seed={a.id}
        ratio="var(--lead-ratio)"
        sizes="(min-width: 1024px) 800px, 100vw"
        eager
      />
      <div className={styles.body}>
        <StoryKicker article={a} countryNames={countryNames} className={styles.kicker} />
        <h2 id={`lead-${a.id}`} className={styles.headline}>
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            {a.title}
            <span className="visually-hidden"> (read at {a.publisher}, opens in a new tab)</span>
          </a>
        </h2>
        {a.excerpt && <p className={styles.summary}>{a.excerpt}</p>}
        {a.excerpt && a.license && (
          <p className={styles.license}>
            {a.attribution} ·{' '}
            <a href={a.license.url} target="_blank" rel="noopener noreferrer license">
              license
            </a>
          </p>
        )}
        <div className={styles.foot}>
          <p className={styles.meta}>
            <strong>{a.publisher}</strong>
            <StoryTime article={a} now={now} />
          </p>
          <span className={styles.read} aria-hidden="true">
            Read at {a.publisher}
            <ArrowUpRight size={16} strokeWidth={2.25} />
          </span>
          <button
            type="button"
            className={styles.details}
            aria-haspopup="dialog"
            aria-label={`Details: ${a.title}`}
            onClick={() => setOpen(true)}
          >
            <PanelRightOpen size={15} strokeWidth={2} aria-hidden="true" />
            Details
          </button>
        </div>
        {story.why.length > 0 && (
          <p className={styles.why}>
            <span>Why it leads</span> {story.why.join(' · ')}
          </p>
        )}
      </div>
      {open && <StoryDialog article={a} image={image} countryNames={countryNames} now={now} onClose={() => setOpen(false)} />}
    </article>
  )
}
