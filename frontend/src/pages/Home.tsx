import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCountries, useMapCities, usePlaces, useStatus } from '../api/queries'
import { FrontPage } from '../components/front/FrontPage'
import { Flag } from '../components/graphics/Flag'
import { CountryCounts, MapCompanion, SocialPreview } from '../components/home/Companion'
import { SectorTiles } from '../components/home/SectorTiles'
import { StaleBanner } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { usePageTitle } from '../hooks/usePageTitle'
import { DEFAULT_ROLES } from '../lib/map'
import { relativeTime } from '../lib/time'
import { SECTORS, isSectorId, sectorColor, sectorLabel } from '../sectors'
import styles from './Home.module.css'

interface Filters {
  country?: string
  city?: string
  sector?: string
}

const today = () =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

/**
 * The front page: news first. A lead story (on the ink panel), two more and the start of
 * Latest fill the first screen; the map, country counts and social posts sit beside them on
 * wide screens and below on phones. The rest of Latest and the dated Reading section run the
 * full width underneath.
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


  return (
    <div className={clsx('container', styles.page)}>
      <header className={styles.header}>
        <h1 className="visually-hidden">Latest news from China, India, South Korea and Japan</h1>
        <p className={styles.dateline}>
          <span className={styles.date}>{today()}</span>
          <span className={styles.tagline}>China, India, South Korea and Japan, from sources whose terms allow it</span>
        </p>
      </header>

      {/* Chips with counts and colour dots; on phones the rows scroll, with an arrow while more are hidden. */}
      <div className={styles.filtersWide}>
        <FilterTabs
          label="Filter by country"
          value={country}
          onChange={(c) => select({ country: c, sector })}
          options={[
            { value: undefined, label: 'All' },
            ...(countries.data ?? []).map((c) => ({
              value: c.iso2,
              label: c.name,
              leading: <Flag country={c.iso2} />,
              count: c.last24h,
              countTitle: `${c.last24h} news stories about ${c.name} in the last 24 hours`,
            })),
          ]}
        />
        <p className={styles.countsNote}>Numbers: news stories about each country in the last 24 hours.</p>
        <FilterTabs
          quiet
          label="Filter by sector"
          value={sector}
          onChange={(s) => select({ country, city, sector: s })}
          options={[
            { value: undefined, label: 'All sectors' },
            ...SECTORS.map((s) => ({
              value: s.id,
              label: s.label,
              leading: <span className={styles.dot} style={{ background: sectorColor(s.id) }} aria-hidden="true" />,
            })),
          ]}
        />
      </div>
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

      {(status.data?.state === 'stale' || status.data?.state === 'outage') && status.data.lastSuccessAt && (
        <StaleBanner
          state={status.data.state}
          detail={`Every source was last checked successfully ${relativeTime(status.data.lastSuccessAt)}.`}
        />
      )}

      <FrontPage
        filters={{ country, city, sector }}
        countryNames={countryNames}
        emptyTitle={emptyTitle}
        emptyAction={emptyAction}
        onHighlight={setHighlighted}
        highlightedPlace={highlighted}
        rail={
          <>
            <MapCompanion data={map.data} countryNames={countryNames} country={country} highlightedId={highlighted} />
            {countries.data && (
              <CountryCounts countries={countries.data} selected={country} onSelect={(c) => select({ country: c, sector })} />
            )}
          </>
        }
        after={<SectorTiles />}
      />
      <SocialPreview country={country} />
    </div>
  )
}
