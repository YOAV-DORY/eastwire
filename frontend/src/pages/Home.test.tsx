import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { article, COUNTRIES, page, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const BASE = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/places': [{ id: 1850147, name: 'Tokyo', country: 'JP', admin1: 'Tokyo', lat: 35.69, lon: 139.69, population: 1, capital: true }],
}

describe('home feed', () => {
  it('opens with a lead story, then a short list, under country tabs', async () => {
    stubApi({ ...BASE, '/api/v1/articles': page([article(), article({ id: 2, title: 'Second story' })]) })
    renderRoute('/')

    expect(await screen.findByText('Second story')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Latest news from China, India, South Korea and Japan')
    expect(screen.getByRole('heading', { level: 2, name: /^Latest/ })).toHaveTextContent('Latest · 2 stories')
    // The first story is the lead (a level-2 headline); the rest are level 3.
    expect(screen.getByRole('heading', { level: 2, name: /Metro line opens in Bengaluru/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /Second story/ })).toBeInTheDocument()
    const tabs = within(screen.getByRole('group', { name: 'Filter by country' }))
    expect(tabs.getByRole('button', { name: 'India 78' })).toHaveAttribute('aria-pressed', 'false')
    expect(tabs.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /Open the full map/ })).toHaveAttribute('href', '/map')
  })

  it('filters by country through the URL and asks the API for that country', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/articles': page([article()]) })
    const router = renderRoute('/')

    const tabs = await screen.findByRole('group', { name: 'Filter by country' })
    await userEvent.click(await within(tabs).findByRole('button', { name: 'Japan 2' }))

    await waitFor(() => expect(router.state.location.search).toBe('?country=JP'))
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/articles' && u.searchParams.get('country') === 'JP')).toBe(true),
    )
    expect(await screen.findByRole('combobox')).toHaveDisplayValue('All of Japan')
  })

  it('filters by sector through the URL, keeping the country', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/articles': page([]) })
    const router = renderRoute('/?country=JP')

    await userEvent.click(await screen.findByRole('button', { name: 'Economy' }))

    await waitFor(() => expect(router.state.location.search).toBe('?country=JP&sector=economy'))
    await waitFor(() =>
      expect(
        calls.some((u) => u.pathname === '/api/v1/articles' && u.searchParams.get('sector') === 'economy' && u.searchParams.get('country') === 'JP'),
      ).toBe(true),
    )
    expect(await screen.findByText('Nothing from our sources tagged Economy about Japan right now')).toBeInTheDocument()
    const sectors = screen.getByRole('group', { name: 'Filter by sector' })
    expect(within(sectors).getByRole('button', { name: 'All sectors' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(sectors).getByRole('button', { name: 'Economy' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says honestly when a place has nothing, without placeholder stories', async () => {
    stubApi({ ...BASE, '/api/v1/articles': page([]) })
    renderRoute('/?country=KR')

    expect(await screen.findByText('Nothing from our sources about South Korea right now')).toBeInTheDocument()
    expect(screen.getByText('This reflects our short list of sources, not an absence of news.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All countries' })).toBeInTheDocument()
  })

  it('shows an error with a retry when the API fails', async () => {
    stubApi({ ...BASE })
    renderRoute('/')
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load stories")
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('warns when sources are stale', async () => {
    stubApi({ ...BASE, '/api/v1/status': status('stale', '2026-10-13T06:00:00Z'), '/api/v1/articles': page([article()]) })
    renderRoute('/')
    expect(await screen.findByText(/Some sources have not updated for over two hours/)).toBeInTheDocument()
  })
})
