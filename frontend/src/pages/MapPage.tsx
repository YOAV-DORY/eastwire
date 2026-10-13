import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAllPlaces, useCountries, useMapCities } from '../api/queries'
import type { CityPin, LocationRole, MapWindow } from '../api/types'
import { CityListView } from '../components/map/CityListView'
import { CityPanel } from '../components/map/CityPanel'
import { LazyNewsMap } from '../components/map/LazyNewsMap'
import { MapLegend } from '../components/map/MapLegend'
import { ColdStart, ErrorState } from '../components/status/Feedback'
import { Chip } from '../components/ui/Chip'
import { useSlow } from '../hooks/useSlow'
import { readMapState, writeMapState, type MapState } from '../lib/map'
import styles from './MapPage.module.css'

const WINDOWS: { value: MapWindow; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]
const ROLES: { value: LocationRole; label: string }[] = [
  { value: 'mentioned', label: 'Mentioned' },
  { value: 'event', label: 'Dateline' },
  { value: 'publisher', label: 'Publisher' },
]

/** /map and /map/city/:geonamesId. Every setting is in the URL. */
export function MapPage() {
  const { geonamesId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const state = readMapState(params)
  const selectedId = geonamesId ? Number(geonamesId) : undefined

  const map = useMapCities({ window: state.window, roles: state.roles, country: state.country })
  const countries = useCountries()
  const places = useAllPlaces(state.population || selectedId !== undefined)
  const slow = useSlow(map.isLoading)

  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const query = writeMapState(state).toString()
  const suffix = query ? `?${query}` : ''
  const cityHref = useCallback((id: number) => `/map/city/${id}${suffix}`, [suffix])
  const onSelect = useCallback((pin: CityPin) => navigate(cityHref(pin.id)), [navigate, cityHref])
  const set = (patch: Partial<MapState>) => setParams(writeMapState({ ...state, ...patch }))

  const pins = map.data?.cities ?? []
  const population = state.population
    ? (places.data ?? []).filter((p) => !state.country || p.country === state.country)
    : undefined
  const selectedPlace = places.data?.find((p) => p.id === selectedId)
  const selectedPin = pins.find((p) => p.id === selectedId)

  const toggleRole = (role: LocationRole) => {
    const next = state.roles.includes(role) ? state.roles.filter((r) => r !== role) : [...state.roles, role]
    if (next.length > 0) set({ roles: next })
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Map</h1>
        <p className="muted">
          Pins show stories placed in a city from our list. Stories that only name a country are counted below the map,
          never pinned to its capital. An empty city means our sources had nothing city-specific, not that nothing
          happened.
        </p>
      </div>

      <div className={styles.controls} role="group" aria-label="Map settings">
        <label className={styles.select}>
          <span className="mono muted">Country</span>
          <select value={state.country ?? ''} onChange={(e) => set({ country: e.target.value || undefined })}>
            <option value="">All four</option>
            {(countries.data ?? []).map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.group} role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <Chip key={w.value} selected={state.window === w.value} onClick={() => set({ window: w.value })}>
              {w.label}
            </Chip>
          ))}
        </div>
        <fieldset className={styles.roles}>
          <legend className="mono muted">Places</legend>
          {ROLES.map((r) => (
            <label key={r.value}>
              <input
                type="checkbox"
                checked={state.roles.includes(r.value)}
                disabled={state.roles.length === 1 && state.roles.includes(r.value)}
                onChange={() => toggleRole(r.value)}
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className={styles.toggle}>
          <input type="checkbox" checked={state.population} onChange={(e) => set({ population: e.target.checked })} />
          Population layer
        </label>
        <div className={styles.group} role="group" aria-label="View">
          <Chip selected={state.view === 'map'} onClick={() => set({ view: 'map' })}>
            Map
          </Chip>
          <Chip selected={state.view === 'list'} onClick={() => set({ view: 'list' })}>
            List
          </Chip>
        </div>
      </div>

      {slow && <ColdStart />}
      {map.isError && !map.data && <ErrorState message="Map data is unavailable right now." onRetry={() => void map.refetch()} />}

      <div className={selectedId !== undefined ? `${styles.body} ${styles.withPanel}` : styles.body}>
        <div className={styles.mapColumn}>
          {state.view === 'map' ? (
            <LazyNewsMap
              height="clamp(380px, 62vh, 720px)"
              label="Map of stories by city"
              pins={pins}
              population={population}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : (
            <CityListView pins={pins} countryNames={countryNames} cityHref={cityHref} />
          )}
          <MapLegend
            countryOnly={map.data?.countryOnly ?? []}
            countryNames={countryNames}
            population={state.population}
          />
        </div>

        {selectedId !== undefined && (
          <div className={styles.panelColumn}>
            {selectedPlace ? (
              <CityPanel
                place={selectedPlace}
                pin={selectedPin}
                countryNames={countryNames}
                onClose={() => navigate(`/map${suffix}`)}
              />
            ) : places.data ? (
              <p className="muted">
                That city is not on our list. <Link to={`/map${suffix}`}>Back to the map</Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
