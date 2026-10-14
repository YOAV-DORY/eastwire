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
    expect(await screen.findByText('Database: 126 MB of 1 GB (free tier)')).toBeInTheDocument()
  })

  it('warns before the database reaches the limit', async () => {
    stubApi({
      '/api/v1/countries': COUNTRIES,
      '/api/v1/status': { ...status('fresh'), database: { sizeBytes: 850 * 1024 * 1024, limitBytes: 1024 ** 3, state: 'warn' } },
    })
    renderRoute('/status')
    expect(await screen.findByRole('status')).toHaveTextContent('Database: 850 MB of 1 GB. Close to the free tier')
  })
})
