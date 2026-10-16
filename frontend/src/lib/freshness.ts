import type { Status } from '../api/types'
import { formatDate, relativeTime } from './time'

/**
 * The masthead's freshness text, for readers: when EastWire last refreshed its news (the newest
 * successful source check). It never claims the news itself is fresh (each story shows its own
 * date) and never reports internal failures; per-source health lives on the Sources page. Only
 * after six hours without any refresh does it change tone, and after a day it gives the date.
 */
export function freshnessLabel(status: Status | undefined, loading: boolean, now?: Date, failed = false): string {
  if (!status && failed) return 'Update time unavailable'
  if (loading && !status) return 'Loading…'
  if (!status || status.updateState === 'unknown' || !status.updatedAt) return 'Not updated yet'
  if (status.updateState === 'outage') return `Not updated since ${formatDate(status.updatedAt)}`
  return `Updated ${relativeTime(status.updatedAt, now)}`
}

/** The same, short enough for a phone's masthead. */
export function freshnessShort(status: Status | undefined, loading: boolean, now?: Date, failed = false): string {
  if (!status && failed) return 'Unavailable'
  if (loading && !status) return '…'
  if (!status || status.updateState === 'unknown' || !status.updatedAt) return 'Not yet'
  if (status.updateState === 'outage') return `Since ${formatDate(status.updatedAt)}`
  return relativeTime(status.updatedAt, now)
}
