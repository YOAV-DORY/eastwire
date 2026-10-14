import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { article, COUNTRIES, ECONOMY_TAG, page, SECTORS_VIEW, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const API = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/sectors': SECTORS_VIEW,
  '/api/v1/articles': page([article({ sectors: [ECONOMY_TAG] })]),
  '/api/v1/map/cities': {
    window: '7d',
    roles: ['mentioned', 'event'],
    cities: [{ id: 1850147, name: 'Tokyo', country: 'JP', lat: 35.69, lon: 139.69, total: 4, mentioned: 4, event: 0, publisher: 0, lowConfidenceOnly: false, lastItemAt: '2026-10-13T11:00:00Z' }],
    countryOnly: [],
  },
}

describe('sector pages', () => {
  it('/sectors lists the six sectors with definitions and counts', async () => {
    stubApi(API)
    renderRoute('/sectors')
    expect(await screen.findByRole('heading', { name: 'Sectors', level: 1 })).toBeInTheDocument()
    const economy = await screen.findByRole('link', { name: /Economy.*The economy as a whole.*12 stories · 7 days/ })
    expect(economy).toHaveAttribute('href', '/sector/economy')
    expect(screen.getAllByRole('link', { name: /· 7 days/ })).toHaveLength(6)
    expect(screen.getByText(/40 stories from the last 7 days matched no sector/)).toBeInTheDocument()
  })

  it('/sector/:slug shows its stories, top places and every rule', async () => {
    const calls = stubApi(API)
    renderRoute('/sector/economy')

    expect(await screen.findByRole('heading', { name: 'Economy', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('The economy as a whole.')).toBeInTheDocument()
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/articles' && u.searchParams.get('sector') === 'economy')).toBe(true),
    )
    const places = screen.getByRole('complementary', { name: 'Top places this week' })
    expect(await within(places).findByRole('link', { name: 'Tokyo' })).toHaveAttribute('href', '/map/city/1850147?sector=economy')

    await userEvent.click(screen.getByText('How we tag Economy'))
    expect(screen.getByText(/tagged Economy when its score reaches 3/)).toBeInTheDocument()
    expect(screen.getByText('tariff*')).toBeInTheDocument()
    expect(screen.getByText('economy class')).toBeInTheDocument()
    expect(screen.getByText('−3')).toBeInTheDocument()
  })

  it('country chips narrow the sector feed through the URL', async () => {
    const calls = stubApi(API)
    const router = renderRoute('/sector/economy')
    await userEvent.click(await screen.findByRole('button', { name: 'Japan' }))
    await waitFor(() => expect(router.state.location.search).toBe('?country=JP'))
    await waitFor(() =>
      expect(
        calls.some((u) => u.pathname === '/api/v1/articles' && u.searchParams.get('sector') === 'economy' && u.searchParams.get('country') === 'JP'),
      ).toBe(true),
    )
  })
})
