import styles from './Wordmark.module.css'

/** EastWire's own wordmark: a small pin glyph, then "East" upright and "Wire" in italic. */
export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true" focusable="false" className={styles.pin}>
        <path d="M8 0a8 8 0 0 1 8 8c0 5.5-8 12-8 12S0 13.5 0 8a8 8 0 0 1 8-8Z" fill="currentColor" />
        <circle cx="8" cy="8" r="2.75" fill="var(--bg)" />
      </svg>
      <span>
        East<em>Wire</em>
      </span>
    </span>
  )
}
