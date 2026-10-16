import type { FrontPage } from '../api/types'

/** Latest stories beside the rail; the next ones become the In focus cards; the rest are grouped. */
export const TOP_LATEST = 6
export const FEATURED = 4

/** The ids of the stories a front page shows above its groups: lead, the next two, Latest and In focus. */
export function prominentIds(data: FrontPage | undefined): Set<number> {
  if (!data) return new Set()
  return new Set([
    ...(data.lead ? [data.lead.article.id] : []),
    ...data.secondary.map((s) => s.article.id),
    ...data.latest.slice(0, TOP_LATEST + FEATURED).map((a) => a.id),
  ])
}

