import { expect, test } from '@playwright/test'
import { mockApi } from './api'

/**
 * The screenshot checklist from docs/PLAN.md section 17.6, automated where a rule can be
 * measured. Screenshots for the human pass land in test-results/screens/ (not committed).
 */
const PAGES = ['/', '/?country=JP', '/?country=KR', '/map', '/map/city/1853909', '/search?q=metro', '/search?q=zzzxq', '/sectors', '/sector/economy', '/sector/technology', '/social', '/about', '/status']

for (const theme of ['dark', 'light'] as const) {
  test(`every page fits the width and is screenshotted (${theme})`, async ({ page }, info) => {
    await mockApi(page)
    await page.addInitScript((t) => localStorage.setItem('eastwire.theme', t), theme)
    for (const path of PAGES) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle')
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(innerWidth)
      // Every photo loads and carries its illustrative label and Commons credit.
      await page.waitForFunction(() => [...document.querySelectorAll('figure img')].every((i) => (i as HTMLImageElement).complete))
      const images = await page.evaluate(() =>
        [...document.querySelectorAll('figure img')].map((img) => ({
          loaded: (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
          credited: /Illustrative image|Historical map|Illustration/.test(img.closest('figure')?.querySelector('figcaption')?.textContent ?? ''),
          linked: Boolean(img.closest('figure')?.querySelector('figcaption a[href*="commons.wikimedia.org"]')),
        })),
      )
      for (const image of images) expect(image, `${path} image`).toEqual({ loaded: true, credited: true, linked: true })
      const name = `${info.project.name}-${theme}-${path.replace(/[/?=&]+/g, '_') || 'home'}.png`
      await page.screenshot({ path: `test-results/screens/${name}`, fullPage: true })
    }
  })
}

test('navigation lives in one place per width, with no sidebar', async ({ page }, info) => {
  await mockApi(page)
  await page.goto('/')
  const top = page.locator('nav[aria-label="Primary"]').first()
  const bottom = page.locator('nav[aria-label="Primary"]').last()
  await expect(page.getByRole('complementary', { name: 'Sections' })).toHaveCount(0)
  if (info.project.name === 'phone') {
    await expect(top).toBeHidden()
    await expect(bottom.getByRole('link')).toHaveCount(4)
    await expect(bottom.getByRole('button', { name: 'More' })).toBeVisible()
  } else {
    await expect(top.getByRole('link')).toHaveCount(6)
    await expect(bottom).toBeHidden()
  }
})

test('every main page is reachable from the phone navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Phone layout only.')
  await mockApi(page)
  await page.goto('/')
  const bottom = page.locator('nav[aria-label="Primary"]').last()
  for (const [name, path] of [['Map', '/map'], ['Search', '/search'], ['Sectors', '/sectors'], ['Home', '/']] as const) {
    await bottom.getByRole('link', { name }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
  }
  for (const [name, path] of [['Social', '/social'], ['How it works', '/about'], ['Status', '/status']] as const) {
    await bottom.getByRole('button', { name: 'More' }).click()
    await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})

test('real news is visible on the first screen', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const lead = page.getByRole('heading', { level: 2, name: /Metro line opens in Bengaluru/ })
  await expect(lead).toBeInViewport({ ratio: 1 })
  // The lead and at least one more headline, not just a header and filters.
  await expect(page.getByRole('list', { name: 'Also leading' })).toBeInViewport()
})

test('controls on phones are at least 44px tall', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Phone layout only.')
  await mockApi(page)
  for (const path of ['/', '/map', '/search?q=metro', '/social', '/status']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
    await page.waitForLoadState('networkidle')
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, select, summary')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'
        })
        // Links in running text and photo credits are exempt (WCAG 2.5.8); Leaflet's attribution is third-party; pins get a CSS hit area.
        .filter((el) => !(el.tagName === 'A' && el.closest('p, h1, h2, h3, h4, dd, blockquote, figcaption')))
        .filter((el) => !el.closest('.leaflet-control-attribution') && !el.matches('.leaflet-marker-icon'))
        .filter((el) => el.getBoundingClientRect().height < 44)
        .map((el) => `${el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`),
    )
    expect(small, path).toEqual([])
  }
})

test('with reduced motion, transitions are effectively off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockApi(page)
  await page.goto('/')
  const duration = await page.locator('article').first().evaluate((el) => getComputedStyle(el).transitionDuration)
  for (const part of duration.split(',')) expect(parseFloat(part)).toBeLessThan(0.01)
})

test('the search bar shows the pink focus ring', async ({ page }) => {
  await mockApi(page)
  await page.goto('/search')
  const input = page.getByRole('searchbox').first()
  await input.focus()
  const shadow = await input.evaluate((el) => {
    const form = el.closest('form') ?? el
    return getComputedStyle(form).boxShadow + getComputedStyle(el).boxShadow
  })
  expect(shadow).not.toBe('nonenone')
})

test('the home page barely shifts while it loads (CLS < 0.05)', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { cls: number }).cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Latest · 3 stories/ })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls)
  expect(cls).toBeLessThan(0.05)
})
