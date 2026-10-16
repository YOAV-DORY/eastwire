// Phone audit: horizontal scroll and touch targets under 44 px, per page, at 320 px.
// node scripts/audit-mobile.mjs [base-url]   (inline links inside running text are exempt, WCAG 2.5.8)
import { chromium } from '@playwright/test'
const base = process.argv[2] ?? 'http://localhost:5174'
const PAGES = ['/', '/map', '/search', '/search?q=Japan', '/social', '/sources', '/about']
const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 320, height: 720 }, hasTouch: true, isMobile: true })
let failures = 0
for (const path of PAGES) {
  const page = await context.newPage()
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const result = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth
    const wide = overflow > 0
      ? [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 5).map((el) => el.tagName + '.' + el.className)
      : []
    const inText = (el) => {
      const block = el.closest('p, li, dd, figcaption, td, .leaflet-control-attribution, small')
      return block && block.textContent.trim().length > el.textContent.trim().length + 20
    }
    const small = [...document.querySelectorAll('a[href], button, input, select, [role="button"], summary')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return false
        if (el.closest('[aria-hidden="true"], .visually-hidden')) return false
        if (inText(el) || el.closest('.leaflet-control-attribution')) return false
        // A larger hit area drawn by ::before/::after counts.
        const pseudo = ['::before', '::after'].map((p) => getComputedStyle(el, p)).find((s) => s.content !== 'none' && s.position === 'absolute')
        if (pseudo) return false
        return r.height < 43.5 || r.width < 43.5
      })
      .slice(0, 12)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`
      })
    return { overflow, wide, small }
  })
  const ok = result.overflow <= 0 && result.small.length === 0
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${path}  overflow=${result.overflow}px  small targets=${result.small.length}`)
  result.wide.forEach((w) => console.log('     wide:', w))
  result.small.forEach((s) => console.log('     small:', s))
  await page.close()
}
await browser.close()
process.exit(failures ? 1 : 0)
