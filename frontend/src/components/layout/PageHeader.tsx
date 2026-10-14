import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

/**
 * The top of an inside page: a small kicker, the serif title and one lede paragraph.
 * Every inside page opens the same way, so the rhythm comes from what follows.
 */
export function PageHeader({
  kicker,
  title,
  lede,
  children,
}: {
  kicker?: string
  title: ReactNode
  lede?: ReactNode
  /** Anything that belongs with the title, e.g. a notice or a state summary. */
  children?: ReactNode
}) {
  return (
    <header className={styles.header}>
      {kicker && <p className="kicker">{kicker}</p>}
      <h1 className={styles.title}>{title}</h1>
      {lede && <p className={styles.lede}>{lede}</p>}
      {children}
    </header>
  )
}
