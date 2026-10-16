import { ArrowRight, ArrowUpRight, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useArticleFeed, useSocial } from '../../api/queries'
import type { CityPin, MapData } from '../../api/types'
import { cityImage } from '../../lib/imagery'
import { cleanPostText, initials } from '../../lib/postText'
import { postTopic, TOPIC_LABEL } from '../../lib/postTopic'
import { relativeTime } from '../../lib/time'
import { LazyNewsMap } from '../map/LazyNewsMap'
import { ImageSlot } from '../media/ImageSlot'
import { StoryKicker, StoryTime } from '../news/StoryCard'
import { CountUp } from '../ui/CountUp'
import styles from './Companion.module.css'

/**
 * The map beside the news. Choosing a pin opens a preview card under the map: the city's
 * picture (or EastWire's tile), its newest story and a way into the city on the full map.
 */
export function MapCompanion({
  data,
  countryNames,
  country,
  highlightedId,
}: {
  data?: MapData
  countryNames: Record<string, string>
  country?: string
  highlightedId?: number | null
}) {
  const [pin, setPin] = useState<CityPin | null>(null)
  const choose = useCallback((p: CityPin) => setPin(p), [])
  const countryOnly = (data?.countryOnly ?? []).filter((c) => c.count > 0)
  return (
    <section className={styles.panel} aria-labelledby="companion-map">
      <h2 id="companion-map" className={styles.panelTitle}>
        Where this week&apos;s stories are
      </h2>
      <LazyNewsMap
        height="280px"
        label="Map of this week's stories by city"
        pins={data?.cities ?? []}
        onSelect={choose}
        selectedId={pin?.id}
        highlightedId={highlightedId}
        staticOnTouch
      />
      <div aria-live="polite">
        {pin ? (
          <CityPreview pin={pin} countryNames={countryNames} onClose={() => setPin(null)} />
        ) : (
          <p className={styles.note}>Choose a pin to preview its newest story.</p>
        )}
      </div>
      {countryOnly.length > 0 && (
        <p className={styles.note}>
          Not tied to one city:{' '}
          {countryOnly.map((c, i) => (
            <span key={c.country} className="num">
              {i > 0 && ' · '}
              {countryNames[c.country] ?? c.country} {c.count}
            </span>
          ))}
        </p>
      )}
      <Link to={country ? `/map?country=${country}` : '/map'} className={styles.more}>
        Open the full map <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </section>
  )
}

/** One city's newest story as a small card with a picture. */
function CityPreview({ pin, countryNames, onClose }: { pin: CityPin; countryNames: Record<string, string>; onClose: () => void }) {
  const [from] = useState(() => new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10))
  const feed = useArticleFeed({ city: String(pin.id), country: pin.country, from })
  const story = feed.data?.pages[0]?.items[0]
  return (
    <article className={styles.preview} aria-labelledby={`preview-${pin.id}`}>
      <div className={styles.previewMedia}>
        <ImageSlot image={cityImage(pin.id)} country={pin.country} seed={pin.id} ratio="16 / 9" sizes="340px" credit="short" />
      </div>
      <div className={styles.previewBody}>
        <p className={styles.previewCity}>
          <strong id={`preview-${pin.id}`}>{pin.name}</strong>
          <span className="num">
            {pin.total} {pin.total === 1 ? 'story' : 'stories'} this week
          </span>
        </p>
        {story ? (
          <>
            <StoryKicker article={story} countryNames={countryNames} />
            <h3 className={styles.previewHeadline}>
              <a href={story.url} target="_blank" rel="noopener noreferrer">
                {story.title}
                <span className="visually-hidden"> (read at {story.publisher}, opens in a new tab)</span>
              </a>
            </h3>
            <p className={styles.previewMeta}>
              {story.publisher} · <StoryTime article={story} />
            </p>
          </>
        ) : (
          <p className={styles.note}>{feed.isPending ? 'Loading its newest story…' : 'No story about it in the last 7 days.'}</p>
        )}
        <Link to={`/map/city/${pin.id}`} className={styles.more}>
          All {pin.name} stories <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <button type="button" className={styles.previewClose} onClick={onClose} aria-label={`Close the ${pin.name} preview`}>
        <X size={16} strokeWidth={2.25} />
      </button>
    </article>
  )
}

/** Three live figures from the API; a figure appears only once there is a real one. */
export function LiveStats({ stories, cities, outlets }: { stories?: number; cities?: number; outlets?: number }) {
  const stats = [
    { value: stories, label: 'stories in the last 24 hours' },
    { value: cities, label: 'cities on the map this week' },
    { value: outlets, label: 'news outlets in the last 24 hours' },
  ]
  return (
    <section className={styles.panel} aria-labelledby="live-stats">
      <h2 id="live-stats" className={styles.panelTitle}>
        Live
      </h2>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt className={styles.statLabel}>{s.label}</dt>
            <dd className={styles.statValue}>{s.value === undefined ? '–' : <CountUp value={s.value} />}</dd>
          </div>
        ))}
      </dl>
      <Link to="/sources" className={styles.more}>
        Where the news comes from <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </section>
  )
}

/** Four recent posts from the curated newsrooms, visibly apart from the news, each with its topic accent. */
export function SocialPreview({ country }: { country?: string }) {
  const social = useSocial({ country, size: 4 })
  const items = social.data?.pages[0]?.items ?? []
  if (items.length === 0) return null
  return (
    <section className={styles.social} aria-labelledby="companion-social">
      <div className={styles.socialHead}>
        <h2 id="companion-social" className={styles.socialTitle}>
          From newsrooms on social
        </h2>
        <p className={styles.label}>Not verified reporting</p>
        <Link to={country ? `/social?country=${country}` : '/social'} className={styles.more}>
          All posts and videos <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <ul className={styles.posts}>
        {items.map((item) => {
          const text = cleanPostText(item.title ?? item.text)
          const topic = postTopic(text)
          return (
            <li key={item.id} className={styles.post} data-topic={topic ?? undefined}>
              {topic && <p className={styles.topic}>{TOPIC_LABEL[topic]}</p>}
              <p className={styles.postText}>{text}</p>
              <p className={styles.postSource}>
                <span className={styles.badge} aria-hidden="true">
                  {initials(item.account.name)}
                </span>
                <span>
                  <strong>{item.account.name}</strong>
                  <span className={styles.postWhen}>
                    {item.platform === 'bluesky' ? 'Bluesky' : 'YouTube'} · {relativeTime(item.createdAt)}
                  </span>
                </span>
              </p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.postLink}>
                Open post <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                <span className="visually-hidden"> by {item.account.name} (opens in a new tab)</span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
