import { Link } from 'react-router'
import type { CityPin } from '../../api/types'
import { formatUtc, relativeTime } from '../../lib/time'
import styles from './CityListView.module.css'

/** The accessible alternative to the map: every pinned city as a table row. */
export function CityListView({
  pins,
  countryNames,
  cityHref,
}: {
  pins: CityPin[]
  countryNames: Record<string, string>
  cityHref: (id: number) => string
}) {
  if (pins.length === 0) {
    return <p className="muted">No stories are placed in a city for these filters.</p>
  }
  return (
    <div className={styles.wrap} role="region" aria-label="Cities with stories" tabIndex={0}>
      <table className={styles.table}>
        <caption className="visually-hidden">Cities with stories, most stories first</caption>
        <thead>
          <tr>
            <th scope="col">City</th>
            <th scope="col">Country</th>
            <th scope="col">Stories</th>
            <th scope="col">Mentioned</th>
            <th scope="col">Dateline</th>
            <th scope="col">Publisher</th>
            <th scope="col">Last item</th>
          </tr>
        </thead>
        <tbody>
          {pins.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                <Link to={cityHref(p.id)}>{p.name}</Link>
                {p.lowConfidenceOnly && <span className="muted"> · low confidence</span>}
              </th>
              <td>{countryNames[p.country] ?? p.country}</td>
              <td className="num">{p.total}</td>
              <td className="num">{p.mentioned}</td>
              <td className="num">{p.event}</td>
              <td className="num">{p.publisher}</td>
              <td className="num" title={formatUtc(p.lastItemAt)}>
                {relativeTime(p.lastItemAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
