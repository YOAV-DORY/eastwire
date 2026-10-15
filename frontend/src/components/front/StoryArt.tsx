import clsx from 'clsx'
import { Briefcase, Cpu, Landmark, Leaf, Newspaper, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import styles from './StoryArt.module.css'

/**
 * EastWire's own artwork for a story or a sector that has no rights-cleared photo: a flat
 * country motif (Japan's sun, Korea's divided circle, India's wheel, China's stars) on a
 * muted country tone, with the sector's icon. Drawn here, so no third-party rights; always
 * labelled "Illustration" so it is never read as a photo of the story.
 */
const COUNTRY: Record<string, { base: string; motif: string; name: string }> = {
  JP: { base: '#2c3550', motif: '#e8505b', name: 'Japan' },
  KR: { base: '#24394f', motif: '#d9dee6', name: 'South Korea' },
  IN: { base: '#5a3a22', motif: '#f0a548', name: 'India' },
  CN: { base: '#5b2524', motif: '#f2c14e', name: 'China' },
}
const NEUTRAL = { base: '#2b2b30', motif: '#ff90e8', name: '' }

const SECTOR_ICON: Record<string, LucideIcon> = {
  economy: TrendingUp,
  geopolitics: Landmark,
  technology: Cpu,
  business: Briefcase,
  society: Users,
  environment: Leaf,
}

function Motif({ country, color, seed }: { country?: string; color: string; seed: number }) {
  const x = 104 + (seed % 3) * 14
  const y = 44 + (seed % 2) * 12
  switch (country) {
    case 'JP':
      return <circle cx={x} cy={y} r="30" fill={color} />
    case 'KR':
      return (
        <g transform={`translate(${x} ${y}) rotate(${(seed % 4) * 20 - 30})`}>
          <path d="M-28 0a28 28 0 0 1 56 0a14 14 0 0 1-28 0a14 14 0 0 0-28 0Z" fill="#c8434f" />
          <path d="M28 0a28 28 0 0 1-56 0a14 14 0 0 1 28 0a14 14 0 0 0 28 0Z" fill="#3a6cb4" />
        </g>
      )
    case 'IN':
      return (
        <g transform={`translate(${x} ${y})`} stroke={color} fill="none" strokeWidth="2.2">
          <circle r="28" />
          <circle r="5" fill={color} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6
            return <line key={i} x1={Math.cos(a) * 6} y1={Math.sin(a) * 6} x2={Math.cos(a) * 27} y2={Math.sin(a) * 27} />
          })}
        </g>
      )
    case 'CN':
      return (
        <g fill={color}>
          {[0, 1, 2, 3, 4].map((i) => {
            const r = i === 0 ? 13 : 5
            const cx = i === 0 ? x - 6 : x + 18 + (i % 2) * 6
            const cy = i === 0 ? y : y - 22 + i * 10
            const pts = Array.from({ length: 10 }, (_, k) => {
              const a = -Math.PI / 2 + (k * Math.PI) / 5
              const rr = k % 2 === 0 ? r : r * 0.42
              return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
            }).join(' ')
            return <polygon key={i} points={pts} />
          })}
        </g>
      )
    default:
      return <circle cx={x} cy={y} r="26" fill="none" stroke={color} strokeWidth="2" opacity="0.7" />
  }
}

export function StoryArt({
  country,
  sector,
  seed = 0,
  label = true,
  tint,
  className,
}: {
  country?: string
  sector?: string
  seed?: number
  /** A base colour instead of the country's (sector tiles use their sector's colour). */
  tint?: string
  /** Show the "Illustration" tag (on by default; off only where a caption already says so). */
  label?: boolean
  className?: string
}) {
  const found = (country && COUNTRY[country]) || NEUTRAL
  const palette = tint ? { ...found, base: tint } : found
  const Icon = (sector && SECTOR_ICON[sector]) || Newspaper
  return (
    <div className={clsx(styles.art, className)} style={{ background: palette.base }} aria-hidden="true">
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={styles.svg}>
        <rect width="160" height="100" fill={palette.base} />
        {/* A faint horizon line, so tiles read as a set. */}
        <line x1="0" y1="78" x2="160" y2="78" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <Motif country={country} color={palette.motif} seed={seed} />
      </svg>
      <Icon className={styles.icon} strokeWidth={1.5} />
      {label && <span className={styles.label}>Illustration</span>}
    </div>
  )
}
