/**
 * Minimal API client. The base URL comes from VITE_API_BASE_URL at build time
 * (the Render URL in production); locally the API runs on port 8080.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/** A normal request's time limit. The first attempt of a query waits longer: see {@link FIRST_ATTEMPT_TIMEOUT_MS}. */
export const TIMEOUT_MS = 15_000
/** The free-tier server can take about a minute to wake; the first attempt waits for it. */
export const FIRST_ATTEMPT_TIMEOUT_MS = 30_000

/** A failed request. status 0 means the server could not be reached (e.g. still waking up). */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  /**
   * Worth retrying: network failures, timeouts, 5xx (the free-tier server may be asleep) and
   * 429 (the per-minute limit resets within a minute; the retry delays cover it).
   */
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500
  }
}

export type Params = Record<string, string | number | undefined | null>

export function buildUrl(path: string, params: Params = {}): string {
  const url = new URL(path, API_BASE_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function apiGet<T>(path: string, params: Params = {}, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(buildUrl(path, params), { signal: combined, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Could not reach the EastWire server', 0)
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    throw new ApiError(message, response.status)
  }
  return (await response.json()) as T
}
