import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { article, COUNTRIES, front, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const BASE = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/places': [{ id: 1850147, name: 'Tokyo', country: 'JP', admin1: 'Tokyo', lat: 35.69, lon: 139.69, population: 1, capital: true }],
}

const STORIES = [
  article({ id: 1, title: 'Japan and the US agree on chip export rules' }),
  article({ id: 2, title: 'Second story' }),
  article({ id: 3, title: 'Third story' }),
  article({ id: 4, title: 'Fourth story' }),
]
const ESSAY = article({ id: 9, title: 'An essay on village life', storyType: 'feature', publishedAt: '2026-10-09T08:00:00Z' })

describe('home front page', () => {
  it('leads on the ink panel with why it leads, then two more, then Latest with its window', async () => {
    stubApi({ ...BASE, '/api/v1/front': front(STORIES) })
    renderRoute('/')

    const lead = await screen.findByRole('article', { name: /Japan and the US agree on chip export rules/ })
    expect(within(lead).getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(within(lead).getByText('Why it leads')).toBeInTheDocument()
    expect(within(lead).getByText(/Published 12 min ago · Geopolitics/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Also leading' }).children).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 2, name: /^Latest/ })).toHaveTextContent('Latest · 4 stories from the last 48 hours')
    expect(screen.getByRole('heading', { level: 3, name: /Fourth story/ })).toBeInTheDocument()
  })

  it('shows an illustrative image only with its label, creator, license and file page', async () => {
    stubApi({ ...BASE, '/api/v1/front': front(STORIES) })
    renderRoute('/')

    const image = await screen.findByRole('img', { name: 'An invented street in Tokyo' })
    const caption = image.closest('figure')!.querySelector('figcaption')!
    expect(caption).toHaveTextContent('Illustrative image')
    expect(within(caption).getByRole('link', { name: /A\. Photographer/ })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Invented.jpg',
    )
    expect(within(caption).getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0',
    )
  })

  it('never shows an image whose credit is incomplete: the lead stays text only', async () => {
    const page = front(STORIES)
    page.lead!.image = { ...page.lead!.image!, creator: '', attribution: '' }
    stubApi({ ...BASE, '/api/v1/front': page })
    renderRoute('/')

    await screen.findByRole('article', { name: /Japan and the US agree/ })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps features and older reports in a dated Reading section, not in Latest', async () => {
    stubApi({ ...BASE, '/api/v1/front': front(STORIES, [ESSAY]) })
    renderRoute('/')

    const reading = await screen.findByRole('region', { name: 'Reading' })
    expect(within(reading).getByText(/Features, essays and earlier reports · published 9 Oct 2026/)).toBeInTheDocument()
    expect(within(reading).getByText(/Feature ·/)).toHaveTextContent('Feature · 9 Oct 2026')
    const latest = screen.getByRole('region', { name: /^Latest/ })
    expect(within(latest).queryByText('An essay on village life')).not.toBeInTheDocument()
  })

  it('labels the country counts with their time window', async () => {
    stubApi({ ...BASE, '/api/v1/front': front(STORIES) })
    renderRoute('/')
    const tabs = within(await screen.findByRole('group', { name: 'Filter by country' }))
    expect(await tabs.findByRole('button', { name: 'India 78' })).toHaveAttribute('title', '78 news stories about India in the last 24 hours')
    expect(screen.getByText('Numbers: news stories about each country in the last 24 hours.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'News in the last 24 hours, by country' })).toBeInTheDocument()
  })

  it('filters by country through the URL and asks the API for that country', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/front': front(STORIES) })
    const router = renderRoute('/')

    const tabs = await screen.findByRole('group', { name: 'Filter by country' })
    await userEvent.click(await within(tabs).findByRole('button', { name: 'Japan 2' }))

    await waitFor(() => expect(router.state.location.search).toBe('?country=JP'))
    await waitFor(() =>
      expect(calls.some((u) => u.pathname === '/api/v1/front' && u.searchParams.get('country') === 'JP')).toBe(true),
    )
    expect(await screen.findByDisplayValue('All of Japan')).toBeInTheDocument()
  })

  it('filter chips keep their counts and colour dots, and a sector chip narrows the page', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/front': front(STORIES) })
    const router = renderRoute('/?country=JP')
    const sectors = within(await screen.findByRole('group', { name: 'Filter by sector' }))
    await userEvent.click(sectors.getByRole('button', { name: 'Economy' }))
    await waitFor(() => expect(router.state.location.search).toBe('?country=JP&sector=economy'))
    await waitFor(() => expect(calls.some((u) => u.searchParams.get('sector') === 'economy')).toBe(true))
    expect(sectors.getByRole('button', { name: 'Economy' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says honestly when a place has nothing new, and still offers the reading section', async () => {
    stubApi({ ...BASE, '/api/v1/front': front([], [ESSAY]) })
    renderRoute('/?country=KR')

    expect(await screen.findByText('Nothing new from our sources about South Korea')).toBeInTheDocument()
    expect(screen.getByText(/not an absence of news/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Coverage gaps' })).toHaveAttribute('href', '/about#gaps')
    expect(screen.getByRole('button', { name: 'All countries' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Reading' })).toBeInTheDocument()
  })

  it('shows an error with a retry when the API fails, and recovers when it answers', async () => {
    const api: Record<string, unknown> = { ...BASE }
    stubApi(api)
    renderRoute('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load stories')

    api['/api/v1/front'] = front(STORIES)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article', { name: /Japan and the US agree/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the saved copy from an earlier visit, dated, when the server does not answer', async () => {
    const twoHoursAgo = Date.now() - 2 * 3600_000
    localStorage.setItem('eastwire.saved.v1:["front",{}]', JSON.stringify({ data: front(STORIES), savedAt: twoHoursAgo }))
    const api: Record<string, unknown> = { ...BASE }
    stubApi(api)
    renderRoute('/')

    // Real stories at once, never presented as live.
    expect(await screen.findByRole('article', { name: /Japan and the US agree/ })).toBeInTheDocument()
    const notice = await screen.findByText(/The server did not answer/)
    expect(notice).toHaveTextContent('Saved copy from 2 h ago, kept on this device.')

    api['/api/v1/front'] = front([article({ id: 7, title: 'A fresher lead' })])
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article', { name: /A fresher lead/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/Saved copy/)).not.toBeInTheDocument())
  })

  it('warns when source checks are behind', async () => {
    stubApi({ ...BASE, '/api/v1/status': status('stale', '2026-10-13T06:00:00Z'), '/api/v1/front': front(STORIES) })
    renderRoute('/')
    expect(await screen.findByText(/Some source checks have not succeeded for over two hours/)).toBeInTheDocument()
  })
})
