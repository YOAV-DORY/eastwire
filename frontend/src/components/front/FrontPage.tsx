import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useFront, type FrontFilters } from '../../api/queries'
import type { ArticleView } from '../../api/types'
import { useSlow } from '../../hooks/useSlow'
import { isSavedCopy } from '../../lib/savedCopy'
import { StoryCard } from '../news/StoryCard'
import { ColdStart, EmptyState, ErrorState, SavedCopyNotice } from '../status/Feedback'
import { Skeleton } from '../ui/Skeleton'
import { LeadStory } from './LeadStory'
import { ReadingList } from './ReadingList'
import { SecondaryStory } from './SecondaryStory'
import styles from './FrontPage.module.css'

/** Latest stories shown beside the rail; the rest go full width below it. */
const TOP_LATEST = 6

/**
 * A ranked front page: lead, two secondaries and the start of Latest beside an optional rail,
 * then the rest of Latest and the dated Reading section across the full width, so the page
 * never runs on beside an empty rail. Every state is bounded: a saved copy with its time while
 * refreshing, a cold-start note with elapsed seconds, and an error with a retry after ~90 s.
 */
export function FrontPage({
  filters,
  countryNames,
  rail,
  emptyTitle,
  emptyAction,
  onHighlight,
  highlightedPlace,
}: {
  filters: FrontFilters
  countryNames: Record<string, string>
  rail?: ReactNode
  emptyTitle: string
  emptyAction?: ReactNode
  onHighlight?: (placeId: number | null) => void
  highlightedPlace?: number | null
}) {
  const front = useFront(filters)
  const data = front.data
  const loading = front.isPending
  const slow = useSlow(loading)
  const saved = data !== undefined && isSavedCopy(front.dataUpdatedAt)

  const highlighted = (a: ArticleView) =>
    highlightedPlace != null && a.locations.some((l) => l.primary && l.placeId === highlightedPlace)
  const top = data?.latest.slice(0, TOP_LATEST) ?? []
  const more = data?.latest.slice(TOP_LATEST) ?? []
  const nothingNew = data !== undefined && !data.lead && data.latest.length === 0

  return (
    <>
      {saved && (front.isFetching || front.isError) && (
        <SavedCopyNotice
          savedAt={front.dataUpdatedAt}
          refreshing={front.isFetching}
          failed={front.isError && !front.isFetching}
          onRetry={() => void front.refetch()}
        />
      )}

      <div className={clsx(styles.top, rail && styles.withRail)}>
        <div className={styles.main} aria-busy={loading}>
          {loading && (
            <>
              {slow && <ColdStart />}
              <LeadSkeleton />
            </>
          )}
          {front.isError && !data && (
            <ErrorState
              message="The server did not answer within about 90 seconds. It may be waking up or temporarily down."
              onRetry={() => void front.refetch()}
              retrying={front.isFetching}
            />
          )}

          {nothingNew && (
            <EmptyState title={emptyTitle} action={emptyAction}>
              No reported news from our sources in the last {data.latestWindowHours} hours. That reflects our short list
              of permitted sources, not an absence of news. <Link to="/about#gaps">Coverage gaps</Link>
            </EmptyState>
          )}

          {data?.lead && (
            <LeadStory story={data.lead} countryNames={countryNames} onHighlight={onHighlight} />
          )}

          {data && data.secondary.length > 0 && (
            <ol className={styles.secondary} aria-label="Also leading">
              {data.secondary.map((s) => (
                <li key={s.article.id}>
                  <SecondaryStory
                    story={s}
                    countryNames={countryNames}
                    onHighlight={onHighlight}
                    highlighted={highlighted(s.article)}
                  />
                </li>
              ))}
            </ol>
          )}

          {data && (top.length > 0 || data.lead) && (
            <section aria-labelledby="latest-title" className={styles.latest}>
              <h2 id="latest-title" className={clsx('kicker', styles.latestTitle)}>
                Latest
                <span className="num">
                  {' '}
                  · {data.latestCount} {data.latestCount === 1 ? 'story' : 'stories'} from the last {data.latestWindowHours}{' '}
                  hours
                </span>
              </h2>
              <p className={styles.latestNote}>
                Ordered by <Link to="/about#ranking">our ranking rules</Link>; each story shows its own time.
              </p>
              {top.length > 0 && <StoryList items={top} countryNames={countryNames} onHighlight={onHighlight} highlighted={highlighted} />}
            </section>
          )}
        </div>
        {rail && (
          <aside className={styles.rail} aria-label="Map, countries and social posts">
            {rail}
          </aside>
        )}
      </div>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className={styles.more}>
          <h2 id="more-title" className={clsx('kicker', styles.latestTitle)}>
            More from the last {data?.latestWindowHours} hours
          </h2>
          <StoryList items={more} countryNames={countryNames} onHighlight={onHighlight} highlighted={highlighted} columns />
        </section>
      )}

      {data && <ReadingList items={data.reading} from={data.readingFrom} to={data.readingTo} countryNames={countryNames} />}
    </>
  )
}

function StoryList({
  items,
  countryNames,
  onHighlight,
  highlighted,
  columns = false,
}: {
  items: ArticleView[]
  countryNames: Record<string, string>
  onHighlight?: (placeId: number | null) => void
  highlighted: (a: ArticleView) => boolean
  columns?: boolean
}) {
  return (
    <ol className={clsx(styles.list, columns && styles.columns)}>
      {items.map((a) => (
        <li key={a.id}>
          <StoryCard
            article={a}
            variant="compact"
            countryNames={countryNames}
            onHighlight={onHighlight}
            highlighted={highlighted(a)}
          />
        </li>
      ))}
    </ol>
  )
}

/** The lead's shape while loading: an ink panel with headline-sized bars, so nothing jumps. */
function LeadSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonLead}>
        <Skeleton width="30%" height="0.8em" />
        <Skeleton width="92%" height="1.9em" />
        <Skeleton width="70%" height="1.9em" />
        <Skeleton width="40%" height="0.9em" />
      </div>
      <div className={styles.skeletonRow}>
        <Skeleton width="100%" height="5em" />
        <Skeleton width="100%" height="5em" />
      </div>
    </div>
  )
}
