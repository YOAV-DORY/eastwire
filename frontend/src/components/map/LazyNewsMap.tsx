import { lazy, Suspense } from 'react'
import type { NewsMapProps } from './NewsMap'
import styles from './LazyNewsMap.module.css'

const NewsMap = lazy(() => import('./NewsMap'))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

/**
 * The map in a box of fixed height, so the page does not jump while Leaflet loads.
 * The box is labelled for screen readers; the city list view is the accessible alternative.
 */
export function LazyNewsMap({ height, label, ...props }: NewsMapProps & { height: string; label: string }) {
  return (
    <div className={styles.box} style={{ height }} role="region" aria-label={label}>
      <Suspense
        fallback={
          <div className={styles.placeholder} aria-hidden="true">
            <span>Drawing the map…</span>
          </div>
        }
      >
        <NewsMap {...props} reducedMotion={prefersReducedMotion()} />
      </Suspense>
    </div>
  )
}
