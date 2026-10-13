import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  // Some tests (e.g. tokens.test.ts) run in the plain Node environment without a DOM.
  if (typeof document === 'undefined') return
  cleanup()
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.clear()
})
