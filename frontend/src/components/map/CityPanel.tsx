import { X } from 'lucide-react'
import type { CityPin, PlaceView } from '../../api/types'
import { formatCoords, formatPopulation } from '../../lib/map'
import { formatUtc, relativeTime } from '../../lib/time'
import styles from './CityPanel.module.css'

/**
 * The head of a city's story list: where it is, how many stories are about it in each role,
 * and when the last one arrived. Works for cities without stories too.
 */
export function CityPanel({
  place,
  pin,
  countryNames,
  onClose,
}: {
  place: PlaceView
  pin?: CityPin
  countryNames: Record<string, string>
  onClose: () => void
}) {
  return (
    <section className={styles.panel} aria-labelledby="city-title">
      <div className={styles.top}>
        <div>
          <p className="kicker">{countryNames[place.country] ?? place.country}</p>
          <h2 id="city-title" className={styles.title}>
            {place.name}
          </h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close city and show all stories">
          <X size={20} strokeWidth={1.75} />
        </button>
      </div>
      <dl className={styles.counts}>
        <div>
          <dt>About the city</dt>
          <dd>{pin?.mentioned ?? 0}</dd>
        </div>
        <div>
          <dt>Datelined here</dt>
          <dd>{pin?.event ?? 0}</dd>
        </div>
        <div>
          <dt>Publisher based here</dt>
          <dd>{pin?.publisher ?? 0}</dd>
        </div>
      </dl>
      <p className={styles.facts}>
        {pin ? (
          <>
            Last story{' '}
            <time dateTime={pin.lastItemAt} title={formatUtc(pin.lastItemAt)}>
              {relativeTime(pin.lastItemAt)}
            </time>
          </>
        ) : (
          'No stories about this city in this time window'
        )}
        {place.population > 0 && ` · population ${formatPopulation(place.population)} (GeoNames)`}
        {' · '}
        <span className="num">{formatCoords(place.lat, place.lon)}</span>
      </p>
    </section>
  )
}
