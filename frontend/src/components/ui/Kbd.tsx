import type { ReactNode } from 'react'
import styles from './Kbd.module.css'

/** A keyboard key hint, e.g. <Kbd>/</Kbd> next to the search field. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>
}
