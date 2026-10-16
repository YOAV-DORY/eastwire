import { useEffect, useRef, useState } from 'react'

/**
 * A live figure. It never counts up from zero (a "0" would be a false number): the first value
 * shows as is, and when a newer value arrives (the live API replacing the snapshot) it rolls
 * from the old one to the new one in about half a second. Tabular figures, so nothing shifts;
 * under reduced motion it simply changes.
 */
const reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const began = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - began) / 500)
      setShown(Math.round(start + (value - start) * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{reduced() ? value : shown}</span>
      <span className="visually-hidden">{value}</span>
    </span>
  )
}
