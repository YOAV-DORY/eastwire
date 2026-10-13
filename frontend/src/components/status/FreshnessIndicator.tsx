import clsx from 'clsx'
import { Link } from 'react-router'
import type { FreshnessState, Status } from '../../api/types'
import { freshnessLabel } from '../../lib/freshness'
import { formatUtc } from '../../lib/time'
import styles from './FreshnessIndicator.module.css'

/** "Updated 12 min ago" with a state dot. Links to /status. The dot is never the only signal. */
export function FreshnessIndicator({ status, loading, now }: { status?: Status; loading: boolean; now?: Date }) {
  const state: FreshnessState | 'loading' = loading && !status ? 'loading' : (status?.state ?? 'unknown')
  return (
    <Link
      to="/status"
      className={clsx(styles.pill, 'mono')}
      title={status?.lastSuccessAt ? `All sources updated by ${formatUtc(status.lastSuccessAt)}` : undefined}
      aria-live="polite"
    >
      <span className={clsx(styles.dot, styles[state])} aria-hidden="true" />
      {freshnessLabel(status, loading, now)}
    </Link>
  )
}
