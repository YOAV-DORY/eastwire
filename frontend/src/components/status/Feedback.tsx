import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate, formatUtc, relativeTime } from '../../lib/time'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import styles from './Feedback.module.css'

/** Honest "nothing here": says what is missing and why, never shows placeholder stories. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.box} role="status">
      <svg className={styles.mark} width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a8 8 0 0 1 8 8c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 8-8Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <p className={styles.title}>{title}</p>
      <p className="muted">{children}</p>
      {action}
    </div>
  )
}

/** A request that gave up (after about 90 seconds at most), with a retry button. */
export function ErrorState({
  message,
  onRetry,
  title = 'Couldn’t load stories',
  retrying = false,
}: {
  message: string
  onRetry: () => void
  title?: string
  retrying?: boolean
}) {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.title}>{title}</p>
      <p className="muted">{message}</p>
      <Button onClick={onRetry} loading={retrying}>
        Try again
      </Button>
    </div>
  )
}

/**
 * Shown only when there is nothing at all to show yet (no snapshot, no saved copy) and the live
 * request is taking a while. Neutral wording: the reader needs to know stories are coming, not
 * how the hosting works.
 */
export function ColdStart() {
  return (
    <p className={styles.cold} role="status">
      <span className={styles.coldDot} aria-hidden="true" />
      <span>Loading the latest stories. This can take a little longer than usual.</span>
    </p>
  )
}

/**
 * "Updated 25 min ago": when the stories on screen were fetched. Neutral and small; it is the
 * only sign that a snapshot is showing because the live request has not answered (yet).
 */
export function UpdatedLabel({ at, now, className }: { at: number | string; now?: Date; className?: string }) {
  const iso = typeof at === 'number' ? new Date(at).toISOString() : at
  return (
    <span className={className}>
      Updated{' '}
      <time dateTime={iso} title={formatUtc(iso)} className="num">
        {relativeTime(iso, now)}
      </time>
    </span>
  )
}

/** Story-shaped placeholders: a headline, its line and a summary, so nothing jumps when stories arrive. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.skeletons} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonStory}>
          <Skeleton width="88%" height="1.35em" />
          <Skeleton width="55%" height="1.35em" />
          <Skeleton width="38%" height="0.85em" />
          <Skeleton width="70%" height="0.95em" />
        </div>
      ))}
    </div>
  )
}

/**
 * Shown on the home page only when the news was not refreshed for six hours or more, in a
 * reader's words; which source is behind, and why, is on the Sources page.
 */
export function StaleBanner({ state, since, now }: { state: 'stale' | 'outage'; since: string; now?: Date }) {
  return (
    <div className={styles.banner} role="status" data-state={state}>
      {state === 'stale'
        ? `Our news was last refreshed ${relativeTime(since, now)}, so the newest stories may be missing. `
        : `Our news has not been refreshed since ${formatDate(since)}. `}
      <Link to="/sources#health">Source details</Link>
    </div>
  )
}
