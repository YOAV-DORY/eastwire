import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './FilterTabs.module.css'

export interface FilterOption {
  value: string | undefined
  label: string
  leading?: ReactNode
  /** A small count after the label, e.g. stories in the last 24 hours. */
  count?: number
  countTitle?: string
}

/**
 * A set of pill chips that filter the page. The chosen one is solid brand red with white
 * text. Chips wrap onto more lines on narrow screens, so no label or count is ever cut.
 */
export function FilterTabs({
  label,
  options,
  value,
  onChange,
  quiet = false,
}: {
  label: string
  options: FilterOption[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  /** A secondary row: smaller text. */
  quiet?: boolean
}) {
  return (
    <div className={styles.wrap}>
    <div className={clsx(styles.row, quiet && styles.quiet)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value ?? 'all'}
          type="button"
          className={styles.tab}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          title={o.countTitle}
        >
          {o.leading}
          {o.label}
          {/* The space keeps the accessible name "India 78", not "India78"; flex layout drops it visually. */}
          {o.count !== undefined && <> <span className={styles.count}>{o.count}</span></>}
        </button>
      ))}
    </div>
    </div>
  )
}
