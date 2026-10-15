import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { COUNTRIES, socialItem, status, VIDEO } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

const BASE = { '/api/v1/countries': COUNTRIES, '/api/v1/status': status('fresh') }

describe('social page', () => {
  it('shows curated posts under one not-verified statement', async () => {
    stubApi({ ...BASE, '/api/v1/social': { items: [socialItem(), VIDEO], page: 1, size: 12, total: 2, hasMore: false } })
    renderRoute('/social')
    expect(await screen.findByRole('heading', { name: 'Posts & videos', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Not verified reporting, so it is kept apart from the news/)).toBeInTheDocument()
    // One statement for the page; each card is tagged as a post, not with the warning again.
    expect(screen.getAllByText(/not verified reporting/i)).toHaveLength(1)
    expect(await screen.findByText('2 items · last 30 days')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('keeps platform and country filters in the URL', async () => {
    const calls = stubApi({ ...BASE, '/api/v1/social': { items: [], page: 1, size: 12, total: 0, hasMore: false } })
    const router = renderRoute('/social')
    const platforms = await screen.findByRole('group', { name: 'Filter by platform' })
    await userEvent.click(within(platforms).getByRole('button', { name: 'YouTube' }))
    await waitFor(() => expect(router.state.location.search).toBe('?platform=youtube'))
    const countries = await screen.findByRole('group', { name: 'Filter by country' })
    await userEvent.click(await within(countries).findByRole('button', { name: 'Japan' }))
    await waitFor(() => expect(router.state.location.search).toBe('?platform=youtube&country=JP'))
    await waitFor(() =>
      expect(calls.some((u) => u.searchParams.get('platform') === 'youtube' && u.searchParams.get('country') === 'JP')).toBe(true),
    )
    expect(await screen.findByText('Videos appear once the YouTube connection is switched on.')).toBeInTheDocument()
  })

  it('home shows a few social posts under the news, apart from it', async () => {
    stubApi({
      ...BASE,
      '/api/v1/articles': { items: [], page: 1, size: 20, total: 0, hasMore: false },
      '/api/v1/social': { items: [socialItem()], page: 1, size: 3, total: 1, hasMore: false },
    })
    renderRoute('/')
    const preview = await screen.findByRole('region', { name: 'From newsrooms on social' })
    expect(within(preview).getByText('Not verified reporting')).toBeInTheDocument()
    expect(within(preview).getByRole('link', { name: 'All posts and videos' })).toHaveAttribute('href', '/social')
  })
})
