import { useEffect, useState } from 'react'

/** Show the cold-start note if a load takes longer than this (free-tier server waking up). */
export const COLD_START_AFTER_MS = 3_000

/** True once a load has been running for longer than {@link COLD_START_AFTER_MS}. */
export function useSlow(loading: boolean): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), COLD_START_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [loading])
  return loading && slow
}
