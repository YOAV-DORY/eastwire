import clsx from 'clsx'
import { CircleAlert, CircleCheck, CircleDashed, CircleX } from 'lucide-react'
import { Link } from 'react-router'
import type { FreshnessState, Status } from '../../api/types'
import { freshnessLabel, freshnessShort } from '../../lib/freshness'
import { formatUtc } from '../../lib/time'
import styles from './FreshnessIndicator.module.css'

type Shown = FreshnessState | 'loading' | 'unavailable'

const ICON = {
  fresh: CircleCheck,
  stale: CircleAlert,
  outage: CircleX,
  unknown: CircleDashed,
  loading: CircleDashed,
  unavailable: CircleX,
} as const

/**
 * "Sources checked 12 min ago": when EastWire last checked its sources successfully, in a
 * health colour with an icon and words (never the brand red). Not how old any story is:
 * each story shows its own date. Links to /status, which separates checks from story times.
 */
export function FreshnessIndicator({
  status,
  loading,
  failed = false,
  now,
}: {
  status?: Status
  loading: boolean
  failed?: boolean
  now?: Date
}) {
  const state: Shown = status ? status.state : failed ? 'unavailable' : loading ? 'loading' : 'unknown'
  const Icon = ICON[state]
  return (
    <Link
      to="/status"
      className={clsx(styles.pill, styles[state])}
      title={status?.lastSuccessAt ? `Every source checked successfully by ${formatUtc(status.lastSuccessAt)}` : undefined}
      aria-live="polite"
    >
      <Icon className={styles.icon} size={16} strokeWidth={2} aria-hidden="true" />
      <span className={styles.full}>{freshnessLabel(status, loading, now, failed)}</span>
      <span className={styles.short} aria-hidden="true">
        {freshnessShort(status, loading, now, failed)}
      </span>
    </Link>
  )
}
