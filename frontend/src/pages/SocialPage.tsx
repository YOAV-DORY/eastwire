import clsx from 'clsx'
import { useSearchParams } from 'react-router'
import { useCountries, useSocial } from '../api/queries'
import type { SocialPlatform } from '../api/types'
import { Flag } from '../components/graphics/Flag'
import { PageHeader } from '../components/layout/PageHeader'
import { SocialCard } from '../components/social/SocialCard'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { useSlow } from '../hooks/useSlow'
import { usePageTitle } from '../hooks/usePageTitle'
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

  usePageTitle('Social posts & videos')
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
    <div className={clsx('container', styles.page)}>
      <div className={styles.top}>
        <PageHeader
          kicker="Social"
          title="Posts & videos"
          lede="What newsrooms in and about the region are posting, from accounts we chose by hand. It sits apart from the news because it is not verified reporting."
        />
        <ul className={styles.rules} aria-label="How this section works">
          <li>
            <p>
              <strong>Not verified reporting.</strong> A post is what an account said, nothing more.
            </p>
          </li>
          <li>
            <p>
              <strong>Curated accounts only.</strong> Each card says why its account is listed.{' '}
              <a href={DOCS}>How accounts are chosen</a>
            </p>
          </li>
          <li>
            <p>
              <strong>Nothing loads until you ask.</strong> Bluesky and YouTube see your visit only after you press load.
            </p>
          </li>
        </ul>
      </div>

      <div className={styles.filters}>
        <FilterTabs
          label="Filter by platform"
          value={platform}
          onChange={(p) => select({ platform: p, country })}
          options={[{ value: undefined, label: 'All platforms' }, ...PLATFORMS]}
        />
        <FilterTabs
          quiet
          label="Filter by country"
          value={country}
          onChange={(c) => select({ platform, country: c })}
          options={[
            { value: undefined, label: 'All countries' },
            ...(countries.data ?? []).map((c) => ({ value: c.iso2, label: c.name, leading: <Flag country={c.iso2} /> })),
          ]}
        />
      </div>

      <section aria-labelledby="social-count" className={styles.list}>
        <h2 id="social-count" className="kicker">
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
        {items.length > 0 && (
          <ol className={styles.grid}>
            {items.map((item) => (
              <li key={item.id}>
                <SocialCard item={item} />
              </li>
            ))}
          </ol>
        )}
        {social.hasNextPage && (
          <Button size="lg" loading={social.isFetchingNextPage} onClick={() => void social.fetchNextPage()}>
            Load more posts
          </Button>
        )}
      </section>
    </div>
  )
}
