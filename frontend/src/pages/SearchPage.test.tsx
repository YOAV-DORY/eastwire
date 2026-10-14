import { screen, waitFor } from '@testing-library/react'
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

describe('search', () => {
  it('submitting the home search bar opens shareable results', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/search': page([article({ title: 'Chip exports climb' })]) })
    const router = renderRoute('/')

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search stories' }), 'chip exports{Enter}')

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(router.state.location.search).toBe('?q=chip+exports')
    expect(await screen.findByText('Chip exports climb')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Results for “chip exports”')
    const searchCall = calls.find((u) => u.pathname === '/api/v1/search')
    expect(searchCall?.searchParams.get('q')).toBe('chip exports')
    expect(searchCall?.searchParams.get('sort')).toBe('relevance')
  })

  it('ignores a one-letter search', async () => {
    stubApi(BASE)
    const router = renderRoute('/')
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search stories' }), 'a{Enter}')
    expect(router.state.location.pathname).toBe('/')
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

  it('without a query it explains the syntax, and an empty result is honest', async () => {
    stubApi({ ...BASE, '/api/v1/search': page([]) })
    renderRoute('/search')
    expect(await screen.findByRole('link', { name: '"heat wave"' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'semiconductors' }))
    expect(await screen.findByText('No stories in our sources match “semiconductors”')).toBeInTheDocument()
  })
})

describe('keyboard shortcuts', () => {
  it('"/" focuses the search field', async () => {
    stubApi(BASE)
    renderRoute('/')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    await userEvent.keyboard('/')
    expect(input).toHaveFocus()
  })

  it('can be turned off', async () => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'off')
    stubApi(BASE)
    renderRoute('/')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    await userEvent.keyboard('/')
    expect(input).not.toHaveFocus()
  })

  it('typing "/" inside a field is just text', async () => {
    stubApi(BASE)
    renderRoute('/')
    const input = await screen.findByRole('searchbox', { name: 'Search stories' })
    await userEvent.type(input, 'a/b')
    expect(input).toHaveValue('a/b')
  })
})
