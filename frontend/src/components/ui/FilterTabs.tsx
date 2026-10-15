import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
 * A row of text tabs that filter the page. The chosen one gets full-strength text and a
 * pink underline; the row scrolls sideways on phones instead of wrapping into a wall.
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
  const row = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  // On narrow screens the row scrolls; an arrow shows (and scrolls) while options are hidden.
  useEffect(() => {
    const el = row.current
    if (!el) return
    const update = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [options.length])
  return (
    <div className={styles.wrap}>
    <div ref={row} className={clsx(styles.row, quiet && styles.quiet)} role="group" aria-label={label}>
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
      {more && (
        <button
          type="button"
          className={styles.more}
          aria-label={`More ${label.replace(/^Filter by /, '')} options`}
          onClick={() => row.current?.scrollBy({ left: row.current.clientWidth * 0.7, behavior: 'smooth' })}
        >
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
