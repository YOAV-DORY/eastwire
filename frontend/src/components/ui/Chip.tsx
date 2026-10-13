import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Chip.module.css'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected chips are filled pink; exposed to assistive tech as aria-pressed. */
  selected?: boolean
  /** CSS color for the small leading dot, e.g. a sector color. */
  dotColor?: string
  leading?: ReactNode
  count?: number
}

/** A toggleable filter pill (sector, country). Color is never the only signal: the label stays. */
export function Chip({ selected = false, dotColor, leading, count, className, children, ...rest }: ChipProps) {
  return (
    <button type="button" aria-pressed={selected} className={clsx(styles.chip, className)} {...rest}>
      {dotColor && <span className={styles.dot} style={{ backgroundColor: dotColor }} aria-hidden="true" />}
      {leading}
      <span>{children}</span>
      {count !== undefined && (
        <>
          {' '}
          <span className={clsx(styles.count, 'mono')}>{count}</span>
        </>
      )}
    </button>
  )
}
