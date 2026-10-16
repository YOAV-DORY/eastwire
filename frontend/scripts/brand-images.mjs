// Renders the social preview image (public/og-image.png, 1200x630) and the home-screen icon
// (public/apple-touch-icon.png, 180x180) from EastWire's own fonts and colours.
// node scripts/brand-images.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const font = (pkg, file) => `url(data:font/woff2;base64,${readFileSync(new URL(`../node_modules/@fontsource-variable/${pkg}/files/${file}`, import.meta.url)).toString('base64')})`
const faces = `
  @font-face { font-family: Brand; src: ${font('newsreader', 'newsreader-latin-opsz-normal.woff2')}; font-weight: 200 800; }
  @font-face { font-family: Head; src: ${font('archivo', 'archivo-latin-wght-normal.woff2')}; font-weight: 100 900; }
  @font-face { font-family: Body; src: ${font('schibsted-grotesk', 'schibsted-grotesk-latin-wght-normal.woff2')}; font-weight: 400 900; }`

const pin = (size, hole) => `<svg width="${size}" height="${size * 1.25}" viewBox="0 0 16 20"><path d="M8 0a8 8 0 0 1 8 8c0 5.5-8 12-8 12S0 13.5 0 8a8 8 0 0 1 8-8Z" fill="#c8102e"/><circle cx="8" cy="8" r="2.75" fill="${hole}"/></svg>`
const countries = [['China', '#de2910'], ['India', '#ff9933'], ['South Korea', '#0047a0'], ['Japan', '#bc002d']]

const og = `<!doctype html><html><head><style>${faces}
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #111214; color: #f3f1ec; font-family: Body; position: relative; overflow: hidden; }
  body::before { content: ""; position: absolute; inset: 0 0 auto; height: 10px; background: #c8102e; }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(90deg, transparent 30%, #000 85%); }
  main { position: absolute; inset: 72px 80px 64px; display: grid; grid-template-columns: 1fr 300px; gap: 56px; }
  .mark { display: flex; align-items: center; gap: 16px; font-family: Brand; font-weight: 600; font-size: 52px; letter-spacing: -.025em; }
  .mark b { color: #ff5a6e; font-weight: 600; }
  h1 { margin-top: 64px; font-family: Head; font-weight: 800; font-size: 66px; line-height: 1; letter-spacing: -.035em; }
  p { margin-top: 28px; max-width: 30ch; color: #c4c1ba; font-size: 27px; line-height: 1.35; }
  ul { list-style: none; padding: 0; align-self: end; border-top: 4px solid #f3f1ec; }
  li { display: flex; align-items: center; gap: 16px; padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,.14); font-family: Head; font-weight: 700; font-size: 30px; letter-spacing: -.01em; }
  li i { width: 14px; height: 14px; border-radius: 3px; }
  footer { position: absolute; left: 80px; bottom: 44px; color: #8d8a84; font-size: 22px; letter-spacing: .02em; }
</style></head><body><div class="grid"></div><main>
  <div><div class="mark">${pin(40, '#111214')}<span>East<b>Wire</b></span></div>
  <h1>News from four countries, in one place.</h1>
  <p>Headlines from outlets whose terms allow it, linked to the original, with every source shown.</p></div>
  <ul>${countries.map(([n, c]) => `<li><i style="background:${c}"></i>${n}</li>`).join('')}</ul>
</main><footer>eastwire.pages.dev</footer></body></html>`

const icon = `<!doctype html><html><head><style>* { margin: 0 } body { width: 180px; height: 180px; background: #111214; display: grid; place-items: center; }</style></head>
<body>${pin(96, '#111214')}</body></html>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(og)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname })
await page.setViewportSize({ width: 180, height: 180 })
await page.setContent(icon)
await page.screenshot({ path: new URL('../public/apple-touch-icon.png', import.meta.url).pathname })
await browser.close()
console.log('wrote public/og-image.png and public/apple-touch-icon.png')
