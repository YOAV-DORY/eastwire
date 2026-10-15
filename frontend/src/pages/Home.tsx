import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCountries, useFront, useMapCities, usePlaces, useStatus } from '../api/queries'
import { FrontPage } from '../components/front/FrontPage'
import { SectorIcon } from '../components/graphics/SectorIcon'
import { CountryStrip } from '../components/home/CountryStrip'
import { LiveStats, MapCompanion, SocialPreview } from '../components/home/Companion'
import { NowTicker } from '../components/home/NowTicker'
import { SectorTiles } from '../components/home/SectorTiles'
import { StaleBanner } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { usePageTitle } from '../hooks/usePageTitle'
import { DEFAULT_ROLES } from '../lib/map'
import { SECTOR_TILE_IMAGES } from '../lib/pageImages'
import { relativeTime } from '../lib/time'
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
            <label className={styles.cityPicker}>
              <span>City</span>
              <select value={city ?? ''} onChange={(e) => select({ country, city: e.target.value || undefined, sector })}>
                <option value="">All of {countryNames[country] ?? country}</option>
                {places.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
    </>
  )
  const tickerItems = everything.data?.latest.slice(0, 10) ?? []
  const stories24h = (countries.data ?? []).reduce((sum, c) => sum + c.last24h, 0)

  return (
    <>
      <NowTicker items={tickerItems} />
      <div className={clsx('container', styles.page)}>
        <header className={styles.header}>
          <h1 className="visually-hidden">Latest news from China, India, South Korea and Japan</h1>
          <p className={styles.dateline}>
            <span className={styles.date}>{today()}</span>
            <span className={styles.tagline}>
              Numbers: stories our sources published in the last 24 hours, not how much happened
            </span>
          </p>
        </header>

        <CountryStrip countries={countries.data} selected={country} onSelect={(c) => select({ country: c, sector })} />
        <div className={clsx(styles.filters, styles.wideOnly)}>{sectorChips}</div>
        {(status.data?.state === 'stale' || status.data?.state === 'outage') && status.data.lastSuccessAt && (
          <StaleBanner
            state={status.data.state}
            detail={`Every source was last checked successfully ${relativeTime(status.data.lastSuccessAt)}.`}
          />
        )}

        <div className={styles.front}>
          <FrontPage
            filters={{ country, city, sector }}
            countryNames={countryNames}
            emptyTitle={emptyTitle}
            emptyAction={emptyAction}
            onHighlight={setHighlighted}
            highlightedPlace={highlighted}
            reservedImages={SECTOR_TILE_IMAGES}
            rail={
              <>
                <MapCompanion data={map.data} countryNames={countryNames} country={country} highlightedId={highlighted} />
                <LiveStats stories={countries.data ? stories24h : undefined} cities={map.data?.cities.length} status={status.data} />
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
