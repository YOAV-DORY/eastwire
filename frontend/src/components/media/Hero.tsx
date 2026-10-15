import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'
import type { SlotImage } from '../../lib/imagery'
import { FallbackTile } from './FallbackTile'
import { Credit } from './ImageSlot'
import styles from './Hero.module.css'

/**
 * A full-bleed page hero: the picture fills the whole top of the page and the kicker, title
 * and a short description sit on it, over a gradient scrim that keeps them readable at any
 * width. The credit sits on the picture's bottom edge. The picture drifts slightly as the page
 * scrolls (not under reduced motion).
 */
export function Hero({
  image,
  kicker,
  title,
  lede,
  children,
  country,
  sector,
  size = 'standard',
}: {
  image: SlotImage | null
  kicker?: ReactNode
  title: ReactNode
  lede?: ReactNode
  /** Extra content on the hero, under the lede (stats, a search box). */
  children?: ReactNode
  /** For the drawn tile when there is no picture. */
  country?: string
  sector?: string
  size?: 'standard' | 'compact'
}) {
  const media = useRef<HTMLDivElement>(null)
  useParallax(media)
  return (
    <header className={clsx(styles.hero, styles[size])}>
      <div className={styles.media} ref={media}>
        {image ? (
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="100vw"
            alt={image.alt}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{ objectPosition: image.position }}
          />
        ) : (
          <FallbackTile country={country} sector={sector} seed={1} label={false} />
        )}
      </div>
      <div className={styles.scrim} aria-hidden="true" />
      <div className={clsx('container', styles.content)}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {children}
      </div>
      {image ? (
        <Credit image={image} className={styles.credit} />
      ) : (
        <p className={styles.credit}>
          <span>Illustration</span> · EastWire artwork
        </p>
      )}
    </header>
  )
}

/** Moves the picture up to 40px against the scroll, only while the hero is on screen. */
function useParallax(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.min(window.scrollY, 400)
      el.style.transform = `translate3d(0, ${(y * 0.1).toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [ref])
}
