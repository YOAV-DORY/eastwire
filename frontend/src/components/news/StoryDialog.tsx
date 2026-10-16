import clsx from 'clsx'
import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import type { ArticleView, LocationView } from '../../api/types'
import type { SlotImage } from '../../lib/imagery'
import { formatUtc } from '../../lib/time'
import { ImageSlot } from '../media/ImageSlot'
import { mainCountry } from '../front/storyCountry'
import { SectorTags } from './SectorTags'
import { StoryKicker, StoryTime } from './StoryCard'
import styles from './StoryDialog.module.css'

const ROLE_LABEL: Record<LocationView['role'], string> = {
  mentioned: 'About',
  event: 'Dateline',
  publisher: 'Publisher based in',
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
 * The story view: the story on its own sheet (a side panel on wide screens, full screen on
 * phones). The picture and summary where allowed, a clear "Read at" button, then why it was
 * tagged, which places it names and every time we know. Escape, the close button or a click
 * outside closes it, and focus returns to the "Details" button.
 */
export function StoryDialog({
  article: a,
  image,
  countryNames,
  now,
  onClose,
}: {
  article: ArticleView
  image: SlotImage | null
  countryNames: Record<string, string>
  now?: Date
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal?.()
  }, [])
  const licensed = Boolean(a.excerpt && a.license)
  const titleId = `story-${a.id}-title`
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.bar}>
          <p className={styles.barLabel}>Story details</p>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close story details">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <ImageSlot
          image={image}
          country={mainCountry(a)}
          sector={a.sectors[0]?.slug}
          source={a.publisher}
          seed={a.id}
          ratio="16 / 9"
          sizes="(min-width: 720px) 560px, 100vw"
        />
        <div className={styles.body}>
          <StoryKicker article={a} countryNames={countryNames} />
          <h2 id={titleId} className={styles.headline}>
            {a.title}
          </h2>
          <p className={styles.meta}>
            <strong>{a.publisher}</strong>
            {a.publisherLabel && <span>{a.publisherLabel}</span>}
            <StoryTime article={a} now={now} />
          </p>
          {a.summary && (
            <div className={styles.ours}>
              <p className={styles.summary}>{a.summary}</p>
              <p className={styles.note}>
                Summary written automatically by EastWire from the publisher&apos;s description, and checked so it adds no
                name or number the publisher did not state. <Link to="/about#summaries">How summaries work</Link>
              </p>
            </div>
          )}
          {a.excerpt && <p className={styles.summary}>{a.excerpt}</p>}
          {!a.summary && !a.excerpt && (
            <p className={styles.noSummary}>
              No summary: {a.publisher}&apos;s terms allow us the headline and link only, or its feed gave nothing more to
              work from.
            </p>
          )}
          {licensed && (
            <p className={styles.license}>
              {a.attribution} ·{' '}
              <a href={a.license!.url} target="_blank" rel="noopener noreferrer license">
                {a.license!.name}
              </a>
            </p>
          )}
          <a className={styles.read} href={a.url} target="_blank" rel="noopener noreferrer">
            Read at {a.publisher}
            <ArrowUpRight size={18} strokeWidth={2.25} aria-hidden="true" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>

          <section className={styles.section} aria-labelledby={`${titleId}-tags`}>
            <h3 id={`${titleId}-tags`} className={styles.sectionTitle}>
              Sectors
            </h3>
            {a.sectors.length > 0 ? (
              <SectorTags sectors={a.sectors} />
            ) : (
              <p className={styles.note}>No sector rule matched this headline.</p>
            )}
          </section>

          {a.locations.length > 0 && (
            <section className={styles.section} aria-labelledby={`${titleId}-places`}>
              <h3 id={`${titleId}-places`} className={styles.sectionTitle}>
                Places
              </h3>
              <ul className={styles.places}>
                {places(a.locations, countryNames).map((c) => (
                  <li
                    key={c.key}
                    className={clsx(styles.place, c.low && styles.low, c.main && styles.main)}
                    title={c.low ? `Low confidence. ${c.evidence ?? ''}`.trim() : (c.evidence ?? undefined)}
                  >
                    {c.label}
                    {c.main && <span className="visually-hidden"> (what the story is about)</span>}
                    {c.low && <span className={styles.lowNote}> · low confidence</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section} aria-labelledby={`${titleId}-source`}>
            <h3 id={`${titleId}-source`} className={styles.sectionTitle}>
              Source and times
            </h3>
            <p className={styles.note}>
              {a.viaDiscovery ? 'Found through the GDELT Project' : `From ${a.source.name}`}
              {a.alsoReportedBy > 0 &&
                ` · also reported by ${a.alsoReportedBy} ${a.alsoReportedBy === 1 ? 'other source' : 'other sources'}`}
              {!licensed && a.attribution && ` · ${a.attribution}`}
            </p>
            <dl className={styles.times}>
              <div>
                <dt>Published</dt>
                <dd>{a.publishedAt ? formatUtc(a.publishedAt) : 'not given by the source'}</dd>
              </div>
              <div>
                <dt>{a.viaDiscovery ? 'Found by GDELT' : 'First in the feed'}</dt>
                <dd>{formatUtc(a.discoveredAt)}</dd>
              </div>
              {a.ingestedAt && (
                <div>
                  <dt>Added to EastWire</dt>
                  <dd>{formatUtc(a.ingestedAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </dialog>
  )
}
