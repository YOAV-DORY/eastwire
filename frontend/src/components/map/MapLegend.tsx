import type { CityPin } from '../../api/types'
import { pinSvg } from '../../lib/map'
import styles from './MapLegend.module.css'

const SAMPLE: CityPin = {
  id: 0,
  name: '',
  country: '',
  lat: 0,
  lon: 0,
  total: 1,
  mentioned: 1,
  event: 0,
  publisher: 0,
  lowConfidenceOnly: false,
  lastItemAt: '',
}

function Pin({ total, low = false }: { total: number; low?: boolean }) {
  return <span className={styles.pin} dangerouslySetInnerHTML={{ __html: pinSvg({ ...SAMPLE, total, lowConfidenceOnly: low }) }} />
}

/** How to read the map, including what it does not show. */
export function MapLegend({
  countryOnly,
  countryNames,
  population,
}: {
  countryOnly: { country: string; count: number }[]
  countryNames: Record<string, string>
  population: boolean
}) {
  return (
    <aside className={styles.legend} aria-label="Map legend">
      <ul className={styles.items}>
        <li>
          <Pin total={1} />
          <Pin total={5} />
          <Pin total={20} /> <span>Stories placed in a city (1–4, 5–19, 20+)</span>
        </li>
        <li>
          <Pin total={1} low /> <span>Dashed: low confidence only</span>
        </li>
        {population && (
          <li>
            <span className={styles.circle} aria-hidden="true" /> <span>Population (GeoNames, year varies), not news volume</span>
          </li>
        )}
      </ul>
      <p className={`${styles.countryOnly} mono`}>
        Country level only, not placed on a city:{' '}
        {countryOnly.length === 0
          ? 'none'
          : countryOnly.map((c) => `${countryNames[c.country] ?? c.country} ${c.count}`).join(' · ')}
      </p>
    </aside>
  )
}
