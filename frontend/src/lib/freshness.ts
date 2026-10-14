import type { Status } from '../api/types'
import { formatDate, relativeTime } from './time'

/** The freshness indicator's text. The state dot is never the only signal. */
export function freshnessLabel(status: Status | undefined, loading: boolean, now?: Date): string {
  if (loading && !status) return 'Checking…'
  if (!status || status.state === 'unknown' || !status.lastSuccessAt) return 'No update yet'
  const ago = relativeTime(status.lastSuccessAt, now)
  switch (status.state) {
    case 'fresh':
      return `Sources updated ${ago}`
    case 'stale':
      return `Stale · sources updated ${ago}`
    case 'outage':
      return `Sources offline · last update ${formatDate(status.lastSuccessAt)}`
  }
}

/** The same, short enough for a phone's masthead. */
export function freshnessShort(status: Status | undefined, loading: boolean, now?: Date): string {
  if (loading && !status) return '…'
  if (!status || status.state === 'unknown' || !status.lastSuccessAt) return 'No update'
  if (status.state === 'outage') return 'Offline'
  return relativeTime(status.lastSuccessAt, now)
}
