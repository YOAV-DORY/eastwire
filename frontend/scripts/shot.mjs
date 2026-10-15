// Quick single-page screenshots while designing: node scripts/shot.mjs <out-dir> <theme> <width> <path> [name] [full]
import { chromium } from '@playwright/test'
const [out, theme, width, path, name = 'shot', full = 'first'] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome' })
const w = Number(width)
const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, hasTouch: w < 768 })
await context.addInitScript((t) => localStorage.setItem('eastwire.theme', t), theme)
const page = await context.newPage()
await page.goto('http://localhost:5174' + path, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
if (full === 'full' || full === 'tiles') {
  // Scroll through once, so lazy pictures load and scroll-driven reveals finish, then back to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 400))
  })
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => (el.style.animation = 'none')))
  await page.evaluate(() => window.scrollTo(0, 0))
}
await page.waitForTimeout(600)
if (full === 'tiles') {
  // The whole page cut into screen-high tiles, so each can be inspected at full size.
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = page.viewportSize().height * 1.6
  for (let y = 0, i = 0; y < height; y += vh, i++) {
    await page.screenshot({ path: `${out}/${name}-${theme}-${w}-${i}.png`, fullPage: true, clip: { x: 0, y, width: w, height: Math.min(vh, height - y) } })
  }
} else {
  await page.screenshot({ path: `${out}/${name}-${theme}-${w}.png`, fullPage: full === 'full' })
}
await browser.close()
