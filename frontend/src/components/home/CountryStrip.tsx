import clsx from 'clsx'
import type { CountryView } from '../../api/types'
import { Flag } from '../graphics/Flag'
import { CountUp } from '../ui/CountUp'
import styles from './CountryStrip.module.css'

/**
 * The four countries as a strip of tiles: flag, name and how many stories our sources
 * published about each in the last 24 hours. Each tile filters the front page; pressing the
 * chosen one again (or "All four") clears it.
 */
export function CountryStrip({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryView[] | undefined
  selected?: string
  onSelect: (iso2: string | undefined) => void
}) {
  const total = (countries ?? []).reduce((sum, c) => sum + c.last24h, 0)
  return (
    <div className={styles.strip} role="group" aria-label="Filter by country">
      <button type="button" className={clsx(styles.tile, styles.all)} aria-pressed={!selected} onClick={() => onSelect(undefined)}>
        <span className={styles.name}>All four</span>{' '}
        <span className={styles.count}>
          <CountUp value={total} />
        </span>
      </button>
      {(countries ?? Array.from({ length: 4 }, () => undefined)).map((c, i) =>
        c ? (
          <button
            key={c.iso2}
            type="button"
            className={styles.tile}
            aria-pressed={selected === c.iso2}
            onClick={() => onSelect(selected === c.iso2 ? undefined : c.iso2)}
            title={`${c.last24h} news stories about ${c.name} in the last 24 hours`}
          >
            <span className={styles.flag}>
              <Flag country={c.iso2} size={26} />
            </span>
            <span className={styles.name}>{c.name}</span>{' '}
            <span className={styles.count}>
              <CountUp value={c.last24h} />
            </span>
          </button>
        ) : (
          <span key={i} className={clsx(styles.tile, styles.placeholder)} aria-hidden="true" />
        ),
      )}
    </div>
  )
}
