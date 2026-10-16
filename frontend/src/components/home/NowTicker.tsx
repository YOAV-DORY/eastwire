import { ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ArticleView } from '../../api/types'
import { fitWords } from '../../lib/fitWords'
import { relativeTime } from '../../lib/time'
import styles from './NowTicker.module.css'

const STEP_MS = 5500

/**
 * "Now in Asia": the newest headlines across the top of the front page, one at a time. Each is
 * shortened only between words, so no headline is ever cut mid-word. It turns every few seconds,
 * holds while pointed at or focused, has a pause button (WCAG 2.2.2) and a next button, and under
 * reduced motion changes only when asked. Each headline links to its source.
 */
export function NowTicker({ items }: { items: ArticleView[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const reduced = useReducedMotion()
  const count = items.length
  const current = count > 0 ? items[index % count] : undefined

  useEffect(() => {
    if (count < 2 || paused || held || reduced) return
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [count, index, paused, held, reduced])

  if (!current) {
    // Before the first headlines arrive: the band keeps its place and says what it is.
    return (
      <div className={styles.ticker} aria-hidden="true">
        <p className={styles.label}>
          <span className={styles.dot} />
          Now<span className={styles.labelMore}> in Asia</span>
        </p>
        <span className={styles.waiting} />
      </div>
    )
  }
  return (
    <section
      className={styles.ticker}
      aria-label="Now in Asia: newest headlines"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      <p className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        Now<span className={styles.labelMore}> in Asia</span>
      </p>
      <div className={styles.track}>
        <a key={current.id} className={styles.item} href={current.url} target="_blank" rel="noopener noreferrer">
          <span className={styles.when}>{relativeTime(current.publishedAt ?? current.discoveredAt)}</span>
          <FittedTitle text={current.title} />
          <span className="visually-hidden">
            {' '}
            ({current.publisher}, opens in a new tab)
          </span>
        </a>
      </div>
      {count > 1 && (
        <>
          <span className={styles.position} aria-hidden="true">
            {(index % count) + 1}/{count}
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label="Next headline"
          >
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
          {!reduced && (
            <button
              type="button"
              className={styles.button}
              onClick={() => setPaused(!paused)}
              aria-pressed={paused}
              aria-label={paused ? 'Play the headline ticker' : 'Pause the headline ticker'}
            >
              {paused ? <Play size={14} strokeWidth={2.25} aria-hidden="true" /> : <Pause size={14} strokeWidth={2.25} aria-hidden="true" />}
            </button>
          )}
        </>
      )}
    </section>
  )
}

/** The headline, shortened between words to the space it has (re-fitted when that changes). */
function FittedTitle({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [fitted, setFitted] = useState(text)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const canvas = document.createElement('canvas').getContext('2d')
    const fit = () => {
      if (!canvas) return
      canvas.font = getComputedStyle(el).font
      setFitted(fitWords(text, el.clientWidth, (s) => canvas.measureText(s).width))
    }
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(el)
    // Web fonts can arrive after the first fit and change the widths.
    void document.fonts?.ready.then(fit)
    return () => observer?.disconnect()
  }, [text])

  return (
    <span ref={ref} className={styles.title} title={fitted === text ? undefined : text}>
      <span aria-hidden={fitted === text ? undefined : true}>{fitted}</span>
      {fitted !== text && <span className="visually-hidden">{text}</span>}
    </span>
  )
}

function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
