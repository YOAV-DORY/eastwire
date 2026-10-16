import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { article, COUNTRIES, page, status } from '../../test/fixtures'
import { renderRoute, stubApi } from '../../test/render'

const API = { '/api/v1/countries': COUNTRIES, '/api/v1/status': status('fresh'), '/api/v1/articles': page([article()]) }

describe('app shell', () => {
  it('has the same four sections in the masthead and the bottom bar: Home, Map, Search, Social', async () => {
    stubApi(API)
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('complementary', { name: /sidebar/i })).not.toBeInTheDocument()
    const [top, bottom] = screen.getAllByRole('navigation', { name: 'Primary' })
    expect(within(top).getAllByRole('link').map((a) => a.textContent)).toEqual(['Home', 'Map', 'Search', 'Social'])
    expect(within(bottom).getAllByRole('link').map((a) => a.textContent)).toEqual(['Home', 'Map', 'Search', 'Social'])
    expect(within(top).queryByRole('link', { name: /Sectors|How it works/ })).not.toBeInTheDocument()
    expect(within(bottom).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('"More" reaches About and Sources on phones', async () => {
    stubApi(API)
    const router = renderRoute('/')
    const bottom = (await screen.findAllByRole('navigation', { name: 'Primary' }))[1]
    const more = within(bottom).getByRole('button', { name: 'More' })
    expect(more).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')

    const sheet = document.querySelector<HTMLElement>('dialog[aria-labelledby="more-title"]')!
    const links = within(sheet).getAllByRole('link', { hidden: true })
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/about', '/sources'])
    await userEvent.click(within(sheet).getByRole('link', { name: 'Sources', hidden: true }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/sources'))
  })

  it('counts a sector page, entered from the home page, as part of Home', async () => {
    stubApi(API)
    renderRoute('/sector/economy')
    const [top] = await screen.findAllByRole('navigation', { name: 'Primary' })
    expect(within(top).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })
})
