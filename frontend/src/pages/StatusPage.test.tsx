import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COUNTRIES, status } from '../test/fixtures'
import { renderRoute, stubApi } from '../test/render'

describe('status page', () => {
  it('shows how full the free database is', async () => {
    stubApi({
      '/api/v1/countries': COUNTRIES,
      '/api/v1/status': { ...status('fresh'), database: { sizeBytes: 126 * 1024 * 1024, limitBytes: 1024 ** 3, state: 'ok' } },
    })
    renderRoute('/status')
    expect(await screen.findByText(/126 MB of 1 GB used on the free tier/)).toBeInTheDocument()
  })

  it('warns before the database reaches the limit', async () => {
    stubApi({
      '/api/v1/countries': COUNTRIES,
      '/api/v1/status': { ...status('fresh'), database: { sizeBytes: 850 * 1024 * 1024, limitBytes: 1024 ** 3, state: 'warn' } },
    })
    renderRoute('/status')
    expect(await screen.findByRole('status')).toHaveTextContent('850 MB of 1 GB used on the free tier. Close to the limit')
  })

  it('says the overall state in its title and lists each source without a table', async () => {
    const source = (slug: string, state: 'fresh' | 'stale') => ({
      slug,
      name: slug,
      state,
      lastAttemptAt: '2026-10-13T11:00:00Z',
      lastSuccessAt: '2026-10-13T11:00:00Z',
      newestItemAt: null,
      consecutiveFailures: state === 'stale' ? 2 : 0,
      circuitOpen: false,
    })
    stubApi({
      '/api/v1/countries': COUNTRIES,
      '/api/v1/status': { ...status('stale'), sources: [source('global-voices', 'fresh'), source('gdelt-gkg', 'stale')] },
    })
    renderRoute('/status')
    expect(await screen.findByRole('heading', { level: 1, name: 'One source is behind' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByText('Checked')).toHaveLength(2)
    expect(screen.getByText('2 in a row')).toBeInTheDocument()
    expect(screen.getAllByText('none yet')).toHaveLength(2)
    expect(document.title).toBe('Status · EastWire')
  })
})
