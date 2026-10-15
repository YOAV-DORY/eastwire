import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useSectors } from '../../api/queries'
import { SECTORS, sectorColor } from '../../sectors'
import { StoryArt } from '../front/StoryArt'
import styles from './SectorTiles.module.css'

/** The six sectors as artwork tiles, each with its count this week; one tap opens the sector. */
export function SectorTiles() {
  const sectors = useSectors()
  const counts = new Map((sectors.data?.sectors ?? []).map((s) => [s.slug, s.last7d]))
  return (
    <section aria-labelledby="sector-tiles-title" className={styles.section}>
      <h2 id="sector-tiles-title" className={styles.title}>
        Browse by sector
      </h2>
      <ul className={styles.tiles}>
        {SECTORS.map((s, i) => (
          <li key={s.id}>
            <Link to={`/sector/${s.id}`} className={styles.tile} style={{ ['--i' as string]: i }}>
              <StoryArt sector={s.id} tint={`color-mix(in srgb, ${sectorColor(s.id)} 45%, #17181c)`} seed={i} label={false} />
              <span className={styles.name}>
                <span className={styles.dot} style={{ background: sectorColor(s.id) }} aria-hidden="true" />
                {s.label}
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" className={styles.arrow} />
              </span>
              <span className={styles.count}>
                {counts.has(s.id) ? `${counts.get(s.id)} ${counts.get(s.id) === 1 ? 'story' : 'stories'} this week` : ' '}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.note}>Tiles are EastWire&apos;s own illustrations.</p>
    </section>
  )
}
