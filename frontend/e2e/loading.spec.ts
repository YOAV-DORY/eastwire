import { expect, test, type Page } from '@playwright/test'
import { frontFor, mockApi } from './api'

/**
 * Loading, failure and recovery, tested apart from the loaded page: a snapshot baked into the
 * page shows real stories at first paint while the API sleeps; with nothing to show, a slow
 * server gets a neutral loading note (never "waking servers"); a failing one ends in an error
 * with a retry (never an endless skeleton); a return visit shows its saved copy at once with no
 * alarming notice.
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

test('a snapshot baked into the page shows real stories at first paint while the API sleeps', async ({ page }) => {
  await mockApi(page)
  // The API never answers during this test: a sleeping free-tier server.
  await page.route('**/api/v1/**', () => new Promise(() => {}))
  const generatedAt = new Date(Date.now() - 40 * 60_000).toISOString()
  const snapshot = { version: 1, generatedAt, data: { front: frontFor(new URL('http://x/api/v1/front')) } }
  await page.route('http://127.0.0.1:4173/', async (route) => {
    const response = await route.fetch()
    const html = (await response.text()).replace(
      '</head>',
      `<script id="ew-snapshot" type="application/json">${JSON.stringify(snapshot).replace(/</g, '\\u003c')}</script></head>`,
    )
    await route.fulfill({ response, body: html })
  })
  const started = Date.now()
  await page.goto('/')
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible({ timeout: 2_000 })
  expect(Date.now() - started).toBeLessThan(2_000)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.getByText(/waking|free-tier/i)).toHaveCount(0)
})

test('with nothing to show yet, a slow server gets a neutral loading note, then the stories', async ({ page }) => {
  await mockApi(page)
  await frontRoute(page, () => 'slow')
  await page.goto('/')
  await expect(page.getByText('Loading the latest stories. This can take a little longer than usual.')).toBeVisible({ timeout: 6_000 })
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Loading the latest stories/)).toBeHidden()
  await expect(page.getByText(/waking|free-tier/i)).toHaveCount(0)
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

test('a return visit shows the saved copy at once, dated, with no alarming notice when the server fails', async ({ page }) => {
  test.setTimeout(60_000)
  let mode: 'ok' | 'fail' = 'ok'
  await mockApi(page)
  await frontRoute(page, () => mode)
  await page.goto('/')
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible()

  mode = 'fail'
  await page.reload()
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible({ timeout: 2_000 })
  // After the retries give up, the stories stay, with their neutral "Updated" time; no error banner.
  await page.waitForTimeout(20_000)
  await expect(page.getByRole('article', { name: LEAD })).toBeVisible()
  await expect(page.getByText(/^Updated /).first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText(/Saved copy|did not answer/)).toHaveCount(0)
})

test('when the status request fails, the masthead says so instead of checking forever', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'The full label is visible on wide screens.')
  test.setTimeout(60_000)
  await mockApi(page)
  await page.route('**/api/v1/status', (route) => route.fulfill({ status: 503, json: { error: 'down' } }))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Update time unavailable' })).toBeVisible({ timeout: 30_000 })
})
