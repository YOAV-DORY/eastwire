import clsx from 'clsx'
import type { IllustrativeImage } from '../../api/types'
import styles from './IllustrativeFigure.module.css'

/**
 * An illustrative photograph of the place or topic, never of the reported event, labelled as
 * such, with its creator, license and file page linked under it.
 */
export function IllustrativeFigure({
  image,
  variant,
  sizes,
  className,
}: {
  image: IllustrativeImage
  variant: 'lead' | 'thumb'
  sizes: string
  className?: string
}) {
  return (
    <figure className={clsx(styles.figure, styles[variant], className)}>
      <div className={styles.frame}>
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={sizes}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={variant === 'lead' ? 'eager' : 'lazy'}
          decoding="async"
          style={{ objectPosition: image.position }}
        />
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.label}>Illustrative image</span>
        {variant === 'lead' && <span className={styles.subject}>{image.caption}. </span>}
        <span>
          Photo:{' '}
          <a href={image.filePage} target="_blank" rel="noopener noreferrer">
            {image.attribution}
            <span className="visually-hidden"> (photo on Wikimedia Commons, opens in a new tab)</span>
          </a>
          {', '}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer license">
              {image.license}
            </a>
          ) : (
            image.license
          )}
          {variant === 'lead' && ', via Wikimedia Commons; cropped to fit'}
        </span>
      </figcaption>
    </figure>
  )
}
