import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useCountries, usePlaces, useSearch, useSearchSuggestions, type SearchFilters } from '../api/queries'
import { StoryCard } from '../components/news/StoryCard'
import { HeaderImage } from '../components/layout/PageHeader'
import { SearchBar } from '../components/search/SearchBar'
import { PAGE_IMAGES } from '../lib/pageImages'
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
  usePageTitle(hasQuery ? `Search: ${filters.q.trim()}` : 'Search')

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.main}>
      <h1 className={styles.title}>{hasQuery ? <>Results for &ldquo;{filters.q}&rdquo;</> : 'Search'}</h1>
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
      <div className={styles.filters} role="group" aria-label="Filters">
        <label>
          <span>Country</span>
          <select value={filters.country ?? ''} onChange={(e) => update('country', e.target.value)}>
            <option value="">All</option>
            {(countries.data ?? []).map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {filters.country && (
          <label>
            <span>City</span>
            <select value={filters.city ?? ''} onChange={(e) => update('city', e.target.value)}>
              <option value="">All</option>
              {(places.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Sector</span>
          <select value={filters.sector ?? ''} onChange={(e) => update('sector', e.target.value)}>
            <option value="">All</option>
            {SECTORS.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Order</span>
          <select value={filters.sort} onChange={(e) => update('sort', e.target.value === 'date' ? 'date' : '')}>
            <option value="relevance">Best match</option>
            <option value="date">Newest</option>
          </select>
        </label>
      </div>

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
            <EmptyState
              title={`Nothing in our sources matches “${filters.q}”`}
              action={examples.length > 0 ? <Suggestions items={examples.slice(0, 3)} label="These return stories now" /> : undefined}
            >
              Try fewer or different words, or remove a filter. Our list of sources is short, so a story you know about
              may simply not be in it.
            </EmptyState>
          )}

          {data && data.items.length > 0 && (
            <ol className={styles.list}>
              {data.items.map((a) => (
                <li key={a.id}>
                  <StoryCard article={a} variant="standard" countryNames={countryNames} />
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
        <HeaderImage image={PAGE_IMAGES.search} />
        <section className={styles.examples} aria-labelledby="try-title">
          <h2 id="try-title" className="kicker">
            {hasQuery ? 'Other searches' : 'Try a search'}
          </h2>
          {examples.length > 0 ? (
            <Suggestions items={examples.slice(0, 8)} />
          ) : (
            <p className="muted">Search headlines and the summaries we are allowed to show.</p>
          )}
          <p className={styles.syntax}>
            Use quotes for an exact phrase (<code>&quot;heat wave&quot;</code>), a minus sign to leave a word out (
            <code>election -Delhi</code>) and OR for either word (<code>rupee OR yen</code>).
          </p>
        </section>
      </aside>
    </div>
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
