/**
 * A social post's words without its link clutter: drops bare URLs, shortened links and
 * "Read more:" style lines, so cards show the sentence and the source sits on its own line.
 */
export function cleanPostText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/gi, '')
        .replace(/\b(?:read (?:more|here|the full story)|full story|link in bio|more)\s*:?\s*$/i, '')
        .replace(/\s+[….]{1,3}\s*$/, '')
        .trim(),
    )
    .filter((line) => line.length > 0)
    .join('\n')
    .trim()
}

/** "scroll.in" from a post's link, for the source line. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Two letters for a source badge: "Scroll" → "Sc", "The Diplomat" → "TD". */
export function initials(name: string): string {
  const words = name.replace(/^the\s+/i, 'The ').split(/\s+/).filter(Boolean)
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2)
}
