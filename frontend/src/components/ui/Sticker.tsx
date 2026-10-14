import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Sticker.module.css'

export interface StickerProps {
  /** "new": chunky pink badge for items found in the last hour. "country": flag/code sticker. */
  variant?: 'new' | 'country'
  /** Slight rotation, Gumroad-style. Only in the sidebar and hero, never inside dense cards. */
  tilt?: boolean
  leading?: ReactNode
  children: ReactNode
  className?: string
}

export function Sticker({ variant = 'new', tilt = variant === 'new', leading, children, className }: StickerProps) {
  return (
    <span className={clsx(styles.sticker, styles[variant], tilt && styles.tilt, className)}>
      {leading}
      {children}
    </span>
  )
}
