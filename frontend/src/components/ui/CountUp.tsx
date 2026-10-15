import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts up once when it first comes into view (about 0.8 s). The final value is
 * rendered from the start for screen readers and layout (tabular figures, so nothing shifts);
 * under reduced motion, or without IntersectionObserver, it simply shows the value.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)
  const done = useRef(false)
  useEffect(() => {
    const el = ref.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!el || reduced || done.current || typeof IntersectionObserver === 'undefined' || value < 2) {
      setShown(value)
      return
    }
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      done.current = true
      const start = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 800)
        setShown(Math.round(value * (1 - (1 - p) ** 3)))
        if (p < 1) frame = requestAnimationFrame(tick)
      }
      setShown(0)
      frame = requestAnimationFrame(tick)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value])
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{shown}</span>
      <span className="visually-hidden">{value}</span>
    </span>
  )
}
