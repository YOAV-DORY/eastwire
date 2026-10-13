import { useCallback, useState } from 'react'

export type Theme = 'dark' | 'light'

/** Same key as the inline script in index.html, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = 'eastwire.theme'

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/** Dark by default. The choice is remembered on this device only; storage failures are ignored. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage: the theme still applies for this visit.
    }
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return { theme, setTheme, toggle }
}
