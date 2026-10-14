import { expect, test } from '@playwright/test'
import { mockApi, watchCsp } from './api'

test('a filter lives in the URL: reloading shows the same stories', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by country' }).getByRole('button', { name: /Japan/ }).click()
  await expect(page).toHaveURL(/\?country=JP$/)
  await expect(page.getByRole('heading', { name: /Latest · Japan · 1 story/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /Latest · Japan · 1 story/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Port expansion approved in Osaka/ })).toBeVisible()
})

test('a shared search link opens the same results and filters', async ({ page }) => {
  await mockApi(page)
  await page.goto('/search?q=rupee&country=IN&sort=date')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Results for “rupee”')
  await expect(page.getByRole('link', { name: /Rupee steadies after central bank move/ })).toBeVisible()
  await expect(page.getByLabel('Country')).toHaveValue('IN')
  await expect(page.getByLabel('Order')).toHaveValue('date')
})

test('sector chips filter the feed and every tag explains itself', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by sector' }).getByRole('button', { name: 'Economy' }).click()
  await expect(page).toHaveURL(/sector=economy/)
  const tag = page.getByRole('button', { name: 'Economy: why this sector' }).first()
  await tag.click()
  await expect(page.getByText('“inflation” in the headline').first()).toBeVisible()
})

test('clicking a city pin opens its panel; the population layer has its own legend', async ({ page }) => {
  await mockApi(page)
  await page.goto('/map')
  await page.getByRole('button', { name: 'Osaka: 1 story' }).click()
  await expect(page).toHaveURL(/\/map\/city\/1853909/)
  await expect(page.getByRole('heading', { name: 'Osaka', level: 2 })).toBeVisible()

  // The checkbox reflects the URL, which updates right after the click.
  await page.getByLabel('Population layer').click()
  await expect(page.getByLabel('Population layer')).toBeChecked()
  await expect(page.getByText(/Population \(GeoNames, year varies\), not news volume/)).toBeVisible()
  await expect(page).toHaveURL(/pop=1/)
})

test('social embeds request nothing from Bluesky or YouTube until the reader asks', async ({ page }) => {
  await mockApi(page)
  const thirdParty: string[] = []
  page.on('request', (r) => {
    if (/bsky\.app|youtube|ytimg/.test(r.url()) && !r.url().includes('i.ytimg.com')) thirdParty.push(r.url())
  })
  await page.goto('/social')
  await expect(page.getByText('Not verified reporting. Shown from curated accounts.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load post from Bluesky' })).toBeVisible()
  expect(thirdParty).toEqual([])
})

test('no page breaks the Content-Security-Policy', async ({ page }) => {
  const violations = watchCsp(page)
  await mockApi(page)
  for (const path of ['/', '/map', '/search?q=metro', '/sectors', '/sector/economy', '/social', '/about', '/status']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  expect(violations).toEqual([])
})
