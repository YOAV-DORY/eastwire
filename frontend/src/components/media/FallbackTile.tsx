import clsx from 'clsx'
import { SectorIcon } from '../graphics/SectorIcon'
import styles from './FallbackTile.module.css'

const NAMES: Record<string, string> = { CN: 'China', IN: 'India', JP: 'Japan', KR: 'South Korea' }
const SECTOR_LABEL: Record<string, string> = {
  economy: 'Economy',
  geopolitics: 'Geopolitics',
  technology: 'Technology',
  business: 'Business',
  society: 'Society',
  environment: 'Environment',
}

/**
 * EastWire's graphic card for a story with no photo that truly matches it: one consistent
 * design, never a stand-in photograph. A neutral surface with a faint grid, the sector's icon,
 * the source's name, and the country as a small colour marker (the only place country colours
 * appear). Drawn here, so no third-party rights, and plainly not a photo of anything.
 */
export function FallbackTile({
  country,
  sector,
  source,
  className,
}: {
  country?: string
  sector?: string
  /** The publisher's name, shown at the foot of the card. */
  source?: string
  /** Kept for older call sites; the card is the same for every story. */
  seed?: number
  label?: boolean
  className?: string
}) {
  return (
    <div className={clsx(styles.tile, className)} data-country={country} aria-hidden="true">
      {country && NAMES[country] && <span className={styles.word}>{NAMES[country]}</span>}
      <span className={styles.ghost}>
        <SectorIcon sector={sector} strokeWidth={0.75} />
      </span>
      <span className={styles.icon}>
        <SectorIcon sector={sector} strokeWidth={1.25} />
      </span>
      <span className={styles.foot}>
        {country && NAMES[country] && (
          <span className={styles.country}>
            <span className={styles.marker} />
            {NAMES[country]}
          </span>
        )}
        {sector && SECTOR_LABEL[sector] && <span className={styles.sector}>{SECTOR_LABEL[sector]}</span>}
        {source && <span className={styles.source}>{source}</span>}
      </span>
    </div>
  )
}
