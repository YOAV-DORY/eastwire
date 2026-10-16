import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useArticleFeed, useCountries, usePlaces, useSearch, useSearchSuggestions, useSectors, type SearchFilters } from '../api/queries'
import { ChevronDown, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { FilterTabs } from '../components/ui/FilterTabs'
import { Picker } from '../components/ui/Picker'
import { Flag } from '../components/graphics/Flag'
import { SectorIcon } from '../components/graphics/SectorIcon'
import { StoryCard } from '../components/news/StoryCard'
import { Hero } from '../components/media/Hero'
import { SearchBar } from '../components/search/SearchBar'
import { fromLibrary, storyImage } from '../lib/imagery'
import { PAGE_IMAGES } from '../lib/pageImages'
import { mainCountry } from '../components/front/storyCountry'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { useSlow } from '../hooks/useSlow'
import { usePageTitle } from '../hooks/usePageTitle'
import { SECTORS, isSectorId } from '../sectors'
import styles from './SearchPage.module.css'

/** Quick ranges instead of a date picker; "from" is a UTC day, as the API expects. */
const RANGES = [
  { label: 'Any time', days: 0 },
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
]
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

const PARAM_KEYS = ['q', 'country', 'city', 'sector', 'from', 'to', 'sort'] as const

/** Search with every filter in the URL, so any search can be shared or bookmarked. */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const filters: SearchFilters = {
    q: params.get('q') ?? '',
    country: params.get('country') ?? undefined,
    city: params.get('city') ?? undefined,
    sector: isSectorId(params.get('sector')) ? (params.get('sector') ?? undefined) : undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    sort: params.get('sort') === 'date' ? 'date' : 'relevance',
    page: Math.max(1, Number(params.get('page') ?? '1') || 1),
  }

  const countries = useCountries()
  const places = usePlaces(filters.country)
  const search = useSearch(filters)
  const suggestions = useSearchSuggestions()
  const examples = (suggestions.data ?? []).filter((s) => s.q.toLowerCase() !== filters.q.trim().toLowerCase())
  const slow = useSlow(search.isLoading)
  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )

  /** Change one filter; the page goes back to 1. Choosing a new country clears the city. */
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'country') next.delete('city')
    next.delete('page')
    setParams(next)
  }

  /** A published-since preset; replaces any custom range from a shared link. */
  const setRange = (from: string | undefined) => {
    const next = new URLSearchParams(params)
    if (from) next.set('from', from)
    else next.delete('from')
    next.delete('to')
    next.delete('page')
    setParams(next)
  }
  const customRange =
    Boolean(filters.to) || (filters.from !== undefined && !RANGES.some((r) => r.days && isoDaysAgo(r.days) === filters.from))

  const pageHref = (page: number) => {
    const next = new URLSearchParams()
    for (const key of PARAM_KEYS) {
      const v = params.get(key)
      if (v) next.set(key, v)
    }
    if (page > 1) next.set('page', String(page))
    return `/search?${next.toString()}`
  }

  const data = search.data
  const hasQuery = filters.q.trim().length >= 2
  const hasFilters = Boolean(filters.country || filters.city || filters.sector || filters.from || filters.to)
  const activeFilters = [filters.country, filters.city, filters.sector, filters.from || filters.to, filters.sort === 'date'].filter(Boolean).length
  const [filtersOpen, setFiltersOpen] = useState(false)
  usePageTitle(hasQuery ? `Search: ${filters.q.trim()}` : 'Search')

  const images = (() => {
    const used = new Set<string>([PAGE_IMAGES.search.id])
    return new Map((data?.items ?? []).map((a) => [a.id, storyImage(a, mainCountry(a), used) ?? undefined]))
  })()

  return (
    <>
      <Hero
        size="compact"
        image={fromLibrary(PAGE_IMAGES.search)}
        kicker="Search"
        title={hasQuery ? <>Results for &ldquo;{filters.q}&rdquo;</> : 'Search the wire'}
        lede="Headlines from China, India, South Korea and Japan, and the summaries our sources allow."
      >
        <div className={styles.heroSearch}>
          <SearchBar
        key={filters.q}
        variant="compact"
        initialQuery={filters.q}
        keep={{
          country: filters.country,
          city: filters.city,
          sector: filters.sector,
          from: filters.from,
          to: filters.to,
          sort: params.get('sort') ?? undefined,
        }}
        autoFocus={Boolean((location.state as { focusSearch?: boolean } | null)?.focusSearch)}
          />
        </div>
      </Hero>
    <div className={`container ${styles.page}`}>
      <div className={styles.main}>

      {/* Filters as chips (and one styled city picker), never raw browser selects. */}
      {/* Phones: the filters fold behind one button (five rows of chips otherwise push results off screen). */}
      <button
        type="button"
        className={styles.filterToggle}
        aria-expanded={filtersOpen}
        aria-controls="search-filters"
        onClick={() => setFiltersOpen((o) => !o)}
      >
        <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
        Filters
        {activeFilters > 0 && <span className={styles.filterCount}>{activeFilters}</span>}
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={styles.filterChevron} />
      </button>
      <div id="search-filters" className={styles.filterBlock} data-open={filtersOpen}>
        <FilterTabs
          quiet
          label="Filter by country"
          value={filters.country}
          onChange={(c) => update('country', c ?? '')}
          options={[
            { value: undefined, label: 'All countries' },
            ...(countries.data ?? []).map((c) => ({ value: c.iso2, label: c.name, leading: <Flag country={c.iso2} /> })),
          ]}
        />
        <FilterTabs
          quiet
          label="Filter by sector"
          value={filters.sector}
          onChange={(v) => update('sector', v ?? '')}
          options={[
            { value: undefined, label: 'All sectors' },
            ...SECTORS.map((sec) => ({ value: sec.id, label: sec.label, leading: <SectorIcon sector={sec.id} size={14} /> })),
          ]}
        />
        <div className={styles.filterRow}>
          <div className={styles.when} role="group" aria-label="Published">
            {RANGES.map((r) => {
              const from = r.days ? isoDaysAgo(r.days) : undefined
              const active = r.days ? filters.from === from && !filters.to : !filters.from && !filters.to
              return (
                <button key={r.label} type="button" aria-pressed={active} onClick={() => setRange(from)}>
                  {r.label}
                </button>
              )
            })}
            {customRange && (
              <button type="button" aria-pressed onClick={() => setRange(undefined)}>
                {filters.from ?? '…'} – {filters.to ?? 'now'} ×
              </button>
            )}
          </div>
          <div className={styles.segmented} role="group" aria-label="Order">
            <button type="button" aria-pressed={filters.sort !== 'date'} onClick={() => update('sort', '')}>
              Best match
            </button>
            <button type="button" aria-pressed={filters.sort === 'date'} onClick={() => update('sort', 'date')}>
              Newest
            </button>
          </div>
          {filters.country && (places.data?.length ?? 0) > 0 && (
            <Picker
              label="City"
              hideLabel
              icon={<MapPin size={16} strokeWidth={2} aria-hidden="true" />}
              value={filters.city ?? ''}
              onChange={(v) => update('city', v)}
            >
              <option value="">All cities</option>
              {(places.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Picker>
          )}
        </div>
      </div>

      {!hasQuery && <Discover examples={examples} countryNames={countryNames} />}

      {hasQuery && (
        <section aria-labelledby="results-title" className={styles.results} aria-busy={search.isFetching}>
          <h2 id="results-title" className={`${styles.count} kicker`}>
            {data ? `${data.total} ${data.total === 1 ? 'result' : 'results'}` : 'Searching…'}
            {data && data.total > data.size && ` · page ${data.page}`}
          </h2>

          {search.isLoading && (
            <>
              {slow && <ColdStart />}
              <FeedSkeleton />
            </>
          )}

          {search.isError && !data && (
            <ErrorState message="Search is unavailable right now." onRetry={() => void search.refetch()} />
          )}

          {data && data.items.length === 0 && (
            <>
              <EmptyState
                title={`Nothing in our sources matches “${filters.q}”`}
                action={
                  <div className={styles.emptyActions}>
                    {hasFilters && (
                      <Link to={`/search?q=${encodeURIComponent(filters.q)}`} className={styles.clear}>
                        Search without filters
                      </Link>
                    )}
                    {examples.length > 0 && <Suggestions items={examples.slice(0, 4)} label="These return stories now" />}
                  </div>
                }
              >
                Try fewer or different words{hasFilters ? ', or remove a filter' : ''}. Our list of sources is short, so a
                story you know about may simply not be in it.
              </EmptyState>
              <LatestStories countryNames={countryNames} title="Meanwhile, the latest" />
            </>
          )}

          {data && data.items.length > 0 && (
            <ol className={styles.list}>
              {data.items.map((a) => (
                <li key={a.id}>
                  <StoryCard article={a} variant="row" image={images.get(a.id)} countryNames={countryNames} />
                </li>
              ))}
            </ol>
          )}

          {data && (data.page > 1 || data.hasMore) && (
            <nav className={styles.pagination} aria-label="Result pages">
              {data.page > 1 ? (
                <Link to={pageHref(data.page - 1)} rel="prev">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="muted num">Page {data.page}</span>
              {data.hasMore ? (
                <Link to={pageHref(data.page + 1)} rel="next">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      )}
      </div>
      <aside className={styles.side} aria-label="Search help">
        <section className={styles.examples} aria-labelledby="try-title">
          {hasQuery && examples.length > 0 && (
            <>
              <h2 id="try-title" className="kicker">
                Other searches
              </h2>
              <Suggestions items={examples.slice(0, 8)} />
            </>
          )}
          {!hasQuery && (
            <h2 id="try-title" className="kicker">
              How to search
            </h2>
          )}
          <ul className={styles.syntax}>
            <li>
              <code>&quot;heat wave&quot;</code> exact phrase
            </li>
            <li>
              <code>election -Delhi</code> leave a word out
            </li>
            <li>
              <code>rupee OR yen</code> either word
            </li>
          </ul>
        </section>
        <Browse countries={countries.data ?? []} />
      </aside>
    </div>
    </>
  )
}

/** Searches that currently return stories, with how many. */
function Suggestions({ items, label }: { items: { q: string; count: number }[]; label?: string }) {
  return (
    <div className={styles.suggestions}>
      {label && <p className="muted">{label}:</p>}
      <ul>
        {items.map((s) => (
          <li key={s.q}>
            <Link to={`/search?q=${encodeURIComponent(s.q)}`}>
              {s.q} <span className={styles.suggestionCount}>{s.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The sidebar's second half: every sector and country with its live count, one tap away. */
function Browse({ countries }: { countries: { iso2: string; name: string; last24h: number }[] }) {
  const sectors = useSectors()
  return (
    <>
      <section className={styles.browse} aria-labelledby="browse-sectors">
        <h2 id="browse-sectors" className="kicker">
          Sectors this week
        </h2>
        <ul>
          {(sectors.data?.sectors ?? []).map((s) => (
            <li key={s.slug}>
              <Link to={`/sector/${s.slug}`}>
                <SectorIcon sector={s.slug} size={16} />
                {s.label}
                <span className="num">{s.last7d}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.browse} aria-labelledby="browse-countries">
        <h2 id="browse-countries" className="kicker">
          Countries, last 24 hours
        </h2>
        <ul>
          {countries.map((c) => (
            <li key={c.iso2}>
              <Link to={`/?country=${c.iso2}`}>
                <Flag country={c.iso2} size={20} />
                {c.name}
                <span className="num">{c.last24h}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/** The search page before anything is typed: what people can search for right now, and the latest news. */
function Discover({ examples, countryNames }: { examples: { q: string; count: number }[]; countryNames: Record<string, string> }) {
  return (
    <div className={styles.discover}>
      {examples.length > 0 && (
        <section aria-labelledby="trending-title" className={styles.trending}>
          <h2 id="trending-title" className={styles.blockTitle}>
            Trending in our sources
          </h2>
          <ul>
            {examples.slice(0, 10).map((s) => (
              <li key={s.q}>
                <Link to={`/search?q=${encodeURIComponent(s.q)}`}>
                  <Search size={15} strokeWidth={2.25} aria-hidden="true" />
                  {/* The space keeps the accessible name "bank 7", not "bank7". */}
                  {s.q} <span className="num">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <LatestStories countryNames={countryNames} title="Latest stories" />
    </div>
  )
}

/** The newest stories, with pictures where one truly matches, so the page is never empty. */
function LatestStories({ countryNames, title }: { countryNames: Record<string, string>; title: string }) {
  const feed = useArticleFeed({})
  const items = feed.data?.pages[0]?.items.slice(0, 8) ?? []
  const images = (() => {
    const used = new Set<string>([PAGE_IMAGES.search.id])
    return new Map(items.map((a) => [a.id, storyImage(a, mainCountry(a), used) ?? undefined]))
  })()
  return (
    <section aria-labelledby="latest-search-title" className={styles.latestBlock}>
      <h2 id="latest-search-title" className={styles.blockTitle}>
        {title}
      </h2>
      {feed.isLoading ? (
        <FeedSkeleton count={3} />
      ) : (
        <ol className={styles.list}>
          {items.map((a) => (
            <li key={a.id}>
              <StoryCard article={a} variant="row" image={images.get(a.id)} countryNames={countryNames} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
