import type { ReactNode } from 'react'
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

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.box} role="alert">
      <p className={styles.title}>Couldn&apos;t load stories</p>
      <p className="muted">{message}</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  )
}

/** Shown while the free-tier server wakes up (it sleeps after 15 idle minutes). */
export function ColdStart() {
  return (
    <p className={styles.cold} role="status">
      <span className={styles.coldDot} aria-hidden="true" />
      Waking the free-tier server. The first visit after a quiet spell can take up to a minute.
    </p>
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
      {state === 'stale' ? 'Some sources have not updated for over two hours. ' : 'Our sources have been offline for over a day. '}
      <span className="muted">{detail}</span>
    </div>
  )
}
