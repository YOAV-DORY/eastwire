import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { routes } from '../routes'

/** Canned API responses by path (e.g. "/api/v1/articles"); a function can inspect the query. */
export type ApiStub = Record<string, unknown | ((url: URL) => unknown)>

/**
 * Replaces fetch with canned API responses. Unknown paths answer 404, which the client does
 * not retry, so error states render immediately.
 */
export function stubApi(stub: ApiStub) {
  const calls: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString())
      calls.push(url)
      const entry = stub[url.pathname]
      if (entry === undefined) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      const body = typeof entry === 'function' ? (entry as (u: URL) => unknown)(url) : entry
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }),
  )
  return calls
}

export function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
