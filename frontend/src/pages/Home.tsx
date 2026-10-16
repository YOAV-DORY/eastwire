import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCountries, useFront, useMapCities, useMix, usePlaces, useStatus } from '../api/queries'
import { FrontPage } from '../components/front/FrontPage'
import { SectorIcon } from '../components/graphics/SectorIcon'
import { CountryStrip } from '../components/home/CountryStrip'
import { LiveStats, MapCompanion, SocialPreview } from '../components/home/Companion'
import { NowTicker } from '../components/home/NowTicker'
import { SectorTiles } from '../components/home/SectorTiles'
import { StaleBanner, UpdatedLabel } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { Picker } from '../components/ui/Picker'
import { useRefreshFade } from '../hooks/useRefreshFade'
import { usePageTitle } from '../hooks/usePageTitle'
import { DEFAULT_ROLES } from '../lib/map'
import { prominentIds } from '../lib/frontLayout'
import { SECTOR_TILE_IMAGES } from '../lib/pageImages'
import { SECTORS, isSectorId, sectorLabel } from '../sectors'
import styles from './Home.module.css'

interface Filters {
  country?: string
  city?: string
  sector?: string
}

const today = () =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

/**
 * The front page. "Now in Asia" runs across the top; under the date, the four countries (with
 * live counts) and the sectors filter the page; then the split lead, Latest beside the map,
 * In focus, sector tiles, the rest by country, Reading and posts from newsrooms on social.
 */
export function Home() {
  const [params, setParams] = useSearchParams()
  const country = params.get('country') ?? undefined
  const city = params.get('city') ?? undefined
  const sectorParam = params.get('sector')
  const sector = isSectorId(sectorParam) ? sectorParam : undefined
  const [highlighted, setHighlighted] = useState<number | null>(null)

  const countries = useCountries()
  const places = usePlaces(country)
  const status = useStatus()
  const map = useMapCities({ window: '7d', roles: DEFAULT_ROLES, country, sector })
  const everything = useFront({})
  const shown = useFront({ country, city, sector })
  // The saved copy is replaced by live news without a jump: the block fades up once.
  const frontRef = useRefreshFade<HTMLDivElement>(shown.data)
  const mix = useMix()

  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const cityName = places.data?.find((p) => String(p.id) === city)?.name
  const scope = cityName ?? (country ? (countryNames[country] ?? country) : undefined)
  usePageTitle([scope, sector && sectorLabel(sector)].filter(Boolean).join(' · ') || undefined)

  const select = (next: Filters) => {
    const p = new URLSearchParams()
    if (next.country) p.set('country', next.country)
    if (next.city) p.set('city', next.city)
    if (next.sector) p.set('sector', next.sector)
    setParams(p)
  }

  const emptyTitle = `Nothing new from our sources${sector ? ` tagged ${sectorLabel(sector)}` : ''}${scope ? ` about ${scope}` : ''}`
  const emptyAction = sector ? (
    <Button onClick={() => select({ country, city })}>All sectors</Button>
  ) : scope ? (
    <Button onClick={() => select(city ? { country } : {})}>
      {city ? `All of ${countryNames[country ?? ''] ?? country}` : 'All countries'}
    </Button>
  ) : undefined
  // Sector chips and the city picker: under the countries on wide screens; on phones after the
  // top stories, so the lead's headline is on the first screen.
  const sectorChips = (
    <>
          <FilterTabs
            label="Filter by sector"
            value={sector}
            onChange={(s) => select({ country, city, sector: s })}
            options={[
              { value: undefined, label: 'All sectors' },
              ...SECTORS.map((s) => ({ value: s.id, label: s.label, leading: <SectorIcon sector={s.id} size={15} /> })),
            ]}
          />
          {country && (places.data?.length ?? 0) > 0 && (
            <Picker label="City" value={city ?? ''} onChange={(v) => select({ country, city: v || undefined, sector })}>
              <option value="">All of {countryNames[country] ?? country}</option>
              {places.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Picker>
          )}
    </>
  )
  // The ticker carries the newest stories not already shown in the top of the page, so each story
  // appears once on Home; the page's lower groups then leave the ticker's stories out.
  const prominent = prominentIds(shown.data)
  const tickerItems = [...(everything.data?.latest ?? [])]
    .filter((a) => !prominent.has(a.id))
    .sort((x, y) => Date.parse(y.publishedAt ?? y.discoveredAt) - Date.parse(x.publishedAt ?? x.discoveredAt))
    .slice(0, 8)
  const tickerIds = new Set(tickerItems.map((a) => a.id))
  // When the stories on screen were last refreshed from our sources (also true for a snapshot).
  const updatedAt = status.data?.updatedAt ?? undefined
  const stories24h = (countries.data ?? []).reduce((sum, c) => sum + c.last24h, 0)

  return (
    <>
      <NowTicker items={tickerItems} />
      <div className={clsx('container', styles.page)}>
        <header className={styles.header}>
          <h1 className="visually-hidden">Latest news from China, India, South Korea and Japan</h1>
          <p className={styles.dateline}>
            <span className={styles.date}>{today()}</span>
            {updatedAt && <UpdatedLabel at={updatedAt} className={styles.updated} />}
            <span className={styles.tagline}>
              Numbers: stories our sources published in the last 24 hours, not how much happened
            </span>
          </p>
        </header>

        <CountryStrip countries={countries.data} selected={country} onSelect={(c) => select({ country: c, sector })} />
        <div className={clsx(styles.filters, styles.wideOnly)}>{sectorChips}</div>
        {/* Only when nothing was refreshed for six hours: a reader-level note, details on the Sources page. */}
        {(status.data?.updateState === 'stale' || status.data?.updateState === 'outage') && status.data.updatedAt && (
          <StaleBanner state={status.data.updateState} since={status.data.updatedAt} />
        )}

        <div className={styles.front} ref={frontRef}>
          <FrontPage
            filters={{ country, city, sector }}
            countryNames={countryNames}
            emptyTitle={emptyTitle}
            emptyAction={emptyAction}
            onHighlight={setHighlighted}
            highlightedPlace={highlighted}
            reservedImages={SECTOR_TILE_IMAGES}
            elsewhere={tickerIds}
            rail={
              <>
                <MapCompanion data={map.data} countryNames={countryNames} country={country} highlightedId={highlighted} />
                <LiveStats
                  stories={countries.data ? stories24h : undefined}
                  cities={map.data?.cities.length}
                  outlets={mix.data?.publishers.length}
                />
              </>
            }
            after={<SectorTiles />}
            between={<div className={clsx(styles.filters, styles.phoneOnly)}>{sectorChips}</div>}
          />
          <SocialPreview country={country} />
        </div>
      </div>
    </>
  )
}
