import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useArticleFeed, useCountries, usePlaces, useStatus } from '../api/queries'
import { Flag } from '../components/graphics/Flag'
import { HeroMark } from '../components/graphics/HeroMark'
import { StoryCard } from '../components/news/StoryCard'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton, StaleBanner } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { relativeTime } from '../lib/time'
import styles from './Home.module.css'

/** Show the cold-start note if the first load takes longer than this (free tier waking up). */
const COLD_START_AFTER_MS = 3_000

export function Home() {
  const [params, setParams] = useSearchParams()
  const country = params.get('country') ?? undefined
  const city = params.get('city') ?? undefined

  const countries = useCountries()
  const places = usePlaces(country)
  const status = useStatus()
  const feed = useArticleFeed({ country, city })

  const countryNames = useMemo(
    () => Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name])),
    [countries.data],
  )
  const cityName = places.data?.find((p) => String(p.id) === city)?.name
  const scope = cityName ?? (country ? (countryNames[country] ?? country) : undefined)

  const slow = useSlow(feed.isLoading)
  const items = feed.data?.pages.flatMap((p) => p.items) ?? []
  const total = feed.data?.pages[0]?.total ?? 0

  const select = (next: { country?: string; city?: string }) => {
    const p = new URLSearchParams()
    if (next.country) p.set('country', next.country)
    if (next.city) p.set('city', next.city)
    setParams(p)
  }

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

      {(status.data?.state === 'stale' || status.data?.state === 'outage') && status.data.lastSuccessAt && (
        <StaleBanner
          state={status.data.state}
          detail={`Stories below were last refreshed ${relativeTime(status.data.lastSuccessAt)}.`}
        />
      )}

      <div className={styles.filters} role="group" aria-label="Filter by country">
        <Chip selected={!country} onClick={() => select({})}>
          All
        </Chip>
        {(countries.data ?? []).map((c) => (
          <Chip
            key={c.iso2}
            selected={country === c.iso2}
            leading={<Flag country={c.iso2} />}
            count={c.last24h}
            title={`${c.last24h} stories in the last 24 hours`}
            onClick={() => select({ country: c.iso2 })}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {country && (places.data?.length ?? 0) > 0 && (
        <label className={styles.cityPicker}>
          <span className="mono muted">City</span>
          <select value={city ?? ''} onChange={(e) => select({ country, city: e.target.value || undefined })}>
            <option value="">All of {countryNames[country] ?? country}</option>
            {places.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <section aria-labelledby="latest-title" className={styles.feed}>
        <h2 id="latest-title" className={`${styles.feedTitle} mono muted`}>
          Latest{scope ? ` · ${scope}` : ''}
          {feed.data && ` · ${total} ${total === 1 ? 'story' : 'stories'}`}
        </h2>

        {feed.isLoading && (
          <>
            {slow && <ColdStart />}
            <FeedSkeleton />
          </>
        )}

        {feed.isError && !feed.data && (
          <ErrorState
            message="The server did not answer. It may be waking up or temporarily down."
            onRetry={() => void feed.refetch()}
          />
        )}

        {feed.data && items.length === 0 && (
          <EmptyState
            title={`Nothing from our sources${scope ? ` for ${scope}` : ''} right now`}
            action={
              scope ? (
                <Button onClick={() => select(city ? { country } : {})}>
                  {city ? `All of ${countryNames[country ?? ''] ?? country}` : 'All countries'}
                </Button>
              ) : undefined
            }
          >
            This reflects our limited list of sources, not an absence of news.
          </EmptyState>
        )}

        {items.length > 0 && (
          <ol className={styles.list}>
            {items.map((a) => (
              <li key={a.id}>
                <StoryCard article={a} countryNames={countryNames} />
              </li>
            ))}
          </ol>
        )}

        {feed.hasNextPage && (
          <Button size="lg" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
            Load more
          </Button>
        )}
      </section>
    </div>
  )
}

/** True once a load has taken longer than COLD_START_AFTER_MS. */
function useSlow(loading: boolean): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), COLD_START_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [loading])
  return loading && slow
}
