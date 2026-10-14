// Full-page screenshots of every main page at three widths, plus layout checks.
//
//   node scripts/screenshots.mjs <label> [baseUrl] [apiUrl]
//
// Writes redesign-shots/<label>/<width>-<page>.png and redesign-shots/<label>/report.json
// (not committed). Checks per page: sideways scroll, touch targets under 44px on phones,
// text under 12px, and whether a story headline is visible without scrolling.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const [label = 'now', base = 'http://localhost:5174', api = 'http://localhost:8080'] = process.argv.slice(2)
const out = new URL(`../redesign-shots/${label}/`, import.meta.url).pathname
mkdirSync(out, { recursive: true })

const city = await fetch(`${api}/api/v1/map/cities?window=30d`).then((r) => r.json()).then((d) => d.cities?.[0]?.id).catch(() => undefined)
const PAGES = {
  home: '/',
  country: '/?country=JP',
  map: '/map',
  'map-city': city ? `/map/city/${city}` : '/map',
  search: '/search?q=india',
  'search-zero': '/search?q=zzzxq',
  sectors: '/sectors',
  sector: '/sector/business',
  social: '/social',
  about: '/about',
  status: '/status',
}
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'phone-320', width: 320, height: 640, mobile: true },
]

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
const report = []
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.mobile,
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  for (const [name, path] of Object.entries(PAGES)) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const checks = await page.evaluate((mobile) => {
      const vis = (el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
      }
      const small = mobile
        ? [...document.querySelectorAll('a, button, input, select, [role="button"]')]
            .filter(vis)
            .filter((el) => !el.closest('.leaflet-control-attribution'))
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.height < 44 && r.width < 44)
            .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
        : []
      const tiny = [...document.querySelectorAll('body *')]
        .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter(vis)
        .filter((el) => !el.closest('.leaflet-container'))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
        .map((el) => `${el.tagName.toLowerCase()} ${getComputedStyle(el).fontSize} "${el.textContent.trim().slice(0, 30)}"`)
      const headline = [...document.querySelectorAll('article h2 a, article h3 a')].find((a) => {
        const r = a.getBoundingClientRect()
        return r.top >= 0 && r.bottom <= window.innerHeight
      })
      return {
        sideways: document.documentElement.scrollWidth > window.innerWidth,
        smallTargets: [...new Set(small)].slice(0, 12),
        tinyText: [...new Set(tiny)].slice(0, 8),
        headlineAboveFold: Boolean(headline),
      }
    }, vp.mobile)
    await page.screenshot({ path: `${out}${vp.name}-${name}.png`, fullPage: true })
    report.push({ viewport: vp.name, page: name, path, ...checks })
  }
  await context.close()
}
await browser.close()
writeFileSync(`${out}report.json`, JSON.stringify(report, null, 2))
for (const r of report) {
  const issues = [
    r.sideways && 'SIDEWAYS SCROLL',
    r.smallTargets.length && `${r.smallTargets.length} small targets`,
    r.tinyText.length && `${r.tinyText.length} tiny text`,
    ['home', 'country'].includes(r.page) && !r.headlineAboveFold && 'no headline above fold',
  ].filter(Boolean)
  console.log(`${r.viewport.padEnd(13)} ${r.page.padEnd(12)} ${issues.join(', ') || 'ok'}`)
}
console.log(`\nScreenshots: ${out}`)
