/** "12 min ago", "3 h ago", "2 d ago": compact, for mono metadata labels. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return formatDate(iso)
}

/** "13 Oct 2026", in UTC so every reader sees the same date. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  )
}

/** "13 Oct 2026, 11:30 UTC": the exact time, shown as a tooltip. */
export function formatUtc(iso: string): string {
  const d = new Date(iso)
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(d)
  return `${formatDate(iso)}, ${time} UTC`
}

/**
 * When a story was published, for its card: "35 min ago" today, "Yesterday", then a date
 * ("9 Oct"; with the year if it is not this year). A story's own date, never the site's.
 */
export function storyDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const hours = (now.getTime() - d.getTime()) / 3_600_000
  if (hours < 24) return relativeTime(iso, now)
  if (hours < 48) return 'Yesterday'
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear()
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(d)
}
