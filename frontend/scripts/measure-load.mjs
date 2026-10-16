// Measures what a first-time visitor sees on a cold or warm backend.
//
//   node scripts/measure-load.mjs <label> [siteUrl] [width]
//
// Fresh browser context (no saved copy), then records: first paint, first story headline with
// text, when skeletons are gone, when live data from the API arrived, and any "waking" notice.
// Screenshots at fixed moments go to redesign-shots/load-<label>/. Prints JSON.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const [label = 'now', site = 'https://eastwire.pages.dev/', width = '1440'] = process.argv.slice(2)
const out = new URL(`../redesign-shots/load-${label}/`, import.meta.url).pathname
mkdirSync(out, { recursive: true })
const w = Number(width)

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' })
const context = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, hasTouch: w < 768 })
const page = await context.newPage()
const t0 = Date.now()
const events = {}
page.on('response', (r) => {
  const u = r.url()
  if (/\/api\/v1\/front(\?|$)/.test(u) && !events.liveFront) events.liveFront = Date.now() - t0
  if (/snapshot/.test(u) && !events.snapshot) events.snapshot = Date.now() - t0
})
await page.goto(site, { waitUntil: 'commit' })
const shots = [1000, 2000, 5000, 10000, 30000, 60000]
let next = 0
const deadline = t0 + 120_000
while (Date.now() < deadline) {
  const now = Date.now() - t0
  const state = await page
    .evaluate(() => {
      const headline = [...document.querySelectorAll('article h2, article h3')].find((h) => h.textContent.trim().length > 10)
      return {
        painted: Boolean(document.querySelector('#root > *')),
        headline: headline ? headline.textContent.trim().slice(0, 80) : null,
        skeleton: Boolean(document.querySelector('[aria-busy="true"]')),
        waking: /waking/i.test(document.body.innerText),
        zeroCounter: [...document.querySelectorAll('[class*="count"]')].some((el) => el.textContent.trim() === '0'),
      }
    })
    .catch(() => null)
  if (state) {
    if (state.painted && events.painted === undefined) events.painted = now
    if (state.headline && events.headline === undefined) {
      events.headline = now
      events.headlineText = state.headline
    }
    if (!state.skeleton && state.headline && events.noSkeleton === undefined) events.noSkeleton = now
    if (state.waking && events.wakingShown === undefined) events.wakingShown = now
    if (state.zeroCounter && events.zeroCounterShown === undefined) events.zeroCounterShown = now
  }
  if (next < shots.length && now >= shots[next]) {
    await page.screenshot({ path: `${out}${w}-${shots[next] / 1000}s.png` }).catch(() => {})
    next++
  }
  if (events.liveFront !== undefined && events.headline !== undefined && next >= 3 && now > events.liveFront + 1500) break
  await page.waitForTimeout(100)
}
events.total = Date.now() - t0
await browser.close()
writeFileSync(`${out}${w}.json`, JSON.stringify(events, null, 2))
console.log(JSON.stringify({ label, site, width: w, ...events }))
