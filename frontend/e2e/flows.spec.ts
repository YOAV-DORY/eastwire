import { expect, test } from '@playwright/test'
import { mockApi, watchCsp } from './api'

test('a filter lives in the URL: reloading shows the same stories', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by country' }).getByRole('button', { name: /Japan/ }).click()
  await expect(page).toHaveURL(/\?country=JP$/)
  const lead = page.getByRole('article', { name: /Port expansion approved in Osaka/ })
  await expect(lead).toBeVisible()

  await page.reload()
  await expect(lead).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Latest', exact: true })).toBeVisible()
  await expect(page.getByText('1 story from the last 48 hours')).toBeVisible()
})

test('a shared search link opens the same results and filters', async ({ page }) => {
  await mockApi(page)
  await page.goto('/search?q=rupee&country=IN&sort=date')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Results for “rupee”')
  await expect(page.getByRole('link', { name: /Rupee steadies after central bank move/ })).toBeVisible()
  await expect(page.getByLabel('Country')).toHaveValue('IN')
  await expect(page.getByLabel('Order')).toHaveValue('date')
})

test('sector filters narrow the front page and every tag explains itself', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('group', { name: 'Filter by sector' }).locator('visible=true').getByRole('button', { name: 'Economy' }).click()
  await expect(page).toHaveURL(/sector=economy/)
  await page.getByRole('button', { name: /^Details/ }).first().click()
  const tag = page.getByRole('button', { name: 'Economy: why this sector' }).first()
  await tag.click()
  await expect(page.getByText('“inflation” in the headline').first()).toBeVisible()
})

test('clicking a city pin narrows the story list; the population layer has its own legend', async ({ page }, info) => {
  const phone = info.project.name === 'phone'
  await mockApi(page)
  await page.goto('/map')
  await page.getByRole('button', { name: 'Osaka: 1 story' }).click()
  await expect(page).toHaveURL(/\/map\/city\/1853909/)
  if (phone) {
    // The selection and its stories show under the map; the full list is one switch away.
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
    await expect(page.getByText('1 story · last 7 days')).toBeVisible()
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'List' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Osaka', exact: true, level: 2 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Port expansion approved in Osaka/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Rupee steadies/ })).toHaveCount(0)

  // Filters sit inline on wide screens and in a sheet on phones; the population layer is under More options.
  const filters = phone ? page.getByRole('dialog', { name: 'Map filters' }) : page.getByRole('group', { name: 'Map settings' })
  if (phone) await page.getByRole('button', { name: 'Filters' }).click()
  await filters.getByText('More options').click()
  const population = filters.getByLabel('Population layer')
  await expect(population).not.toBeChecked()
  await population.click()
  await expect(population).toBeChecked()
  await expect(page).toHaveURL(/pop=1/)
  if (phone) {
    await page.getByRole('button', { name: 'Show results' }).click()
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Map' }).click()
  }
  await expect(page.getByText(/Population \(GeoNames, year varies\), not news volume/)).toBeVisible()
})

test('pointing at a story lights its pin on the map', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'Phones show the map or the list, one at a time.')
  await mockApi(page)
  await page.goto('/map')
  const pin = page.getByRole('button', { name: 'Osaka: 1 story' })
  await expect(pin).toBeVisible()
  await expect(pin).not.toHaveClass(/ew-hot/)
  await page.getByRole('link', { name: /Port expansion approved in Osaka/ }).hover()
  await expect(pin).toHaveClass(/ew-hot/)
  await page.mouse.move(0, 0)
  await expect(pin).not.toHaveClass(/ew-hot/)
})

test('on phones the map leaves room for the selection and its stories, with a Map/List switch', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Phone layout only.')
  await mockApi(page)
  await page.goto('/map')
  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()
  const box = (await map.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(844 * 0.3)
  expect(box.height).toBeLessThanOrEqual(844 * 0.55)

  await page.getByRole('button', { name: 'Osaka: 1 story' }).click()
  // Map, selection and the first story are on screen together.
  await expect(page.getByRole('button', { name: 'Reset' })).toBeInViewport()
  await expect(page.getByRole('link', { name: /Port expansion approved in Osaka/ })).toBeInViewport()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page).toHaveURL(/\/map$/)
  await expect(page.getByText(/cities with stories · last 7 days/)).toBeVisible()

  await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'List' }).click()
  await expect(map).toBeHidden()
  await expect(page.getByRole('link', { name: /Port expansion approved in Osaka/ })).toBeVisible()
})

test('search suggestions all return stories, and a dead end offers three', async ({ page }) => {
  await mockApi(page)
  await page.goto('/search')
  const tries = page.getByRole('region', { name: 'Try a search' })
  await expect(tries.getByRole('link')).toHaveCount(3)
  await tries.getByRole('link', { name: /Osaka/ }).click()
  await expect(page.getByRole('link', { name: /Port expansion approved in Osaka/ })).toBeVisible()

  await page.goto('/search?q=zzzxq')
  await expect(page.getByText('Nothing in our sources matches “zzzxq”')).toBeVisible()
  await expect(page.getByText('These return stories now:').locator('..').getByRole('link')).toHaveCount(3)
})

test('social embeds request nothing from Bluesky or YouTube until the reader asks', async ({ page }) => {
  await mockApi(page)
  const thirdParty: string[] = []
  page.on('request', (r) => {
    if (/bsky\.app|youtube|ytimg/.test(r.url()) && !r.url().includes('i.ytimg.com')) thirdParty.push(r.url())
  })
  await page.goto('/social')
  await expect(page.getByText(/Kept apart from the news/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load post from Bluesky' })).toBeVisible()
  expect(thirdParty).toEqual([])
})

test('no page breaks the Content-Security-Policy', async ({ page }) => {
  const violations = watchCsp(page)
  await mockApi(page)
  for (const path of ['/', '/?country=KR', '/map', '/map/city/1853909', '/search?q=metro', '/search?q=zzzxq', '/sectors', '/sector/economy', '/social', '/about', '/status']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  expect(violations).toEqual([])
})
