/**
 * The longest start of `text` that fits in `maxWidth`, cut only between words and marked with an
 * ellipsis when shortened. A single word too long for the space is shown whole (the box clips it)
 * rather than broken.
 */
export function fitWords(text: string, maxWidth: number, measure: (s: string) => number): string {
  if (maxWidth <= 0 || measure(text) <= maxWidth) return text
  const words = text.split(/\s+/).filter(Boolean)
  let lo = 1
  let hi = words.length - 1
  let best = 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (measure(trimmed(words, mid)) <= maxWidth) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return trimmed(words, best)
}

function trimmed(words: string[], n: number): string {
  // Trailing punctuation before the ellipsis reads badly ("Seoul, …"), so it goes.
  return words.slice(0, n).join(' ').replace(/[\s,;:–—-]+$/u, '') + '…'
}
