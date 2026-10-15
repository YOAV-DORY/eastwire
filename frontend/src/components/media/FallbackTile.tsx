import clsx from 'clsx'
import { SectorIcon } from '../graphics/SectorIcon'
import styles from './FallbackTile.module.css'

const NAMES: Record<string, string> = { CN: 'China', IN: 'India', JP: 'Japan', KR: 'South Korea' }
const TONES = ['red', 'ink', 'deep'] as const

/**
 * EastWire's own artwork for a story or page with no cleared photo: a brand-coloured tile with
 * the rising disc from the wordmark, the country's code and the sector's icon. Drawn here, so
 * no third-party rights; always labelled "Illustration", so it is never read as a photo.
 */
export function FallbackTile({
  country,
  sector,
  seed = 0,
  label = true,
  className,
}: {
  country?: string
  sector?: string
  seed?: number
  /** Show the "Illustration" tag (off only where a caption already says so). */
  label?: boolean
  className?: string
}) {
  const tone = TONES[Math.abs(seed) % TONES.length]
  return (
    <div className={clsx(styles.tile, styles[tone], className)} aria-hidden="true">
      <svg className={styles.disc} viewBox="0 0 100 100" preserveAspectRatio="xMaxYMax meet">
        <circle cx="70" cy="78" r="46" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" x2="100" y1={86 + i * 4} y2={86 + i * 4} />
        ))}
      </svg>
      <SectorIcon sector={sector} className={styles.icon} strokeWidth={1.5} size={48} />
      {country && NAMES[country] && <span className={styles.code}>{country}</span>}
      {label && <span className={styles.label}>Illustration</span>}
    </div>
  )
}
