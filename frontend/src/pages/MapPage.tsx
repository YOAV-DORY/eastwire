import clsx from 'clsx'
import { SlidersHorizontal, X } from 'lucide-react'
import { Picker } from '../components/ui/Picker'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAllPlaces, useArticleFeed, useCountries, useMapCities, type FeedFilters } from '../api/queries'
import type { CityPin, LocationRole, MapWindow } from '../api/types'
import { CityListView } from '../components/map/CityListView'
import { CityPanel } from '../components/map/CityPanel'
import { LazyNewsMap } from '../components/map/LazyNewsMap'
import { MapLegend } from '../components/map/MapLegend'
import { StoryCard } from '../components/news/StoryCard'
import { StoryFeed } from '../components/news/StoryFeed'
import { ErrorState } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { usePageTitle } from '../hooks/usePageTitle'
import { readMapState, writeMapState, type MapState } from '../lib/map'
import { SECTORS, sectorLabel, type SectorId } from '../sectors'
import { Hero } from '../components/media/Hero'
import { cityImage, countryImage, fromLibrary } from '../lib/imagery'
import { PAGE_IMAGES } from '../lib/pageImages'
import styles from './MapPage.module.css'

const WINDOWS: { value: MapWindow; label: string; days: number }[] = [
  { value: '24h', label: '24 hours', days: 1 },
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
]
const ROLES: { value: LocationRole; label: string }[] = [
  { value: 'mentioned', label: 'About the place' },
  { value: 'event', label: 'Datelined there' },
  { value: 'publisher', label: 'Publisher based there' },
]

const isoDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)

/**
 * /map and /map/city/:geonamesId. The map and the story list work together: choosing a pin
 * narrows the list to that city, and pointing at a story lights its pin. Every setting is
 * in the URL. On phones a Map/List switch keeps the map large; filters sit in a sheet.
 */
