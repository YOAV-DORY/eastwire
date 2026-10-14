import styles from './Wordmark.module.css'

/** EastWire's own wordmark: a small pin glyph and the name. */
export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 2a8 8 0 0 1 8 8c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 8-8Z"
          fill="currentColor"
          className={styles.pin}
        />
        <circle cx="12" cy="10" r="3" fill="var(--bg)" />
      </svg>
      EastWire
    </span>
  )
}
