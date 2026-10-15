import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatUtc, relativeTime } from '../../lib/time'
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

/** Seconds since {@code active} became true, ticking once a second; 0 when inactive. */
function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0)
  const start = useRef(0)
  useEffect(() => {
    if (!active) return
    start.current = Date.now()
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - start.current) / 1000)), 1000)
    return () => {
      clearInterval(timer)
      setSeconds(0)
    }
  }, [active])
  return seconds
}

/**
 * Shown while the free-tier server wakes up (it sleeps after 15 idle minutes). Says how long
 * it has been and how long it can take; the request gives up and offers a retry at about 90 s.
 */
export function ColdStart() {
  const seconds = useElapsedSeconds(true)
  return (
    <p className={styles.cold} role="status">
      <span className={styles.coldDot} aria-hidden="true" />
      <span>
        Waking the free-tier server. This can take up to a minute and a half.{' '}
        <span className={styles.elapsed} aria-hidden="true">
          {seconds} s
        </span>
      </span>
    </p>
  )
}

/**
 * Real data from an earlier visit is on screen, with its time, while a fresh copy loads or
 * after the fresh request failed. Never presented as live.
 */
export function SavedCopyNotice({
  savedAt,
  refreshing,
  failed,
  onRetry,
  now,
}: {
  savedAt: number
  refreshing: boolean
  failed: boolean
  onRetry: () => void
  now?: Date
}) {
  const iso = new Date(savedAt).toISOString()
  return (
    <div className={styles.saved} role="status" data-state={failed ? 'failed' : 'refreshing'}>
      <p>
        <strong>Saved copy</strong> from{' '}
        <time dateTime={iso} title={formatUtc(iso)}>
          {relativeTime(iso, now)}
        </time>
        , kept on this device.{' '}
        {failed
          ? 'The server did not answer, so these may not be the latest stories.'
          : refreshing
            ? 'Checking for newer stories…'
            : null}
      </p>
      {failed && (
        <Button size="md" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
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

export function StaleBanner({ state, detail }: { state: 'stale' | 'outage'; detail: string }) {
  return (
    <div className={styles.banner} role="status" data-state={state}>
      {state === 'stale'
        ? 'Some source checks have not succeeded for over two hours. '
        : 'Source checks have failed for over a day. '}
      <span className="muted">{detail}</span>
    </div>
  )
}
