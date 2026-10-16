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
 * "Updated 12 min ago": when EastWire last refreshed its news, with an icon and words in a
 * health colour (never the brand red). Calm unless nothing was refreshed for six hours. Links
 * to the Sources page's health section, where each source's own checks are listed.
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
  const state: Shown = status ? status.updateState : failed ? 'unavailable' : loading ? 'loading' : 'unknown'
  const Icon = ICON[state]
  return (
    <Link
      to="/sources#health"
      className={clsx(styles.pill, styles[state])}
      title={status?.updatedAt ? `News last refreshed ${formatUtc(status.updatedAt)}. Source details` : undefined}
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
