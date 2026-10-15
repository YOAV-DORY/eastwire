import { expect, test, type Page } from '@playwright/test'
import { mockApi } from './api'

/**
 * Loading, failure and recovery, tested apart from the loaded page: a slow server shows a
 * cold-start note that counts, a failing one ends in an error with a retry (never an endless
 * skeleton), a retry recovers, and a return visit shows its saved copy, dated, meanwhile.
 */

/** Overrides /api/v1/front after mockApi: delay it, fail it, or let it through. */
async function frontRoute(page: Page, mode: () => 'ok' | 'fail' | 'slow') {
  await page.route('**/api/v1/front**', async (route) => {
    const m = mode()
    if (m === 'fail') return route.fulfill({ status: 503, json: { error: 'The database is not reachable right now.' } })
    if (m === 'slow') await new Promise((r) => setTimeout(r, 4_500))
    return route.fallback()
  })
}

const LEAD = /Metro line opens in Bengaluru/

test('a slow server shows a cold-start note, then the stories', async ({ page }) => {
  await mockApi(page)
  await frontRoute(page, () => 'slow')
  await page.goto('/')
  await expect(page.getByText(/Waking the free-tier server/)).toBeVisible({ timeout: 6_000 })
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Waking the free-tier server/)).toBeHidden()
})

test('a failing server ends in an error with a retry, and the retry recovers', async ({ page }) => {
  test.setTimeout(60_000)
  let mode: 'ok' | 'fail' = 'fail'
  await mockApi(page)
  await frontRoute(page, () => mode)
  await page.goto('/')
  // Three retries 2, 5 and 10 s apart, then an error: bounded, not an endless skeleton.
  const error = page.getByRole('alert').filter({ hasText: 'Couldn’t load stories' })
  await expect(error).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)

  mode = 'ok'
  await error.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible()
  await expect(error).toBeHidden()
})

test('a return visit shows the saved copy, dated, while the server does not answer', async ({ page }) => {
  test.setTimeout(60_000)
  let mode: 'ok' | 'fail' = 'ok'
  await mockApi(page)
  await frontRoute(page, () => mode)
  await page.goto('/')
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible()

  mode = 'fail'
  await page.reload()
  // The saved stories at once, never presented as live.
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible({ timeout: 2_000 })
  const notice = page.getByText(/Saved copy from .* kept on this device/)
  await expect(notice).toBeVisible()
  await expect(page.getByText(/The server did not answer, so these may not be the latest stories/)).toBeVisible({ timeout: 30_000 })

  mode = 'ok'
  await page.getByRole('status').filter({ hasText: 'Saved copy' }).getByRole('button', { name: 'Try again' }).click()
  await expect(notice).toBeHidden()
})

test('when the status request fails, the masthead says so instead of checking forever', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'The full label is visible on wide screens.')
  test.setTimeout(60_000)
  await mockApi(page)
  await page.route('**/api/v1/status', (route) => route.fulfill({ status: 503, json: { error: 'down' } }))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Source status unavailable' })).toBeVisible({ timeout: 30_000 })
})
