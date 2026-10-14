import clsx from 'clsx'
import { useId, type ReactNode } from 'react'
import { useArticleFeed, type FeedFilters } from '../../api/queries'
import type { ArticleView } from '../../api/types'
import { useSlow } from '../../hooks/useSlow'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../status/Feedback'
import { Button } from '../ui/Button'
import { StoryCard } from './StoryCard'
import styles from './StoryFeed.module.css'

/** How many stories after the lead get the full treatment on the front page. */
const FRONT_STANDARD = 4

/**
 * The story list with every state handled: cold start, error, honest empty state, and
 * "Load more" (not infinite scroll, so the footer stays reachable).
 *
 * layout "front": one lead story, a band of standard stories, then a compact list.
 * layout "list": standard stories throughout.
 */
export function StoryFeed({
  filters,
  heading,
  countryNames,
  emptyTitle,
  emptyAction,
  layout = 'list',
  hideHeading = false,
  onHighlight,
  highlightedPlace,
}: {
  filters: FeedFilters
  /** Section label, e.g. "Latest · Japan"; the story count is appended. */
  heading: string
  countryNames: Record<string, string>
  emptyTitle: string
  emptyAction?: ReactNode
  layout?: 'front' | 'list'
  hideHeading?: boolean
  onHighlight?: (placeId: number | null) => void
  highlightedPlace?: number | null
}) {
  const feed = useArticleFeed(filters)
  const slow = useSlow(feed.isLoading)
  const titleId = useId()
  const items = feed.data?.pages.flatMap((p) => p.items) ?? []
  const total = feed.data?.pages[0]?.total ?? 0

  const card = (a: ArticleView, variant: 'lead' | 'standard' | 'compact') => (
    <StoryCard
      article={a}
      variant={variant}
      countryNames={countryNames}
      onHighlight={onHighlight}
      highlighted={highlightedPlace != null && a.locations.some((l) => l.primary && l.placeId === highlightedPlace)}
    />
  )

  return (
    <section aria-labelledby={titleId} className={styles.feed}>
      <h2 id={titleId} className={clsx('kicker', styles.title, hideHeading && 'visually-hidden')}>
        {heading}
        {feed.data && <span className="num"> · {total} {total === 1 ? 'story' : 'stories'}</span>}
      </h2>

      {feed.isLoading && (
        <>
          {slow && <ColdStart />}
          <FeedSkeleton count={layout === 'front' ? 4 : 3} />
        </>
      )}

      {feed.isError && !feed.data && (
        <ErrorState
          message="The server did not answer. It may be waking up or temporarily down."
          onRetry={() => void feed.refetch()}
        />
      )}

      {feed.data && items.length === 0 && (
        <EmptyState title={emptyTitle} action={emptyAction}>
          This reflects our short list of sources, not an absence of news.
        </EmptyState>
      )}

      {items.length > 0 && layout === 'front' && (
        <>
          <div className={styles.lead}>{card(items[0], 'lead')}</div>
          {items.length > 1 && (
            <ol className={styles.band} aria-label="Top stories">
              {items.slice(1, 1 + FRONT_STANDARD).map((a) => (
                <li key={a.id}>{card(a, 'standard')}</li>
              ))}
            </ol>
          )}
          {items.length > 1 + FRONT_STANDARD && (
            <>
              <h3 className={clsx('kicker', styles.moreTitle)}>More stories</h3>
              <ol className={styles.list}>
                {items.slice(1 + FRONT_STANDARD).map((a) => (
                  <li key={a.id}>{card(a, 'compact')}</li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      {items.length > 0 && layout === 'list' && (
        <ol className={styles.list}>
          {items.map((a) => (
            <li key={a.id}>{card(a, 'standard')}</li>
          ))}
        </ol>
      )}

      {feed.hasNextPage && (
        <Button size="lg" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
          Load more stories
        </Button>
      )}
    </section>
  )
}
