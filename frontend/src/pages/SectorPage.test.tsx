import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { article, COUNTRIES, ECONOMY_TAG, front, page, SECTORS_VIEW, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const API = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/sectors': SECTORS_VIEW,
  '/api/v1/articles': page([article({ sectors: [ECONOMY_TAG] })]),
  '/api/v1/front': front([article({ title: 'Inflation eases in Tokyo', sectors: [ECONOMY_TAG] })]),
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
    expect(await screen.findByRole('heading', { name: 'Six ways into the news', level: 1 })).toBeInTheDocument()
    const economy = await screen.findByRole('link', { name: /Economy.*The economy as a whole.*12 stories this week/ })
    expect(economy).toHaveAttribute('href', '/sector/economy')
    expect(screen.getAllByRole('link', { name: /this week/ })).toHaveLength(6)
    expect(screen.getByText(/40 stories from the last 7 days matched no sector/)).toBeInTheDocument()
  })

  it('/sector/:slug leads with its stories, then top places and every rule', async () => {
    const calls = stubApi(API)
    renderRoute('/sector/economy')

    expect(await screen.findByRole('heading', { name: 'Economy', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('The economy as a whole.')).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: /Inflation eases in Tokyo/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/front' && u.searchParams.get('sector') === 'economy')).toBe(true),
    )
    // The stories come before the tagging explanation in the page order.
    const lead = screen.getByRole('article', { name: /Inflation eases in Tokyo/ })
    const how = screen.getByText('How a story gets this tag')
    expect(lead.compareDocumentPosition(how) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const places = screen.getByRole('region', { name: 'Top places this week' })
    expect(await within(places).findByRole('link', { name: 'Tokyo' })).toHaveAttribute('href', '/map/city/1850147?sector=economy')

    await userEvent.click(screen.getByText('How a story gets this tag'))
    expect(screen.getByText(/tagged Economy when its score reaches 3/)).toBeInTheDocument()
    expect(screen.getByText('tariff*')).toBeInTheDocument()
    expect(screen.getByText('economy class')).toBeInTheDocument()
    expect(screen.getByText('−3')).toBeInTheDocument()
  })

  it('country chips narrow the sector feed through the URL', async () => {
    const calls = stubApi(API)
    const router = renderRoute('/sector/economy')
    const tabs = await screen.findByRole('group', { name: 'Filter by country' })
    await userEvent.click(await within(tabs).findByRole('button', { name: 'Japan' }))
    await waitFor(() => expect(router.state.location.search).toBe('?country=JP'))
    await waitFor(() =>
      expect(
        calls.some((u) => u.pathname === '/api/v1/front' && u.searchParams.get('sector') === 'economy' && u.searchParams.get('country') === 'JP'),
      ).toBe(true),
    )
  })
})
