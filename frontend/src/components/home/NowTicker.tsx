import clsx from 'clsx'
import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import type { ArticleView } from '../../api/types'
import { relativeTime } from '../../lib/time'
import styles from './NowTicker.module.css'

/**
 * "Now in Asia": the newest headlines running across the top of the front page. It moves slowly,
 * stops while pointed at or focused, has a pause button (WCAG 2.2.2), and stands still under
 * reduced motion, where the row scrolls by hand instead. Each headline links to its source.
 */
export function NowTicker({ items }: { items: ArticleView[] }) {
  const [paused, setPaused] = useState(false)
  if (items.length === 0) return <div className={styles.ticker} aria-hidden="true" />
  const list = (copy: boolean) => (
    <ul className={styles.list} aria-hidden={copy || undefined}>
      {items.map((a) => (
        <li key={a.id}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" tabIndex={copy ? -1 : undefined}>
            <span className={styles.when}>{relativeTime(a.publishedAt ?? a.discoveredAt)}</span>
            {a.title}
            <span className="visually-hidden"> ({a.publisher}, opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
  return (
    <section className={styles.ticker} aria-label="Now in Asia: newest headlines">
      <p className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        Now in Asia
      </p>
      <div className={clsx(styles.track, paused && styles.paused)} style={{ ['--n' as string]: items.length }}>
        <div className={styles.belt}>
          {list(false)}
          {list(true)}
        </div>
      </div>
      <button
        type="button"
        className={styles.pause}
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        aria-label={paused ? 'Play the headline ticker' : 'Pause the headline ticker'}
      >
        {paused ? <Play size={14} strokeWidth={2.25} aria-hidden="true" /> : <Pause size={14} strokeWidth={2.25} aria-hidden="true" />}
      </button>
    </section>
  )
}
