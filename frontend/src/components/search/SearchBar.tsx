import clsx from 'clsx'
import { Search, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Kbd } from '../ui/Kbd'
import styles from './SearchBar.module.css'

/** Global shortcut "/" focuses the element with this attribute (see AppShell). */
export const SEARCH_INPUT_ATTR = 'data-search-input'

export interface SearchBarProps {
  /** hero: large, on the homepage; compact: on the search page. */
  variant?: 'hero' | 'compact'
  initialQuery?: string
  /** Extra URL parameters to keep when submitting (e.g. the active country). */
  keep?: Record<string, string | undefined>
  showShortcutHint?: boolean
  autoFocus?: boolean
}

export function SearchBar({ variant = 'hero', initialQuery = '', keep = {}, showShortcutHint = true, autoFocus }: SearchBarProps) {
  const navigate = useNavigate()
  const id = useId()
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = query.trim()
    if (text.length < 2) return
    const params = new URLSearchParams({ q: text })
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form role="search" className={clsx(styles.form, styles[variant])} onSubmit={submit}>
      <label htmlFor={id} className="visually-hidden">
        Search stories
      </label>
      <Search className={styles.icon} size={variant === 'hero' ? 20 : 16} strokeWidth={1.75} aria-hidden="true" />
      <input
        id={id}
        type="search"
        className={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search stories…"
        minLength={2}
        maxLength={200}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        {...{ [SEARCH_INPUT_ATTR]: '' }}
      />
      {showShortcutHint && !focused && query === '' && (
        <span className={styles.hint} aria-hidden="true">
          <Kbd>/</Kbd>
        </span>
      )}
      {query !== '' && (
        <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Clear search">
          <X size={16} strokeWidth={2} />
        </button>
      )}
      <button type="submit" className={styles.submit} aria-label="Search">
        <Search className={styles.submitIcon} size={18} strokeWidth={2.25} aria-hidden="true" />
        <span className={styles.submitLabel}>Search</span>
      </button>
    </form>
  )
}
