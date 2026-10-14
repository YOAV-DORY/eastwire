import clsx from 'clsx'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  width?: string
  height?: string
  /** "text" lines get the small radius; "block" panels get the card radius. */
  shape?: 'text' | 'block'
  className?: string
}

/** Loading placeholder. Give it the same size as the content it stands in for, so nothing shifts. */
export function Skeleton({ width = '100%', height = '1em', shape = 'text', className }: SkeletonProps) {
  return <span className={clsx(styles.skeleton, styles[shape], className)} style={{ width, height }} aria-hidden="true" />
}
