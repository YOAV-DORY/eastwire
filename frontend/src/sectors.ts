import type { SectorRule } from './api/types'

/** The six sectors. Their rules live in config/sectors.yaml and come from GET /api/v1/sectors. */
export const SECTORS = [
  { id: 'economy', label: 'Economy' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
] as const

export type SectorId = (typeof SECTORS)[number]['id']

export const isSectorId = (value: string | null | undefined): value is SectorId =>
  SECTORS.some((s) => s.id === value)

export const sectorLabel = (id: SectorId) => SECTORS.find((s) => s.id === id)!.label

/** The sector's dot color from tokens.css; adapts to the current theme. */
export const sectorColor = (id: string) => `var(--sector-${id})`

/** "+3", "+1.5", "−3": what a rule added to the score. */
export function formatWeight(weight: number): string {
  const n = Number.isInteger(weight) ? String(Math.abs(weight)) : Math.abs(weight).toFixed(1)
  return weight < 0 ? `−${n}` : `+${n}`
}

/** One matched rule in plain words, e.g. “inflation” in the headline. */
export function describeRule(rule: SectorRule): string {
  switch (rule.kind) {
    case 'keyword':
      return `“${rule.value}” in the ${rule.field ?? 'text'}`
    case 'negative':
      return `“${rule.value}” in the ${rule.field ?? 'text'} (not this sector)`
    case 'gdelt_theme':
      return `GDELT theme ${rule.value}`
    case 'feed_category':
      return `Filed under “${rule.value}” by the publisher`
  }
}
