import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useSectors } from '../../api/queries'
import { fromLibrary } from '../../lib/imagery'
import { PAGE_IMAGES } from '../../lib/pageImages'
import { SECTORS } from '../../sectors'
import { SectorIcon } from '../graphics/SectorIcon'
import { ImageSlot } from '../media/ImageSlot'
import { CountUp } from '../ui/CountUp'
import styles from './SectorTiles.module.css'

/** The six sectors as picture tiles with icon, name and live count; one tap opens the sector. */
export function SectorTiles() {
  const sectors = useSectors()
  const counts = new Map((sectors.data?.sectors ?? []).map((s) => [s.slug, s.last7d]))
  return (
    <section aria-labelledby="sector-tiles-title" className={styles.section}>
      <div className={styles.head}>
        <h2 id="sector-tiles-title" className={styles.title}>
          Sectors
        </h2>
        <p className={styles.sub}>Stories this week, by subject. Tagged by published rules, not AI.</p>
      </div>
      <ul className={styles.tiles}>
        {SECTORS.map((s, i) => {
          const image = PAGE_IMAGES[`sector-${s.id}`]
          const count = counts.get(s.id)
          return (
            <li key={s.id} className={styles.item}>
              <ImageSlot
                className={styles.media}
                image={image ? fromLibrary(image) : null}
                sector={s.id}
                seed={i}
                ratio="4 / 5"
                sizes="(min-width: 1024px) 200px, 45vw"
                credit="short"
              />
              <Link to={`/sector/${s.id}`} className={styles.link}>
                <span className={styles.icon}>
                  <SectorIcon sector={s.id} size={20} />
                </span>
                <span className={styles.name}>
                  {s.label}
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" className={styles.arrow} />
                </span>
                <span className={styles.count}>
                  {count !== undefined ? (
                    <>
                      <CountUp value={count} /> {count === 1 ? 'story' : 'stories'}
                    </>
                  ) : (
                    ' '
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