export function MapPage() {
  const { geonamesId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const state = readMapState(params)
  const selectedId = geonamesId ? Number(geonamesId) : undefined
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const map = useMapCities({ window: state.window, roles: state.roles, country: state.country, sector: state.sector })
  const countries = useCountries()
  const places = useAllPlaces(state.population || selectedId !== undefined)

  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const query = writeMapState(state).toString()
  const suffix = query ? `?${query}` : ''
  const cityHref = useCallback((id: number) => `/map/city/${id}${suffix}`, [suffix])
  const contextRef = useRef<HTMLDivElement>(null)
  const revealContext = useRef(false)
  const onSelect = useCallback(
    (pin: CityPin) => {
      revealContext.current = true
      navigate(cityHref(pin.id))
    },
    [navigate, cityHref],
  )
  const set = (patch: Partial<MapState>) => setParams(writeMapState({ ...state, ...patch }))
  const closeCity = () => navigate(`/map${suffix}`)

  const pins = map.data?.cities ?? []
  const population = state.population
    ? (places.data ?? []).filter((p) => !state.country || p.country === state.country)
    : undefined
  const selectedPlace = places.data?.find((p) => p.id === selectedId)
  const selectedPin = pins.find((p) => p.id === selectedId)
  usePageTitle(selectedPlace ? `${selectedPlace.name} on the map` : 'Map')
  // Phones: after a pin is tapped, scroll just enough that the city's name, Reset and its first
  // story show under the map (they sit below it, often off screen). Wide screens show them beside.
  useEffect(() => {
    const el = contextRef.current
    if (!revealContext.current || !selectedPlace || !el || el.offsetParent === null) return
    revealContext.current = false
    const bottomBar = 64 + 12
    const overflow = el.getBoundingClientRect().top + 240 - (window.innerHeight - bottomBar)
    if (overflow <= 0) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollBy({ top: overflow, behavior: reduce ? 'auto' : 'smooth' })
  }, [selectedPlace])
  const days = WINDOWS.find((w) => w.value === state.window)?.days ?? 7
  const windowLabel = WINDOWS.find((w) => w.value === state.window)?.label ?? '7 days'

  const tableQuery = writeMapState({ ...state, view: state.view === 'table' ? 'map' : 'table' }).toString()
  const tableHref = `${selectedId !== undefined ? `/map/city/${selectedId}` : '/map'}${tableQuery ? `?${tableQuery}` : ''}`

  const toggleRole = (role: LocationRole) => {
    const next = state.roles.includes(role) ? state.roles.filter((r) => r !== role) : [...state.roles, role]
    if (next.length > 0) set({ roles: next })
  }

  const filters = (
    <>
      <Picker label="Country" value={state.country ?? ''} onChange={(v) => set({ country: v || undefined })}>
        <option value="">All four</option>
        {(countries.data ?? []).map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name}
            </option>
          ))}
      </Picker>
      <Picker label="Sector" value={state.sector ?? ''} onChange={(v) => set({ sector: v || undefined })}>
        <option value="">All sectors</option>
        {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
      </Picker>
      <div className={styles.segmented} role="group" aria-label="Time window">
        {WINDOWS.map((w) => (
          <button key={w.value} type="button" aria-pressed={state.window === w.value} onClick={() => set({ window: w.value })}>
            {w.label}
          </button>
        ))}
      </div>
      <details className={styles.options}>
        <summary>More options</summary>
        <fieldset className={styles.roles}>
          <legend>Pin a story to a city when it is</legend>
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
        <label className={styles.check}>
          <input type="checkbox" checked={state.population} onChange={(e) => set({ population: e.target.checked })} />
          Population layer
        </label>
        <Link to={tableHref} className={styles.tableLink}>
          {state.view === 'table' ? 'Back to the map' : 'Show the cities as a table'}
        </Link>
      </details>
    </>
  )

  const scope = selectedPlace?.name ?? (state.country ? (countryNames[state.country] ?? state.country) : undefined)
  const feedFilters =
    selectedId !== undefined
      ? { city: String(selectedId), country: selectedPlace?.country, sector: state.sector, from: isoDay(days) }
      : { country: state.country, sector: state.sector, from: isoDay(days) }
  const listHeading = [scope ? `Stories about ${scope}` : 'Stories on the map', state.sector && sectorLabel(state.sector as SectorId), `last ${windowLabel}`]
    .filter(Boolean)
    .join(' · ')

  // The hero follows the selection: the city's photo, else its country's, else the 1864 map of Asia.
  const countryName = state.country ? (countryNames[state.country] ?? state.country) : undefined
  const heroImage =
    (selectedId !== undefined ? cityImage(selectedId) : null) ??
    (state.country ? countryImage(state.country) : null) ??
    fromLibrary(PAGE_IMAGES.map, 'Historical map')
  const heroTitle = selectedPlace ? selectedPlace.name : countryName ? `${countryName} on the map` : 'The map'

  return (
    <>
    <Hero
      size="compact"
      image={heroImage}
      country={selectedPlace?.country ?? state.country}
      kicker="Map"
      title={heroTitle}
      lede="Pins mark the cities stories are about. Stories that name only a country are counted under the map, never pinned to a capital."
    />
    <div className={clsx('container', styles.page)} data-view={state.view}>

      <div className={styles.toolbar}>
        <div className={styles.inlineFilters} role="group" aria-label="Map settings">
          {filters}
        </div>
        <div className={styles.phoneBar}>
          <div className={styles.segmented} role="group" aria-label="View">
            <button type="button" aria-pressed={state.view !== 'list'} onClick={() => set({ view: 'map' })}>
              Map
            </button>
            <button type="button" aria-pressed={state.view === 'list'} onClick={() => set({ view: 'list' })}>
              List
            </button>
          </div>
          <button type="button" className={styles.filtersButton} onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
            Filters
          </button>
        </div>
      </div>

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        {filters}
      </FiltersSheet>

      {map.isError && !map.data && <ErrorState message="Map data is unavailable right now." onRetry={() => void map.refetch()} />}

      <div className={styles.body}>
        <div className={styles.mapColumn}>
          {state.view === 'table' ? (
            <CityListView pins={pins} countryNames={countryNames} cityHref={cityHref} />
          ) : (
            <div className={styles.mapFrame}>
              <LazyNewsMap
                height="100%"
                label="Map of stories by city"
                pins={pins}
                population={population}
                selectedId={selectedId}
                onSelect={onSelect}
                highlightedId={highlighted}
              />
            </div>
          )}
          {/* Phones: what is selected and its first stories, right under the map. */}
          <div className={styles.phoneContext} aria-live="polite" ref={contextRef}>
            {selectedId !== undefined && selectedPlace ? (
              <>
                <div className={styles.contextHead}>
                  <p>
                    <strong>{selectedPlace.name}</strong>
                    <span className="num">
                      {selectedPin?.total ?? 0} {(selectedPin?.total ?? 0) === 1 ? 'story' : 'stories'} · last {windowLabel}
                    </span>
                  </p>
                  <button type="button" className={styles.reset} onClick={closeCity}>
                    <X size={16} strokeWidth={2} aria-hidden="true" /> Reset
                  </button>
                </div>
                <PreviewList filters={feedFilters} countryNames={countryNames} onShowAll={() => set({ view: 'list' })} />
              </>
            ) : (
              <p className={styles.contextNote}>
                <span className="num">
                  {pins.length} {pins.length === 1 ? 'city' : 'cities'} with stories · last {windowLabel}.
                </span>{' '}
                Tap a pin to see its stories.
              </p>
            )}
          </div>
          <MapLegend
            countryOnly={map.data?.countryOnly ?? []}
            countryNames={countryNames}
            population={state.population}
            windowLabel={windowLabel}
          />
        </div>

        <div className={styles.listColumn}>
          {selectedId !== undefined &&
            (selectedPlace ? (
              <CityPanel place={selectedPlace} pin={selectedPin} countryNames={countryNames} onClose={closeCity} />
            ) : places.data ? (
              <p className={styles.note}>
                That city is not on our list. <Link to={`/map${suffix}`}>Back to the map</Link>
              </p>
            ) : null)}
          <StoryFeed
            filters={feedFilters}
            heading={listHeading}
            countryNames={countryNames}
            emptyTitle={scope ? `Nothing about ${scope} in the last ${windowLabel}` : `Nothing in the last ${windowLabel}`}
            onHighlight={setHighlighted}
            highlightedPlace={highlighted}
            reservedImages={[heroImage.id]}
          />
        </div>
      </div>
    </div>
    </>
  )
}

