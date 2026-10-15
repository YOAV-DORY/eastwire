/**
 * A display accent for a social post, from words in its own text: conflict, economy, climate
 * or politics. It only chooses how the card looks (and its small topic label); it never
 * filters, ranks or hides a post. Checked in order, first match wins.
 */
export type PostTopic = 'conflict' | 'economy' | 'climate' | 'politics' | null

const RULES: [Exclude<PostTopic, null>, RegExp][] = [
  ['conflict', /(?:#\w*war\b)|\b(war|wars|fighting|soldiers?|weapons?|died while fighting|military|missile|missiles|army|troops|strike|strikes|attack|attacks|killed|clash(?:es)?|ceasefire|conflict|border|drone|drones|bomb(?:ing)?|navy|nuclear|insurgen\w*|militant\w*|shell(?:ing)?)\b/i],
  ['economy', /\b(econom\w*|gdp|inflation|tariff\w*|trade|market|markets|stocks?|rupee|yen|yuan|won|bank|banks|budget|tax|taxes|exports?|imports?|investment|investors?|jobs|unemployment|prices?)\b/i],
  ['climate', /\b(climate|heat ?waves?|flood\w*|drought|monsoon|cyclone|typhoon|emissions?|carbon|pollution|wildfires?|glaciers?|renewable\w*|solar|coal|environment\w*|weather)\b/i],
  ['politics', /\b(election\w*|vote\w*|parliament|minister\w*|government|president|court|supreme court|law|bill|party|parties|opposition|protest\w*|policy|diplomat\w*|summit|sanctions?)\b/i],
]

export const TOPIC_LABEL: Record<Exclude<PostTopic, null>, string> = {
  conflict: 'Conflict',
  economy: 'Economy',
  climate: 'Climate',
  politics: 'Politics',
}

export function postTopic(text: string | null | undefined): PostTopic {
  if (!text) return null
  return RULES.find(([, re]) => re.test(text))?.[0] ?? null
}
