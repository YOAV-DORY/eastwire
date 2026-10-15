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
import { Flag } from '../graphics/Flag'
import { sectorColor, type SectorId } from '../../sectors'
import { FeatureCard } from './FeatureCard'
import { mainCountry } from './storyCountry'
import { LeadStory } from './LeadStory'
import { ReadingList } from './ReadingList'
import { SecondaryStory } from './SecondaryStory'
import styles from './FrontPage.module.css'

/** Latest stories shown beside the rail; the next ones become the In focus cards; the rest are grouped. */
const TOP_LATEST = 5
const FEATURED = 4

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
  after,
}: {
  filters: FrontFilters
  /** Full-width content between the grouped stories and Reading (e.g. sector tiles). */
  after?: ReactNode
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
  const featured = data?.latest.slice(TOP_LATEST, TOP_LATEST + FEATURED) ?? []
  const more = data?.latest.slice(TOP_LATEST + FEATURED) ?? []
  // The rest of Latest under sub-headings: by country on a mixed page, by sector within one country.
  const groups = groupStories(more, filters.country ? 'sector' : 'country', countryNames)
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
        {/* The rail waits for the stories, so nothing below them jumps when they arrive. */}
        {rail && (data || front.isError) && (
          <aside className={styles.rail} aria-label="Map, countries and social posts">
            {rail}
          </aside>
        )}
      </div>

      {featured.length > 0 && (
        <section aria-labelledby="focus-title" className={styles.focus}>
          <h2 id="focus-title" className={clsx('kicker', styles.latestTitle)}>
            In focus
          </h2>
          <ol className={styles.cards}>
            {featured.map((a, i) => (
              <li key={a.id}>
                <FeatureCard article={a} index={i} countryNames={countryNames} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {groups.length > 0 && (
        <section aria-labelledby="more-title" className={styles.more}>
          <h2 id="more-title" className={clsx('kicker', styles.latestTitle)}>
            More from the last {data?.latestWindowHours} hours
          </h2>
          <div className={styles.groups}>
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`group-${g.key}`} className={styles.group}>
                <h3 id={`group-${g.key}`} className={styles.groupTitle}>
                  {g.flag && <Flag country={g.flag} size={20} />}
                  {g.dot && <span className={styles.groupDot} style={{ background: g.dot }} aria-hidden="true" />}
                  {g.label}
                  <span className={clsx('num', styles.groupCount)}>{g.items.length}</span>
                </h3>
                <StoryList items={g.items} countryNames={countryNames} onHighlight={onHighlight} highlighted={highlighted} />
              </section>
            ))}
          </div>
        </section>
      )}

      {after}

      {data && <ReadingList items={data.reading} from={data.readingFrom} to={data.readingTo} countryNames={countryNames} />}
    </>
  )
}

interface Group {
  key: string
  label: string
  items: ArticleView[]
  flag?: string
  dot?: string
}

/** Stories under sub-headings, biggest group first; stories with no country or sector go last. */
function groupStories(items: ArticleView[], by: 'country' | 'sector', countryNames: Record<string, string>): Group[] {
  const groups = new Map<string, Group>()
  for (const a of items) {
    const key = by === 'country' ? (mainCountry(a) ?? 'other') : (a.sectors[0]?.slug ?? 'other')
    if (!groups.has(key)) {
      groups.set(
        key,
        key === 'other'
          ? { key, label: by === 'country' ? 'Across the region' : 'Other stories', items: [] }
          : by === 'country'
            ? { key, label: countryNames[key] ?? key, flag: key, items: [] }
            : { key, label: a.sectors[0]!.label, dot: sectorColor(key as SectorId), items: [] },
      )
    }
    groups.get(key)!.items.push(a)
  }
  return [...groups.values()].sort((x, y) => (x.key === 'other' ? 1 : y.key === 'other' ? -1 : y.items.length - x.items.length))
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
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <Skeleton width="85%" height="1.2em" />
          <Skeleton width="40%" height="0.85em" />
        </div>
      ))}
    </div>
  )
}
