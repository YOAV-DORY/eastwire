import { expect, test } from '@playwright/test'
import { mockApi } from './api'

/**
 * The screenshot checklist from docs/PLAN.md section 17.6, automated where a rule can be
 * measured. Screenshots for the human pass land in test-results/screens/ (not committed).
 */
const PAGES = ['/', '/map', '/search?q=metro', '/sectors', '/sector/economy', '/social', '/about', '/status']

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
      const name = `${info.project.name}-${theme}-${path.replace(/[/?=&]+/g, '_') || 'home'}.png`
      await page.screenshot({ path: `test-results/screens/${name}`, fullPage: true })
    }
  })
}

test('navigation lives in one place per width', async ({ page }, info) => {
  await mockApi(page)
  await page.goto('/')
  const bottom = page.locator('nav[aria-label="Primary"]').last()
  const sidebar = page.getByRole('complementary', { name: 'Sections' })
  if (info.project.name === 'phone') {
    await expect(bottom.getByRole('link')).toHaveCount(4)
    await expect(sidebar).toBeHidden()
  } else {
    await expect(sidebar).toBeVisible()
    await expect(bottom).toBeHidden()
  }
})

test('the hero headline stays within three lines and the graphic does not cover it', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const title = page.locator('#hero-title')
  const lines = await title.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
  expect(lines).toBeLessThanOrEqual(3)
  const a = (await title.boundingBox())!
  const b = (await page.locator('section[aria-labelledby="hero-title"] svg').first().boundingBox())!
  const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  expect(overlap).toBe(false)
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
  await page.goto('/')
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
