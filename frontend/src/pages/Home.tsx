import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCountries, useMapCities, usePlaces, useStatus } from '../api/queries'
import type { CityPin } from '../api/types'
import { Flag } from '../components/graphics/Flag'
import { HeroMark } from '../components/graphics/HeroMark'
import { LazyNewsMap } from '../components/map/LazyNewsMap'
import { StoryFeed } from '../components/news/StoryFeed'
import { SearchBar } from '../components/search/SearchBar'
import { SocialStrip } from '../components/social/SocialStrip'
import { StaleBanner } from '../components/status/Feedback'
import { Button, ButtonLink } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { DEFAULT_ROLES } from '../lib/map'
import { relativeTime } from '../lib/time'
import { SECTORS, isSectorId, sectorColor, sectorLabel } from '../sectors'
import styles from './Home.module.css'

interface Filters {
  country?: string
  city?: string
  sector?: string
}

export function Home() {
  const [params, setParams] = useSearchParams()
  const country = params.get('country') ?? undefined
  const city = params.get('city') ?? undefined
  const sectorParam = params.get('sector')
  const sector = isSectorId(sectorParam) ? sectorParam : undefined

  const countries = useCountries()
  const places = usePlaces(country)
  const status = useStatus()
  const map = useMapCities({ window: '7d', roles: DEFAULT_ROLES, country, sector })
  const navigate = useNavigate()
  const openCity = useCallback((pin: CityPin) => navigate(`/map/city/${pin.id}`), [navigate])

  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const cityName = places.data?.find((p) => String(p.id) === city)?.name
  const scope = cityName ?? (country ? (countryNames[country] ?? country) : undefined)

  const select = (next: Filters) => {
    const p = new URLSearchParams()
    if (next.country) p.set('country', next.country)
    if (next.city) p.set('city', next.city)
    if (next.sector) p.set('sector', next.sector)
    setParams(p)
  }

  const heading = ['Latest', scope, sector && sectorLabel(sector)].filter(Boolean).join(' · ')
  const emptyTitle = `Nothing from our sources${sector ? ` tagged ${sectorLabel(sector)}` : ''}${scope ? ` for ${scope}` : ''} right now`
  const emptyAction = sector ? (
    <Button onClick={() => select({ country, city })}>All sectors</Button>
  ) : scope ? (
    <Button onClick={() => select(city ? { country } : {})}>
      {city ? `All of ${countryNames[country ?? ''] ?? country}` : 'All countries'}
    </Button>
  ) : undefined

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.title}>
          Asian news, <br className={styles.desktopBreak} />
          on the map, <br className={styles.desktopBreak} />
          with sources shown.
        </h1>
        <HeroMark className={styles.mark} />
      </section>

      <div className={styles.mapHero}>
        <LazyNewsMap
          height="clamp(320px, 52vh, 440px)"
          label="Map of this week's stories by city"
          pins={map.data?.cities ?? []}
          onSelect={openCity}
          staticOnTouch
        />
        <ButtonLink href="/map" className={styles.openMap}>
          Open full map
        </ButtonLink>
      </div>

      <SearchBar variant="hero" keep={{ country, sector }} />

      {(status.data?.state === 'stale' || status.data?.state === 'outage') && status.data.lastSuccessAt && (
        <StaleBanner
          state={status.data.state}
          detail={`Stories below were last refreshed ${relativeTime(status.data.lastSuccessAt)}.`}
        />
      )}

      <div className={styles.filters} role="group" aria-label="Filter by sector">
        <Chip selected={!sector} onClick={() => select({ country, city })}>
          All sectors
        </Chip>
        {SECTORS.map((s) => (
          <Chip
            key={s.id}
            selected={sector === s.id}
            dotColor={sectorColor(s.id)}
            onClick={() => select({ country, city, sector: s.id })}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <div className={styles.filters} role="group" aria-label="Filter by country">
        <Chip selected={!country} onClick={() => select({ sector })}>
          All
        </Chip>
        {(countries.data ?? []).map((c) => (
          <Chip
            key={c.iso2}
            selected={country === c.iso2}
            leading={<Flag country={c.iso2} />}
            count={c.last24h}
            title={`${c.last24h} stories in the last 24 hours`}
            onClick={() => select({ country: c.iso2, sector })}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {country && (places.data?.length ?? 0) > 0 && (
        <label className={styles.cityPicker}>
          <span className="mono muted">City</span>
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

      <StoryFeed
        filters={{ country, city, sector }}
        heading={heading}
        countryNames={countryNames}
        emptyTitle={emptyTitle}
        emptyAction={emptyAction}
      />

      <SocialStrip country={country} />
    </div>
  )
}
