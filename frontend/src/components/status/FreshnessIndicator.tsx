import clsx from 'clsx'
import { Link } from 'react-router'
import type { FreshnessState, Status } from '../../api/types'
import { freshnessLabel, freshnessShort } from '../../lib/freshness'
import { formatUtc } from '../../lib/time'
import styles from './FreshnessIndicator.module.css'

/**
 * "Sources updated 12 min ago" with a state dot: when EastWire last checked its sources, not
 * how old any story is (each story shows its own date). Links to /status.
 */
export function FreshnessIndicator({ status, loading, now }: { status?: Status; loading: boolean; now?: Date }) {
  const state: FreshnessState | 'loading' = loading && !status ? 'loading' : (status?.state ?? 'unknown')
  return (
    <Link
      to="/status"
      className={styles.pill}
      title={status?.lastSuccessAt ? `All sources updated by ${formatUtc(status.lastSuccessAt)}` : undefined}
      aria-live="polite"
    >
      <span className={clsx(styles.dot, styles[state])} aria-hidden="true" />
      <span className={styles.full}>{freshnessLabel(status, loading, now)}</span>
      <span className={styles.short} aria-hidden="true">
        {freshnessShort(status, loading, now)}
      </span>
    </Link>
  )
}
