/** The six sectors (rules live in config/sectors.yaml from milestone 7). */
export const SECTORS = [
  { id: 'economy', label: 'Economy' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
] as const

export type SectorId = (typeof SECTORS)[number]['id']

/** The sector's dot color from tokens.css; adapts to the current theme. */
export const sectorColor = (id: SectorId) => `var(--sector-${id})`
