import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCountries, usePlaces, useSearch, type SearchFilters } from '../api/queries'
import { StoryCard } from '../components/news/StoryCard'
import { SearchBar } from '../components/search/SearchBar'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { useSlow } from '../hooks/useSlow'
import styles from './SearchPage.module.css'

const EXAMPLES = ['semiconductors', '"heat wave"', 'rupee OR inflation', 'election -Delhi']
const PARAM_KEYS = ['q', 'country', 'city', 'from', 'to', 'sort'] as const

/** Search with every filter in the URL, so any search can be shared or bookmarked. */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const filters: SearchFilters = {
    q: params.get('q') ?? '',
    country: params.get('country') ?? undefined,
    city: params.get('city') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    sort: params.get('sort') === 'date' ? 'date' : 'relevance',
    page: Math.max(1, Number(params.get('page') ?? '1') || 1),
  }

  const countries = useCountries()
  const places = usePlaces(filters.country)
  const search = useSearch(filters)
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

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{hasQuery ? <>Results for &ldquo;{filters.q}&rdquo;</> : 'Search'}</h1>
      <SearchBar
        key={filters.q}
        variant="compact"
        initialQuery={filters.q}
        keep={{ country: filters.country, city: filters.city, from: filters.from, to: filters.to, sort: params.get('sort') ?? undefined }}
        autoFocus={!hasQuery}
      />

      <div className={styles.filters} role="group" aria-label="Filters">
        <label>
          <span className="mono muted">Country</span>
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
            <span className="mono muted">City</span>
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
          <span className="mono muted">From</span>
          <input type="date" value={filters.from ?? ''} max={filters.to} onChange={(e) => update('from', e.target.value)} />
        </label>
        <label>
          <span className="mono muted">To</span>
          <input type="date" value={filters.to ?? ''} min={filters.from} onChange={(e) => update('to', e.target.value)} />
        </label>
        <label>
          <span className="mono muted">Order</span>
          <select value={filters.sort} onChange={(e) => update('sort', e.target.value === 'date' ? 'date' : '')}>
            <option value="relevance">Best match</option>
            <option value="date">Newest</option>
          </select>
        </label>
      </div>

      {!hasQuery && (
        <div className={styles.examples}>
          <p className="muted">Search headlines and permitted excerpts. Try:</p>
          <ul>
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <Link to={`/search?q=${encodeURIComponent(ex)}`} className="mono">
                  {ex}
                </Link>
              </li>
            ))}
          </ul>
          <p className="muted">Quotes find exact phrases, a minus sign excludes a word, and OR finds either word.</p>
        </div>
      )}

      {hasQuery && (
        <section aria-labelledby="results-title" className={styles.results} aria-busy={search.isFetching}>
          <h2 id="results-title" className={`${styles.count} mono muted`}>
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
            <EmptyState title={`No stories in our sources match “${filters.q}”`}>
              Try fewer or different words, or remove a filter. Our source list is limited, so a missing story may
              simply not be covered.
            </EmptyState>
          )}

          {data && data.items.length > 0 && (
            <ol className={styles.list}>
              {data.items.map((a) => (
                <li key={a.id}>
                  <StoryCard article={a} countryNames={countryNames} />
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
              <span className="mono muted">Page {data.page}</span>
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
  )
}
