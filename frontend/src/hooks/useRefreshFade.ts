import { useEffect, useRef, type RefObject } from 'react'

/**
 * When fresher data replaces what is on screen (the saved snapshot, then live news), the block
 * fades up from slightly dimmed, so the change is noticed but nothing jumps. Not on first paint,
 * and not under reduced motion. `data` is the query's data object: a new object means new data.
 */
export function useRefreshFade<T extends HTMLElement>(data: unknown): RefObject<T | null> {
  const ref = useRef<T>(null)
  const previous = useRef<unknown>(data)
  useEffect(() => {
    const before = previous.current
    previous.current = data
    const el = ref.current
    if (!el || before === undefined || before === data || data === undefined) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof el.animate !== 'function') return
    el.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
  }, [data])
  return ref
}
