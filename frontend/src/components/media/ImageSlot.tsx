import clsx from 'clsx'
import { useState, type CSSProperties } from 'react'
import type { SlotImage } from '../../lib/imagery'
import { FallbackTile } from './FallbackTile'
import styles from './ImageSlot.module.css'

/**
 * The one image component: a fixed-ratio frame (space reserved, so nothing jumps) holding a
 * credited photo, or EastWire's own tile when there is none or the photo fails to load.
 * The label ("Illustrative image") and credit sit under it, or on it for `credit="overlay"`.
 */
export function ImageSlot({
  image,
  country,
  sector,
  seed,
  ratio = '16 / 9',
  sizes = '100vw',
  eager = false,
  credit = 'below',
  className,
}: {
  image: SlotImage | null | undefined
  country?: string
  sector?: string
  seed?: number
  /** CSS aspect-ratio, e.g. "3 / 2"; "fill" takes the parent's height. */
  ratio?: string
  sizes?: string
  eager?: boolean
  /** below: a line under the frame; overlay: on the photo; short: label and license only. */
  credit?: 'below' | 'overlay' | 'short'
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const photo = image && !failed ? image : null
  const style = (ratio === 'fill' ? {} : { aspectRatio: ratio }) as CSSProperties
  return (
    <figure className={clsx(styles.slot, ratio === 'fill' && styles.fill, credit === 'overlay' && styles.overlay, className)}>
      <div className={styles.frame} style={style}>
        {photo ? (
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={sizes}
            alt={photo.alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
            style={{ objectPosition: photo.position }}
          />
        ) : (
          <FallbackTile country={country} sector={sector} seed={seed} />
        )}
      </div>
      {photo && <Credit image={photo} short={credit === 'short'} />}
    </figure>
  )
}

/** "Illustrative image · Gateway of India, Mumbai. Photo: iMahesh, CC BY-SA 4.0" with both links. */
export function Credit({ image, short = false, className }: { image: SlotImage; short?: boolean; className?: string }) {
  return (
    <figcaption className={clsx(styles.credit, className)}>
      <span className={styles.label}>{image.label}</span>
      {!short && <span className={styles.subject}> · {image.caption}.</span>}{' '}
      <a href={image.filePage} target="_blank" rel="noopener noreferrer">
        {short ? image.credit : `Photo: ${image.credit}`}
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
  )
}
