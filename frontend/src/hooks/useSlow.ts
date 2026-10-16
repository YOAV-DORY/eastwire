import { useEffect, useState } from 'react'

/** Show the neutral loading note if a load with nothing on screen takes longer than this. */
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
