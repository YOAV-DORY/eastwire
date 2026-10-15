import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  // Some tests (e.g. tokens.test.ts) run in the plain Node environment without a DOM.
  if (typeof document === 'undefined') return
  cleanup()
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.clear()
})

// Leaflet needs real layout; component tests use a stand-in that lists the pins it was given.
vi.mock('../components/map/NewsMap', async () => {
  const { createElement } = await import('react')
  return {
    default: (props: { pins: { id: number; name: string }[] }) =>
      createElement('ul', { 'data-testid': 'news-map' }, props.pins.map((p) => createElement('li', { key: p.id }, p.name))),
  }
})

// jsdom has <dialog> but not its modal methods: open and close it the way browsers do.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
