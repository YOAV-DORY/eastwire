import type { Status } from '../api/types'
import { formatDate, relativeTime } from './time'

/**
 * The masthead's source-health text. It reports when EastWire last checked its sources
 * successfully, never that the news is fresh: a check can succeed and find nothing new, and
 * each story shows its own date. The colour and icon are never the only signal.
 */
export function freshnessLabel(status: Status | undefined, loading: boolean, now?: Date, failed = false): string {
  if (!status && failed) return 'Source status unavailable'
  if (loading && !status) return 'Checking sources…'
  if (!status || status.state === 'unknown' || !status.lastSuccessAt) return 'No source check yet'
  const ago = relativeTime(status.lastSuccessAt, now)
  switch (status.state) {
    case 'fresh':
      return `Sources checked ${ago}`
    case 'stale':
      return `Behind · last full check ${ago}`
    case 'outage':
      return `Source checks failing · last success ${formatDate(status.lastSuccessAt)}`
  }
}

/** The same, short enough for a phone's masthead: the icon carries the state, the time the rest. */
export function freshnessShort(status: Status | undefined, loading: boolean, now?: Date, failed = false): string {
  if (!status && failed) return 'Unavailable'
  if (loading && !status) return 'Checking…'
  if (!status || status.state === 'unknown' || !status.lastSuccessAt) return 'Not checked'
  if (status.state === 'outage') return 'Failing'
  return relativeTime(status.lastSuccessAt, now)
}
