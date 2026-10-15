import clsx from 'clsx'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useCountries, useMapCities, useSectors } from '../api/queries'
import { Flag } from '../components/graphics/Flag'
import { SectorIcon } from '../components/graphics/SectorIcon'
import { Hero } from '../components/media/Hero'
import { FrontPage } from '../components/front/FrontPage'
import { SectorRules } from '../components/news/SectorRules'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { DEFAULT_ROLES } from '../lib/map'
import { usePageTitle } from '../hooks/usePageTitle'
import { isSectorId, sectorLabel, type SectorId } from '../sectors'
import { NotFound } from './NotFound'
import { fromLibrary } from '../lib/imagery'
import { PAGE_IMAGES } from '../lib/pageImages'
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
  usePageTitle([label, scope].filter(Boolean).join(' · '))

  const heroImage = PAGE_IMAGES[`sector-${slug}`]
  return (
    <>
    <Hero
      image={heroImage ? fromLibrary(heroImage) : null}
      sector={slug}
      kicker={
        <>
          <SectorIcon sector={slug} size={14} /> Sector
        </>
      }
      title={label}
      lede={definition?.definition ?? ' '}
    />
    <div className={clsx('container', styles.page)}>

      <div className={styles.filtersWide}>
        <FilterTabs
          label="Filter by country"
          value={country}
          onChange={select}
          options={[
            { value: undefined, label: 'All countries' },
            ...(countries.data ?? []).map((c) => ({ value: c.iso2, label: c.name, leading: <Flag country={c.iso2} /> })),
          ]}
        />
      </div>

      {/* The stories come first: a lead, two more and Latest; how the tag works sits in the rail (below on phones). */}
      <FrontPage
        filters={{ country, sector: slug }}
        reservedImages={heroImage ? [heroImage.id] : []}
        countryNames={countryNames}
        emptyTitle={`Nothing new tagged ${label}${scope ? ` about ${scope}` : ''}`}
        emptyAction={scope ? <Button onClick={() => select()}>All countries</Button> : undefined}
        rail={
          <>
            <section aria-labelledby="top-places" className={styles.block}>
              <h2 id="top-places" className="kicker">
                Top places this week
              </h2>
              {topPlaces.length > 0 ? (
                <ol className={styles.places}>
                  {topPlaces.map((p) => (
                    <li key={p.id}>
                      <Link to={`/map/city/${p.id}?sector=${slug}`}>{p.name}</Link>
                      <span className="num">{p.total}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.note}>{map.data ? `No ${label} story is about one city this week.` : ' '}</p>
              )}
              <Link to={`/map?sector=${slug}`} className={styles.mapLink}>
                Open the {label} map →
              </Link>
            </section>

            <details className={styles.how}>
              <summary>How a story gets this tag</summary>
              {sectors.data && definition ? (
                <SectorRules rules={sectors.data} sector={definition} />
              ) : (
                <p className={styles.note}>
                  {sectors.isError ? 'The rules could not be loaded right now.' : 'Loading the rules…'}
                </p>
              )}
            </details>
          </>
        }
      />
    </div>
    </>
  )
}
