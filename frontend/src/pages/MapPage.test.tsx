import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CityPin, MapData } from '../api/types'
import { article, COUNTRIES, page, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const TOKYO: CityPin = {
  id: 1850147, name: 'Tokyo', country: 'JP', lat: 35.69, lon: 139.69, total: 12, mentioned: 11, event: 2,
  publisher: 0, lowConfidenceOnly: false, lastItemAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
}
const OSAKA: CityPin = { ...TOKYO, id: 1853909, name: 'Osaka', total: 1, mentioned: 1, event: 0, lowConfidenceOnly: true }
const MAP: MapData = { window: '7d', roles: ['mentioned', 'event'], cities: [TOKYO, OSAKA], countryOnly: [{ country: 'IN', count: 42 }] }
const PLACES = [
  { id: 1850147, name: 'Tokyo', country: 'JP', admin1: 'Tokyo', lat: 35.69, lon: 139.69, population: 9733276, capital: true },
  { id: 1853909, name: 'Osaka', country: 'JP', admin1: 'Osaka', lat: 34.69, lon: 135.5, population: 2753862, capital: false },
]

const API = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/map/cities': MAP,
  '/api/v1/places': PLACES,
  '/api/v1/articles': page([article({ title: 'Tokyo rail strike' })]),
}

describe('map page', () => {
  it('pins cities and counts country-only stories separately', async () => {
    stubApi(API)
    renderRoute('/map')
    const map = await screen.findByTestId('news-map')
    expect(within(map).getByText('Tokyo')).toBeInTheDocument()
    expect(screen.getByText(/Country level only, not placed on a city: India 42/)).toBeInTheDocument()
  })

  it('settings go into the URL and the request', async () => {
    const calls = stubApi(API)
    const router = renderRoute('/map')
    await userEvent.click(await screen.findByRole('button', { name: '24 hours' }))
    await waitFor(() => expect(router.state.location.search).toBe('?window=24h'))
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/map/cities' && u.searchParams.get('window') === '24h')).toBe(true),
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Publisher' }))
    await waitFor(() => expect(router.state.location.search).toBe('?window=24h&roles=mentioned%2Cevent%2Cpublisher'))
  })

  it('the last place role cannot be switched off', async () => {
    stubApi(API)
    renderRoute('/map?roles=event')
    expect(await screen.findByRole('checkbox', { name: 'Dateline' })).toBeDisabled()
  })

  it('list view is an accessible table of the same cities', async () => {
    stubApi(API)
    renderRoute('/map?view=list')
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: 'Tokyo' })).toHaveAttribute('href', '/map/city/1850147?view=list')
    expect(within(table).getByText('· low confidence')).toBeInTheDocument()
    expect(screen.queryByTestId('news-map')).not.toBeInTheDocument()
  })

  it('a city route opens its panel with counts, coordinates and stories', async () => {
    stubApi(API)
    renderRoute('/map/city/1850147')
    const panel = await screen.findByRole('region', { name: 'Tokyo' })
    expect(within(panel).getByText('Japan · 35.69°N 139.69°E')).toBeInTheDocument()
    expect(within(panel).getByText('Mentioned').nextSibling).toHaveTextContent('11')
    expect(await within(panel).findByText('Tokyo rail strike')).toBeInTheDocument()
    expect(within(panel).getByText('2 h ago').closest('p')).toHaveTextContent('Last item seen 2 h ago')
  })

  it('an unknown city says so', async () => {
    stubApi(API)
    renderRoute('/map/city/1')
    expect(await screen.findByText(/That city is not on our list/)).toBeInTheDocument()
  })
})
