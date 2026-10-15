import clsx from 'clsx'
import { useSearchParams } from 'react-router'
import { useCountries, useSocial } from '../api/queries'
import type { SocialPlatform } from '../api/types'
import { Flag } from '../components/graphics/Flag'
import { Hero } from '../components/media/Hero'
import { SocialCard } from '../components/social/SocialCard'
import { ColdStart, EmptyState, ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { Button } from '../components/ui/Button'
import { FilterTabs } from '../components/ui/FilterTabs'
import { useSlow } from '../hooks/useSlow'
import { usePageTitle } from '../hooks/usePageTitle'
import { fromLibrary } from '../lib/imagery'
import { PAGE_IMAGES } from '../lib/pageImages'
import { cleanPostText } from '../lib/postText'
import { postTopic, TOPIC_LABEL, type PostTopic } from '../lib/postTopic'
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
  const topicParam = params.get('topic')
  const topic = topicParam && topicParam in TOPIC_LABEL ? (topicParam as Exclude<PostTopic, null>) : undefined

  usePageTitle('Social posts & videos')
  const countries = useCountries()
  const social = useSocial({ platform, country })
  const slow = useSlow(social.isLoading)
  const all = social.data?.pages.flatMap((p) => p.items) ?? []
  const topicOf = (item: (typeof all)[number]) => postTopic(item.title ?? cleanPostText(item.text))
  const items = topic ? all.filter((item) => topicOf(item) === topic) : all
  const total = social.data?.pages[0]?.total ?? 0

  // Sidebar figures, from the posts loaded so far.
  const topics = (Object.keys(TOPIC_LABEL) as Exclude<PostTopic, null>[])
    .map((t) => ({ t, n: all.filter((item) => topicOf(item) === t).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  const sources = [...all.reduce((m, item) => m.set(item.account.name, (m.get(item.account.name) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const select = (next: { platform?: string; country?: string; topic?: string }) => {
    const p = new URLSearchParams()
    if (next.platform) p.set('platform', next.platform)
    if (next.country) p.set('country', next.country)
    if (next.topic) p.set('topic', next.topic)
    setParams(p)
  }

  return (
    <>
    <Hero
      image={fromLibrary(PAGE_IMAGES.social)}
      kicker="Social · not verified reporting"
      title="Posts & videos"
      lede="What newsrooms in and about the region are posting, from accounts we chose by hand. Kept apart from the news."
    />
    <div className={clsx('container', styles.page)}>

      <div className={styles.filters}>
        <FilterTabs
          label="Filter by platform"
          value={platform}
          onChange={(p) => select({ platform: p, country, topic })}
          options={[{ value: undefined, label: 'All platforms' }, ...PLATFORMS]}
        />
        <FilterTabs
          quiet
          label="Filter by country"
          value={country}
          onChange={(c) => select({ platform, country: c, topic })}
          options={[
            { value: undefined, label: 'All countries' },
            ...(countries.data ?? []).map((c) => ({ value: c.iso2, label: c.name, leading: <Flag country={c.iso2} /> })),
          ]}
        />
      </div>

      <div className={styles.layout}>
      <section aria-labelledby="social-count" className={styles.list}>
        <h2 id="social-count" className={styles.count}>
          {social.data
            ? topic
              ? `${items.length} ${TOPIC_LABEL[topic].toLowerCase()} ${items.length === 1 ? 'post' : 'posts'} of ${all.length} loaded`
              : `${total} ${total === 1 ? 'item' : 'items'} · last 30 days`
            : 'Loading…'}
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
        {social.data && topic && items.length === 0 && all.length > 0 && (
          <EmptyState title={`No ${TOPIC_LABEL[topic].toLowerCase()} posts among those loaded`} action={<Button onClick={() => select({ platform, country })}>All topics</Button>}>
            Topics come from words in each post; load more posts or clear the topic.
          </EmptyState>
        )}
        {social.data && all.length === 0 && (
          <EmptyState title="No posts from our curated accounts for this filter">
            {platform === 'youtube'
              ? 'Videos appear once the YouTube connection is switched on.'
              : 'Our list of accounts is short on purpose; an empty filter is not an absence of news.'}
          </EmptyState>
        )}
        {items.length > 0 && (
          <ol className={styles.grid}>
            {items.map((item, i) => {
              // A rhythm of sizes: the first post and every fifth after it are prominent.
              const prominent = i % 5 === 0
              return (
                <li key={item.id} className={clsx('reveal', prominent && styles.wide)}>
                  <SocialCard item={item} prominent={prominent} />
                </li>
              )
            })}
          </ol>
        )}
        {social.hasNextPage && (
          <Button size="lg" loading={social.isFetchingNextPage} onClick={() => void social.fetchNextPage()}>
            Load more posts
          </Button>
        )}
      </section>
      <aside className={styles.side} aria-label="Topics and sources">
        <section className={styles.sideBlock} aria-labelledby="social-topics">
          <h2 id="social-topics" className={styles.sideTitle}>
            Trending topics
          </h2>
          {topics.length > 0 ? (
            <ul className={styles.sideList}>
              {topics.map(({ t, n }) => (
                <li key={t}>
                  <button
                    type="button"
                    data-topic={t}
                    aria-pressed={topic === t}
                    onClick={() => select({ platform, country, topic: topic === t ? undefined : t })}
                  >
                    {TOPIC_LABEL[t]}
                    <span className="num">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>{social.isLoading ? 'Loading…' : 'No topic words in these posts.'}</p>
          )}
          <p className={styles.note}>From words in the posts loaded so far; a display aid, not a classification.</p>
        </section>
        <section className={styles.sideBlock} aria-labelledby="social-sources">
          <h2 id="social-sources" className={styles.sideTitle}>
            Top sources
          </h2>
          <ol className={styles.sources}>
            {sources.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <span className="num">{n}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.sideBlock} aria-labelledby="social-how">
          <h2 id="social-how" className={styles.sideTitle}>
            How this works
          </h2>
          <p className={styles.note}>
            Nothing loads from Bluesky or YouTube until you press load. Accounts are newsrooms, journalists and official
            accounts we chose by hand. <a href={DOCS}>How accounts are chosen</a>
          </p>
        </section>
      </aside>
      </div>
    </div>
    </>
  )
}
