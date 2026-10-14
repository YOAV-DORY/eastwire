import { useSearchParams } from 'react-router'
import { useCountries, useSocial } from '../api/queries'
import type { SocialPlatform } from '../api/types'
import { Flag } from '../components/graphics/Flag'
import { SocialCard } from '../components/social/SocialCard'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { useSlow } from '../hooks/useSlow'
import styles from './SocialPage.module.css'

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'youtube', label: 'YouTube' },
]
const DOCS = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs/social.md'

/** /social — curated posts and videos, kept apart from the news and labelled as such. */
export function SocialPage() {
  const [params, setParams] = useSearchParams()
  const platformParam = params.get('platform')
  const platform = PLATFORMS.find((p) => p.value === platformParam)?.value
  const country = params.get('country') ?? undefined

  const countries = useCountries()
  const social = useSocial({ platform, country })
  const slow = useSlow(social.isLoading)
  const items = social.data?.pages.flatMap((p) => p.items) ?? []
  const total = social.data?.pages[0]?.total ?? 0

  const select = (next: { platform?: string; country?: string }) => {
    const p = new URLSearchParams()
    if (next.platform) p.set('platform', next.platform)
    if (next.country) p.set('country', next.country)
    setParams(p)
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Social posts &amp; videos</h1>
        <p className={styles.notice}>Not verified reporting. Shown from curated accounts.</p>
        <p className="muted">
          Posts and videos from newsrooms we chose by hand, each with the reason it is listed. A place tag means the post
          itself names that place. Nothing loads from Bluesky or YouTube until you press load.{' '}
          <a href={DOCS}>How accounts are chosen</a>
        </p>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter by platform">
        <Chip selected={!platform} onClick={() => select({ country })}>
          All
        </Chip>
        {PLATFORMS.map((p) => (
          <Chip key={p.value} selected={platform === p.value} onClick={() => select({ platform: p.value, country })}>
            {p.label}
          </Chip>
        ))}
      </div>
      <div className={styles.filters} role="group" aria-label="Filter by country">
        <Chip selected={!country} onClick={() => select({ platform })}>
          All countries
        </Chip>
        {(countries.data ?? []).map((c) => (
          <Chip
            key={c.iso2}
            selected={country === c.iso2}
            leading={<Flag country={c.iso2} />}
            onClick={() => select({ platform, country: c.iso2 })}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      <section aria-labelledby="social-count" className={styles.list}>
        <h2 id="social-count" className={`${styles.count} mono muted`}>
          {social.data ? `${total} ${total === 1 ? 'item' : 'items'} · last 30 days` : 'Loading…'}
        </h2>
        {social.isLoading && (
          <>
            {slow && <ColdStart />}
            <FeedSkeleton count={3} />
          </>
        )}
        {social.isError && !social.data && (
          <ErrorState message="Social posts are unavailable right now." onRetry={() => void social.refetch()} />
        )}
        {social.data && items.length === 0 && (
          <EmptyState title="No posts from our curated accounts for this filter">
            {platform === 'youtube'
              ? 'Videos appear once the YouTube connection is switched on.'
              : 'Our list of accounts is short on purpose; an empty filter is not an absence of news.'}
          </EmptyState>
        )}
        <ol className={styles.grid}>
          {items.map((item) => (
            <li key={item.id}>
              <SocialCard item={item} />
            </li>
          ))}
        </ol>
        {social.hasNextPage && (
          <Button size="lg" loading={social.isFetchingNextPage} onClick={() => void social.fetchNextPage()}>
            Load more
          </Button>
        )}
      </section>
    </div>
  )
}
