import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useCountries, useMapCities, useSectors } from '../api/queries'
import { Flag } from '../components/graphics/Flag'
import { SectorRules } from '../components/news/SectorRules'
import { StoryFeed } from '../components/news/StoryFeed'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { DEFAULT_ROLES } from '../lib/map'
import { isSectorId, sectorColor, sectorLabel, type SectorId } from '../sectors'
import { NotFound } from './NotFound'
import styles from './SectorPage.module.css'

/** /sector/:slug — one sector's stories, where they are, and exactly how stories get this tag. */
export function SectorPage() {
  const { slug } = useParams()
  if (!isSectorId(slug)) return <NotFound />
  return <Sector slug={slug} />
}

function Sector({ slug }: { slug: SectorId }) {
  const [params, setParams] = useSearchParams()
  const country = params.get('country') ?? undefined
  const label = sectorLabel(slug)

  const sectors = useSectors()
  const countries = useCountries()
  const map = useMapCities({ window: '7d', roles: DEFAULT_ROLES, country, sector: slug })
  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const definition = sectors.data?.sectors.find((s) => s.slug === slug)
  const topPlaces = (map.data?.cities ?? []).slice(0, 5)
  const scope = country ? (countryNames[country] ?? country) : undefined
  const select = (next?: string) => setParams(next ? { country: next } : {})

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.dot} style={{ background: sectorColor(slug) }} aria-hidden="true" />
        <div className={styles.intro}>
          <h1 className={styles.title}>{label}</h1>
          <p className="muted">{definition?.definition ?? ' '}</p>
        </div>
      </header>

      <details className={styles.how}>
        <summary>How we tag {label}</summary>
        {sectors.data && definition ? (
          <SectorRules rules={sectors.data} sector={definition} />
        ) : (
          <p className="muted">{sectors.isError ? 'The rules could not be loaded right now.' : 'Loading the rules…'}</p>
        )}
      </details>

      <div className={styles.filters} role="group" aria-label="Filter by country">
        <Chip selected={!country} onClick={() => select()}>
          All
        </Chip>
        {(countries.data ?? []).map((c) => (
          <Chip key={c.iso2} selected={country === c.iso2} leading={<Flag country={c.iso2} />} onClick={() => select(c.iso2)}>
            {c.name}
          </Chip>
        ))}
      </div>

      <div className={styles.columns}>
        <StoryFeed
          filters={{ country, sector: slug }}
          heading={[label, scope].filter(Boolean).join(' · ')}
          countryNames={countryNames}
          emptyTitle={`Nothing tagged ${label}${scope ? ` for ${scope}` : ''} right now`}
          emptyAction={scope ? <Button onClick={() => select()}>All countries</Button> : undefined}
        />
        <aside className={styles.rail} aria-labelledby="top-places">
          <h2 id="top-places" className={`${styles.railTitle} mono muted`}>
            Top places this week
          </h2>
          {topPlaces.length > 0 ? (
            <ol className={styles.places}>
              {topPlaces.map((p) => (
                <li key={p.id}>
                  <Link to={`/map/city/${p.id}?sector=${slug}`}>{p.name}</Link>
                  <span className="mono muted">{p.total}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">{map.data ? `No ${label} story is placed in a city this week.` : ' '}</p>
          )}
          <Link to={`/map?sector=${slug}`} className={styles.mapLink}>
            Open the {label} map
          </Link>
        </aside>
      </div>
    </div>
  )
}
