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
    expect(await within(map).findByText('Tokyo')).toBeInTheDocument()
    expect(screen.getByText(/About a country but no one city \(not pinned\): India 42/)).toBeInTheDocument()
  })

  it('settings go into the URL and the request', async () => {
    const calls = stubApi(API)
    const router = renderRoute('/map')
    const settings = within(await screen.findByRole('group', { name: 'Map settings' }))
    await userEvent.click(settings.getByRole('button', { name: '24 hours' }))
    await waitFor(() => expect(router.state.location.search).toBe('?window=24h'))
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/map/cities' && u.searchParams.get('window') === '24h')).toBe(true),
    )

    await userEvent.click(settings.getByText('More options'))
    await userEvent.click(settings.getByRole('checkbox', { name: 'Publisher based there' }))
    await waitFor(() => expect(router.state.location.search).toBe('?window=24h&roles=mentioned%2Cevent%2Cpublisher'))
  })

  it('keeps the population layer off by default', async () => {
    stubApi(API)
    renderRoute('/map')
    const settings = within(await screen.findByRole('group', { name: 'Map settings' }))
    expect(settings.getByRole('checkbox', { name: 'Population layer' })).not.toBeChecked()
  })

  it('the last place role cannot be switched off', async () => {
    stubApi(API)
    renderRoute('/map?roles=event')
    const settings = within(await screen.findByRole('group', { name: 'Map settings' }))
    expect(settings.getByRole('checkbox', { name: 'Datelined there' })).toBeDisabled()
  })

  it('on phones a Map/List switch shows one at a time, through the URL', async () => {
    stubApi(API)
    const router = renderRoute('/map')
    const view = within(await screen.findByRole('group', { name: 'View' }))
    expect(view.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(view.getByRole('button', { name: 'List' }))
    await waitFor(() => expect(router.state.location.search).toBe('?view=list'))
    expect(view.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('table view is an accessible table of the same cities', async () => {
    stubApi(API)
    renderRoute('/map?view=table')
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: 'Tokyo' })).toHaveAttribute('href', '/map/city/1850147?view=table')
    expect(within(table).getByText('· low confidence')).toBeInTheDocument()
    expect(screen.queryByTestId('news-map')).not.toBeInTheDocument()
  })

  it('choosing a city narrows the story list to that city', async () => {
    const calls = stubApi(API)
    renderRoute('/map/city/1850147')
    const panel = await screen.findByRole('region', { name: 'Tokyo' })
    expect(within(panel).getByText('Japan')).toBeInTheDocument()
    expect(within(panel).getByText('About the city').nextSibling).toHaveTextContent('11')
    expect(within(panel).getByText('2 h ago').closest('p')).toHaveTextContent('Last story 2 h ago')
    expect(within(panel).getByText('35.69°N 139.69°E')).toBeInTheDocument()
    expect(await screen.findByText('Tokyo rail strike')).toBeInTheDocument()
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/articles' && u.searchParams.get('city') === '1850147')).toBe(true),
    )
    expect(document.title).toBe('Tokyo on the map · EastWire')
  })

  it('an unknown city says so', async () => {
    stubApi(API)
    renderRoute('/map/city/1')
    expect(await screen.findByText(/That city is not on our list/)).toBeInTheDocument()
  })
})
