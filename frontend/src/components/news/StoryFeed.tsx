import { useId, type ReactNode } from 'react'
import { useArticleFeed, type FeedFilters } from '../../api/queries'
import { useSlow } from '../../hooks/useSlow'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../status/Feedback'
import { Button } from '../ui/Button'
import { StoryCard } from './StoryCard'
import styles from './StoryFeed.module.css'

/**
 * The story list with every state handled: cold start, error, honest empty state, and
 * "Load more" (not infinite scroll, so the footer stays reachable).
 */
export function StoryFeed({
  filters,
  heading,
  countryNames,
  emptyTitle,
  emptyAction,
}: {
  filters: FeedFilters
  /** Mono label, e.g. "Latest · Japan"; the story count is appended. */
  heading: string
  countryNames: Record<string, string>
  emptyTitle: string
  emptyAction?: ReactNode
}) {
  const feed = useArticleFeed(filters)
  const slow = useSlow(feed.isLoading)
  const titleId = useId()
  const items = feed.data?.pages.flatMap((p) => p.items) ?? []
  const total = feed.data?.pages[0]?.total ?? 0

  return (
    <section aria-labelledby={titleId} className={styles.feed}>
      <h2 id={titleId} className={`${styles.title} mono muted`}>
        {heading}
        {feed.data && ` · ${total} ${total === 1 ? 'story' : 'stories'}`}
      </h2>

      {feed.isLoading && (
        <>
          {slow && <ColdStart />}
          <FeedSkeleton />
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
          This reflects our limited list of sources, not an absence of news.
        </EmptyState>
      )}

      {items.length > 0 && (
        <ol className={styles.list}>
          {items.map((a) => (
            <li key={a.id}>
              <StoryCard article={a} countryNames={countryNames} />
            </li>
          ))}
        </ol>
      )}

      {feed.hasNextPage && (
        <Button size="lg" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
          Load more
        </Button>
      )}
    </section>
  )
}
