import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SHORTCUTS_STORAGE_KEY } from '../hooks/useShortcuts'
import { article, COUNTRIES, page, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const BASE = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/articles': page([article()]),
  '/api/v1/places': [],
}

const SUGGESTIONS = [
  { q: 'bank', count: 7 },
  { q: 'AI', count: 3 },
  { q: 'IPO', count: 2 },
  { q: 'Mumbai', count: 2 },
]

describe('search', () => {
  it('submitting the search bar opens shareable results', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/search': page([article({ title: 'Chip exports climb' })]) })
    const router = renderRoute('/search')

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search stories' }), 'chip exports{Enter}')

    await waitFor(() => expect(router.state.location.search).toBe('?q=chip+exports'))
    expect(await screen.findByText('Chip exports climb')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Results for “chip exports”')
    const searchCall = calls.find((u) => u.pathname === '/api/v1/search')
    expect(searchCall?.searchParams.get('q')).toBe('chip exports')
    expect(searchCall?.searchParams.get('sort')).toBe('relevance')
    expect(document.title).toBe('Search: chip exports · EastWire')
  })

  it('ignores a one-letter search', async () => {
    stubApi(BASE)
    const router = renderRoute('/search')
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search stories' }), 'a{Enter}')
    expect(router.state.location.search).toBe('')
  })

  it('every filter lives in the URL and changing one goes back to page 1', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/search': page([article()], { total: 45, hasMore: true, page: 2 }) })
    const router = renderRoute('/search?q=rail&page=2')

    expect(await screen.findByText('45 results · page 2')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'JP')

    await waitFor(() => expect(router.state.location.search).toBe('?q=rail&country=JP'))
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/search' && u.searchParams.get('country') === 'JP')).toBe(true),
    )
  })

  it('pagination uses real links that keep the query', async () => {
    stubApi({ ...BASE, '/api/v1/search': page([article()], { total: 45, hasMore: true, page: 2 }) })
    renderRoute('/search?q=rail&sort=date&page=2')

    expect(await screen.findByRole('link', { name: 'Next →' })).toHaveAttribute('href', '/search?q=rail&sort=date&page=3')
    expect(screen.getByRole('link', { name: '← Previous' })).toHaveAttribute('href', '/search?q=rail&sort=date')
  })

  it('without a query it offers searches that return stories now, and explains the syntax', async () => {
    stubApi({ ...BASE, '/api/v1/search/suggestions': SUGGESTIONS })
    renderRoute('/search')
    const tries = await screen.findByRole('region', { name: 'Try a search' })
    expect(await within(tries).findByRole('link', { name: 'bank 7' })).toHaveAttribute('href', '/search?q=bank')
    expect(within(tries).getAllByRole('link')).toHaveLength(4)
    expect(within(tries).getByText('"heat wave"')).toBeInTheDocument()
  })

  it('a search with no results says so and offers three that work', async () => {
    stubApi({ ...BASE, '/api/v1/search': page([]), '/api/v1/search/suggestions': SUGGESTIONS })
    renderRoute('/search?q=bank')
    expect(await screen.findByText('Nothing in our sources matches “bank”')).toBeInTheDocument()
    const offers = (await screen.findByText('These return stories now:')).closest('div')!
    // The search that just failed is never offered again.
    expect(within(offers).getAllByRole('link').map((a) => a.textContent)).toEqual(['AI 3', 'IPO 2', 'Mumbai 2'])
  })
})

describe('keyboard shortcuts', () => {
  it('"/" opens search from any page, with the field ready', async () => {
    stubApi(BASE)
    const router = renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.keyboard('/')
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(await screen.findByRole('searchbox', { name: 'Search stories' })).toHaveFocus()
  })

  it('"/" focuses the search field on the search page', async () => {
    stubApi({ ...BASE, '/api/v1/search': page([article()]) })
    renderRoute('/search?q=rail')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    expect(input).not.toHaveFocus()
    await userEvent.keyboard('/')
    expect(input).toHaveFocus()
  })

  it('can be turned off', async () => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'off')
    stubApi({ ...BASE, '/api/v1/search': page([article()]) })
    renderRoute('/search?q=rail')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    await userEvent.keyboard('/')
    expect(input).not.toHaveFocus()
  })

  it('typing "/" inside a field is just text', async () => {
    stubApi(BASE)
    renderRoute('/search')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    await userEvent.type(input, 'a/b')
    expect(input).toHaveValue('a/b')
  })
})
