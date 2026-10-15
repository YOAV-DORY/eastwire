import clsx from 'clsx'
import { useState, type ReactNode } from 'react'
import type { PageImage } from '../../lib/pageImages'
import styles from './PageHeader.module.css'

/**
 * The top of an inside page: a small kicker, the serif title and one lede paragraph, and
 * optionally a header photo: a Wikimedia Commons file of a place or subject, labelled and
 * credited under it, never a photo of a news event.
 */
export function PageHeader({
  kicker,
  title,
  lede,
  children,
  image,
  imageLabel = 'Illustrative image',
}: {
  kicker?: string
  title: ReactNode
  lede?: ReactNode
  /** Anything that belongs with the title, e.g. a notice or a state summary. */
  children?: ReactNode
  image?: PageImage
  /** What the picture is, shown before its credit (e.g. "Historical map"). */
  imageLabel?: string
}) {
  return (
    <header className={clsx(styles.header, image && styles.withImage)}>
      <div className={styles.text}>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {children}
      </div>
      {image && <HeaderImage image={image} label={imageLabel} />}
    </header>
  )
}

/** A credited header photo on its own, for pages whose header is laid out differently (Search). */
export function HeaderImage({ image, label = 'Illustrative image' }: { image: PageImage; label?: string }) {
  const [failed, setFailed] = useState(false)
  const url = (w: number) => image.url.replace('{width}', String(w))
  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        {/* If the photo cannot load, the frame keeps its size and shows the caption alone. */}
        {!failed && (
          <img
            src={url(960)}
            srcSet={`${url(500)} 500w, ${url(960)} 960w, ${url(1920)} 1920w`}
            sizes="(min-width: 1024px) 560px, 100vw"
            alt={image.alt}
            loading="eager"
            decoding="async"
            onError={() => setFailed(true)}
            style={{ objectPosition: image.position }}
          />
        )}
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.label}>{label}</span> <span className={styles.subject}>{image.caption}. </span>Photo:{' '}
        <a href={image.filePage} target="_blank" rel="noopener noreferrer">
          {image.credit}
          <span className="visually-hidden"> (file on Wikimedia Commons, opens in a new tab)</span>
        </a>
        {', '}
        {image.licenseUrl ? (
          <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer license">
            {image.license}
          </a>
        ) : (
          image.license
        )}
      </figcaption>
    </figure>
  )
}