/** Phones: the selected city's first stories under the map, and a way to the full list. */
function PreviewList({
  filters,
  countryNames,
  onShowAll,
}: {
  filters: FeedFilters
  countryNames: Record<string, string>
  onShowAll: () => void
}) {
  const feed = useArticleFeed(filters)
  const items = feed.data?.pages[0]?.items.slice(0, 3) ?? []
  const total = feed.data?.pages[0]?.total ?? 0
  if (feed.isPending) return <p className={styles.contextNote}>Loading its stories…</p>
  if (items.length === 0) return <p className={styles.contextNote}>No stories about this city in this time window.</p>
  return (
    <>
      <ol className={styles.preview}>
        {items.map((a) => (
          <li key={a.id}>
            <StoryCard article={a} variant="compact" countryNames={countryNames} />
          </li>
        ))}
      </ol>
      {total > items.length && (
        <Button variant="primary" onClick={onShowAll}>
          Show all {total} stories
        </Button>
      )}
    </>
  )
}

/** Phones: the map's filters in a bottom sheet, so the map keeps the screen. */
function FiltersSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby="map-filters-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.sheetHead}>
        <h2 id="map-filters-title" className="kicker">
          Map filters
        </h2>
        <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Close filters">
          <X size={20} strokeWidth={1.75} />
        </button>
      </div>
      <div className={styles.sheetBody}>{children}</div>
      <Button variant="primary" size="lg" onClick={onClose}>
        Show results
      </Button>
    </dialog>
  )
}
