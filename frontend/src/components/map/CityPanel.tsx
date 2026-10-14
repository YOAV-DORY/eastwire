import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useArticleFeed } from '../../api/queries'
import type { CityPin, PlaceView } from '../../api/types'
import { formatCoords, formatPopulation } from '../../lib/map'
import { formatUtc, relativeTime } from '../../lib/time'
import { StoryCard } from '../news/StoryCard'
import { EmptyState, ErrorState, FeedSkeleton } from '../status/Feedback'
import { ButtonLink } from '../ui/Button'
import styles from './CityPanel.module.css'

/**
 * One city: where it is, how many stories are placed here in each role, and those stories.
 * Works for cities without stories too (honest empty state).
 */
export function CityPanel({
  place,
  pin,
  countryNames,
  onClose,
}: {
  place: PlaceView
  pin?: CityPin
  countryNames: Record<string, string>
  onClose: () => void
}) {
  const feed = useArticleFeed({ country: place.country, city: String(place.id) })
  const items = feed.data?.pages[0]?.items ?? []
  const ref = useRef<HTMLElement>(null)
  const opened = useRef(false)

  // Below 1024px the panel sits under the map, so a tapped pin would look like it did nothing.
  // A shared city link jumps straight there; later pin taps glide unless motion is reduced.
  useEffect(() => {
    const first = !opened.current
    opened.current = true
    if (typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 1023px)').matches) return
    const smooth = !first && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }, [place.id])

  return (
    <section ref={ref} className={styles.panel} aria-labelledby="city-title">
      <header className={styles.header}>
        <div>
          <h2 id="city-title" className={styles.title}>
            {place.name}
          </h2>
          <p className="mono muted">
            {countryNames[place.country] ?? place.country} · {formatCoords(place.lat, place.lon)}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close city panel">
          <X size={18} strokeWidth={2} />
        </button>
      </header>

      <dl className={`${styles.counts} mono`}>
        <div>
          <dt className="muted">Mentioned</dt>
          <dd>{pin?.mentioned ?? 0}</dd>
        </div>
        <div>
          <dt className="muted">Dateline</dt>
          <dd>{pin?.event ?? 0}</dd>
        </div>
        <div>
          <dt className="muted">Publisher</dt>
          <dd>{pin?.publisher ?? 0}</dd>
        </div>
      </dl>
      <p className="mono muted">
        {pin ? (
          <>
            Last item seen{' '}
            <time dateTime={pin.lastItemAt} title={formatUtc(pin.lastItemAt)}>
              {relativeTime(pin.lastItemAt)}
            </time>
          </>
        ) : (
          'No stories placed here in this time window'
        )}
        {place.population > 0 && ` · population ${formatPopulation(place.population)} (GeoNames)`}
      </p>

      {feed.isLoading && <FeedSkeleton count={2} />}
      {feed.isError && <ErrorState message="Stories for this city are unavailable." onRetry={() => void feed.refetch()} />}
      {feed.data && items.length === 0 && (
        <EmptyState title={`Nothing from our sources for ${place.name} right now`}>
          This reflects our limited list of sources, not an absence of news.
        </EmptyState>
      )}
      {items.length > 0 && (
        <ol className={styles.list}>
          {items.slice(0, 10).map((a) => (
            <li key={a.id}>
              <StoryCard article={a} countryNames={countryNames} />
            </li>
          ))}
        </ol>
      )}
      <ButtonLink href={`/?country=${place.country}&city=${place.id}`}>All stories for {place.name}</ButtonLink>
    </section>
  )
}
