import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { SocialItemView } from '../../api/types'
import { cleanPostText, initials } from '../../lib/postText'
import { postTopic, TOPIC_LABEL } from '../../lib/postTopic'
import { formatUtc, relativeTime } from '../../lib/time'
import { Button } from '../ui/Button'
import styles from './SocialCard.module.css'

const PLATFORM: Record<SocialItemView['platform'], string> = { bluesky: 'Bluesky', youtube: 'YouTube' }
const KIND: Record<SocialItemView['account']['kind'], string> = {
  newsroom: 'Newsroom',
  journalist: 'Journalist',
  official: 'Official account',
}
const BLUESKY_EMBED_SCRIPT = 'https://embed.bsky.app/static/embed.js'

/**
 * A curated social post or video. Nothing loads from the platform until the reader asks:
 * the card shows our stored text (links and "Read more:" lines removed) or the API thumbnail,
 * then the official embed on click. Prominent cards are larger; a topic accent (conflict,
 * economy, climate, politics, from the post's own words) changes the card's treatment only.
 */
export function SocialCard({ item, now, prominent = false }: { item: SocialItemView; now?: Date; prominent?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const text = cleanPostText(item.text)
  const topic = postTopic(item.title ?? text)
  return (
    <article className={clsx(styles.card, prominent && styles.prominent)} data-topic={topic ?? undefined}>
      <p className={styles.label}>
        <span>{item.platform === 'youtube' ? 'YouTube video' : 'Bluesky post'}</span>
        {topic && <span className={styles.topic}>{TOPIC_LABEL[topic]}</span>}
      </p>
      <header className={styles.header}>
        <span className={styles.badge} aria-hidden="true">
          {initials(item.account.name)}
        </span>
        <strong className={styles.account}>{item.account.name}</strong>
        <span className={styles.byline}>
          <span className={styles.handle}>{item.platform === 'bluesky' ? `@${item.account.handle}` : item.account.handle}</span>
          {` · ${PLATFORM[item.platform]} · ${KIND[item.account.kind]} · `}
          <time className="num" dateTime={item.createdAt} title={formatUtc(item.createdAt)}>
            {relativeTime(item.createdAt, now)}
          </time>
        </span>
      </header>

      {item.platform === 'bluesky' ? (
        loaded ? (
          <BlueskyEmbed item={item} />
        ) : (
          <blockquote className={styles.quote}>{text}</blockquote>
        )
      ) : loaded ? (
        <div className={styles.video}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.externalId)}`}
            title={item.title ?? 'YouTube video'}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <div className={styles.facade}>
          {item.thumbnailUrl && (
            <img src={item.thumbnailUrl} alt="" width={320} height={180} loading="lazy" className={styles.thumb} />
          )}
          <p className={styles.title}>{item.title}</p>
        </div>
      )}

      <div className={styles.actions}>
        {!loaded && (
          <Button variant="primary" onClick={() => setLoaded(true)}>
            {item.platform === 'bluesky' ? 'Load post from Bluesky' : 'Load video (YouTube may set cookies)'}
          </Button>
        )}
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.original}>
          Open post on {PLATFORM[item.platform]}
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>

      <Related item={item} />
      <p className={styles.why}>
        <span>Why this account</span> {item.account.reason}
      </p>
    </article>
  )
}

/** The official Bluesky embed: its markup plus its script, which swaps in the live post. */
function BlueskyEmbed({ item }: { item: SocialItemView }) {
  useEffect(() => {
    // The script scans the page for embeds when it runs, so add it again for each new embed.
    const script = document.createElement('script')
    script.src = BLUESKY_EMBED_SCRIPT
    script.async = true
    script.charset = 'utf-8'
    document.body.appendChild(script)
    return () => script.remove()
  }, [])
  return (
    <blockquote className="bluesky-embed" data-bluesky-uri={item.externalId} data-bluesky-cid={item.cid ?? undefined}>
      <p lang="en">{item.text}</p>— {item.account.name} (@{item.account.handle})
    </blockquote>
  )
}

function Related({ item }: { item: SocialItemView }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (item.related.length === 0) {
    return <p className={styles.related}>No matching report in our sources yet</p>
  }
  return (
    <div className={styles.relatedWrap}>
      <button
        type="button"
        className={styles.relatedButton}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        Related reporting: {item.related.length}
      </button>
      {open && (
        <ul id={id} className={styles.relatedList}>
          {item.related.map((r) => (
            <li key={r.articleId}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>{' '}
              <span className={styles.relatedMeta}>
                {r.publisher} · {r.linkType === 'shares_url' ? 'the post links to it' : 'same headline'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
