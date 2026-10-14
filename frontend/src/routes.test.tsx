import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COUNTRIES, page, status } from './test/fixtures'
import { renderRoute, stubApi } from './test/render'

const API = {
  '/api/v1/countries': COUNTRIES,
  '/api/v1/status': status('fresh'),
  '/api/v1/articles': page([]),
}

describe('routes', () => {
  it('every page has one main landmark, one h1 and a skip link', async () => {
    stubApi(API)
    renderRoute('/')
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })

  it('pages planned for later milestones say so plainly', async () => {
    stubApi(API)
    renderRoute('/sectors')
    expect(await screen.findByRole('heading', { name: 'Sectors', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Planned for milestone 7 of 9.')).toBeInTheDocument()
  })

  it('unknown paths show the not-found page inside the shell', async () => {
    stubApi(API)
    renderRoute('/no/such/page')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
