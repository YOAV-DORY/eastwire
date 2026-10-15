import { describe, expect, it } from 'vitest'
import { ApiError, FIRST_ATTEMPT_TIMEOUT_MS, TIMEOUT_MS } from './client'
import { retryPolicy } from './queries'

describe('bounded retries', () => {
  it('retries a sleeping or failing server three times, then stops', () => {
    const down = new ApiError('Could not reach the EastWire server', 0)
    expect([0, 1, 2].map((n) => retryPolicy.retry(n, down))).toEqual([true, true, true])
    expect(retryPolicy.retry(3, down)).toBe(false)
  })

  it('never retries a client error', () => {
    expect(retryPolicy.retry(0, new ApiError('Not found', 404))).toBe(false)
  })

  it('gives up within about 90 seconds, so the page can offer a retry', () => {
    const worstCase =
      FIRST_ATTEMPT_TIMEOUT_MS + [0, 1, 2].reduce((sum, attempt) => sum + retryPolicy.retryDelay(attempt) + TIMEOUT_MS, 0)
    expect(worstCase).toBeLessThanOrEqual(95_000)
  })
})
