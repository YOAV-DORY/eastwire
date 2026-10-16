// Screenshots of every main page at three widths and in both themes, plus layout checks.
// "article" is the story view: the home page with the lead story's Details sheet open.
//
//   node scripts/screenshots.mjs <label> [baseUrl] [apiUrl]
//
// Writes redesign-shots/<label>/<theme>-<width>-<page>-{full,first}.png and report.json (not
// committed). Checks per page: sideways scroll, touch targets under 44px on phones, text under
// 12px, a story headline on the first screen (front pages), broken images, illustrative images
// without their credit, loading that never ends, Latest stories older than its window, headings
// cut off sideways, and any font family outside the three (plus the wordmark's serif).
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const [label = 'now', base = 'http://localhost:5174', api = 'http://localhost:8080'] = process.argv.slice(2)
const out = new URL(`../redesign-shots/${label}/`, import.meta.url).pathname
mkdirSync(out, { recursive: true })

const city = await fetch(`${api}/api/v1/map/cities?window=7d`).then((r) => r.json()).then((d) => d.cities?.[0]?.id).catch(() => undefined)
const PAGES = {
  home: '/',
  'country-jp': '/?country=JP',
  'country-kr': '/?country=KR',
  map: '/map',
  'map-city': city ? `/map/city/${city}` : '/map',
  'map-list': city ? `/map/city/${city}?view=list` : '/map?view=list',
  'map-japan': '/map?country=JP',
  article: '/',
  sources: '/sources',
  about: '/about',
  search: '/search?q=Japan',
  'search-zero': '/search?q=zzzxq',
  sectors: '/sectors',
  'sector-economy': '/sector/economy',
  'sector-technology': '/sector/technology',
  social: '/social',
  'search-empty': '/search',
}
// Sector pages open on a full-bleed hero, so only the front pages must show a headline on the first screen.
// PAGES=home,map,... limits the run to those pages (default: all).
if (process.env.PAGES) for (const key of Object.keys(PAGES)) if (!process.env.PAGES.split(',').includes(key)) delete PAGES[key]
const FRONT_PAGES = new Set(['home', 'country-jp'])
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, mobile: false },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '320', width: 320, height: 640, mobile: true },
]
const THEMES = (process.env.THEMES ?? 'light,dark').split(',')

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
const report = []
for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.mobile })
    await context.addInitScript((t) => localStorage.setItem('eastwire.theme', t), theme)
    const page = await context.newPage()
    for (const [name, path] of Object.entries(PAGES)) {
      await page.goto(base + path, { waitUntil: 'networkidle' })
      // Loading must end: no busy region and no skeleton left after the network is quiet.
      const settled = await page
        .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15_000 })
        .then(() => true)
        .catch(() => false)
      // Scroll through once so lazy pictures load and scroll-driven reveals finish, then back up.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 60))
        }
        document.querySelectorAll('.reveal').forEach((el) => (el.style.animation = 'none'))
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(500)
      if (name === 'article') {
        await page.getByRole('button', { name: /^Details/ }).first().click()
        await page.waitForTimeout(600)
      }
      const checks = await page.evaluate(
        ({ mobile, front }) => {
          const vis = (el) => {
            const r = el.getBoundingClientRect()
            const s = getComputedStyle(el)
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'
          }
          const small = mobile
            ? [...document.querySelectorAll('a, button, input, select, summary, [role="button"]')]
                .filter(vis)
                .filter((el) => !el.closest('.leaflet-control-attribution'))
                .filter((el) => !el.matches('.leaflet-marker-icon'))
                // Links inside running text and photo credits are exempt (WCAG 2.5.8 inline exception).
                .filter((el) => !(el.tagName === 'A' && el.closest('p, h1, h2, h3, h4, dd, blockquote, figcaption')))
                // A visibly smaller button may draw a 44px hit area around itself (::before).
                .filter((el) => {
                  const hit = getComputedStyle(el, '::before')
                  return !(hit.content !== 'none' && hit.position === 'absolute' && el.getBoundingClientRect().height - 2 * parseFloat(hit.top) >= 44)
                })
                .map((el) => ({ el, r: el.getBoundingClientRect() }))
                .filter(({ r }) => r.height < 44)
                .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
            : []
          const tiny = [...document.querySelectorAll('body *')]
            .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
            .filter(vis)
            .filter((el) => !el.closest('.leaflet-container'))
            .filter((el) =>
              // SVG text is scaled with its icon: judge its rendered height, not its font-size attribute.
              el.namespaceURI === 'http://www.w3.org/2000/svg' ? el.getBoundingClientRect().height < 11 : parseFloat(getComputedStyle(el).fontSize) < 12,
            )
            .map((el) => `${el.tagName.toLowerCase()} ${getComputedStyle(el).fontSize} "${el.textContent.trim().slice(0, 30)}"`)
          // A headline starts on the first screen: its first line clears the masthead and the phone's bottom bar.
          const bottomBar = document.querySelector('nav[aria-label="Primary"]:last-of-type')?.getBoundingClientRect().height ?? 0
          const headline = [...document.querySelectorAll('article h2 a, article h3 a')].find((a) => {
            const r = a.getBoundingClientRect()
            return r.top >= 0 && r.top + 30 <= window.innerHeight - (mobile ? bottomBar : 0)
          })
          const brokenImages = [...document.querySelectorAll('img')]
            .filter((img) => !img.closest('.leaflet-container') && img.complete && img.naturalWidth === 0)
            .map((img) => img.getAttribute('src')?.slice(0, 80))
          const uncredited = [...document.querySelectorAll('figure img')]
            .filter((img) => {
              const cap = img.closest('figure')?.querySelector('figcaption')
              return !cap || !/Illustrative image|Historical map|Illustration/i.test(cap.textContent) || !cap.querySelector('a[href*="commons.wikimedia.org"]')
            })
            .map((img) => img.getAttribute('alt'))
          // Latest must not contain stories older than its window (48 h by default).
          const latest = document.querySelector('section[aria-labelledby="latest-title"]')
          const old = latest
            ? [...latest.querySelectorAll('time[datetime]')]
                .filter((t) => Date.now() - new Date(t.getAttribute('datetime')).getTime() > 49 * 3600_000)
                .map((t) => t.closest('article')?.querySelector('h2, h3')?.textContent?.slice(0, 50))
            : []
          const cut = [...document.querySelectorAll('h1, h2, h3')]
            .filter(vis)
            .filter((h) => !h.closest('.visually-hidden') && !h.classList.contains('visually-hidden'))
            .filter((h) => h.scrollWidth > h.clientWidth + 1)
            .map((h) => h.textContent.trim().slice(0, 40))
          const allowed = /Archivo|Schibsted|Source Sans|Newsreader/
          const fonts = new Set()
          const strayFonts = [...document.querySelectorAll('body *')]
            .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
            .filter(vis)
            .filter((el) => !el.closest('.leaflet-container') && !el.closest('.bluesky-embed'))
            .map((el) => {
              const family = getComputedStyle(el).fontFamily.split(',')[0].replace(/"/g, '').trim()
              fonts.add(family)
              const serifOk = !/Newsreader/.test(family) || el.closest('[class*="wordmark"]')
              return allowed.test(family) && serifOk ? null : `${el.tagName.toLowerCase()} ${family} "${el.textContent.trim().slice(0, 20)}"`
            })
            .filter(Boolean)
          return {
            cutHeadings: cut,
            fonts: [...fonts],
            strayFonts: [...new Set(strayFonts)].slice(0, 6),
            sideways: document.documentElement.scrollWidth > window.innerWidth,
            smallTargets: [...new Set(small)].slice(0, 12),
            tinyText: [...new Set(tiny)].slice(0, 8),
            headlineAboveFold: Boolean(headline),
            brokenImages,
            uncredited,
            staleInLatest: old,
            front,
          }
        },
        { mobile: vp.mobile, front: FRONT_PAGES.has(name) },
      )
      const file = `${theme}-${vp.name}-${name}`
      await page.screenshot({ path: `${out}${file}-first.png` })
      if (name !== 'article') await page.screenshot({ path: `${out}${file}-full.png`, fullPage: true })
      report.push({ theme, viewport: vp.name, page: name, path, settled, ...checks })
    }
    await context.close()
  }
}
await browser.close()
writeFileSync(`${out}report.json`, JSON.stringify(report, null, 2))
for (const r of report) {
  const issues = [
    !r.settled && 'NEVER STOPPED LOADING',
    r.sideways && 'SIDEWAYS SCROLL',
    r.smallTargets.length && `${r.smallTargets.length} small targets`,
    r.tinyText.length && `${r.tinyText.length} tiny text`,
    r.front && !r.headlineAboveFold && 'no headline on first screen',
    r.brokenImages.length && `${r.brokenImages.length} broken images`,
    r.uncredited.length && `${r.uncredited.length} images without credit`,
    r.staleInLatest.length && `${r.staleInLatest.length} old stories in Latest`,
    r.cutHeadings.length && `${r.cutHeadings.length} headings cut off`,
    r.strayFonts.length && `${r.strayFonts.length} stray fonts`,
  ].filter(Boolean)
  console.log(`${r.theme.padEnd(5)} ${r.viewport.padEnd(5)} ${r.page.padEnd(18)} ${issues.join(', ') || 'ok'}`)
}
console.log(`\nScreenshots: ${out}`)
