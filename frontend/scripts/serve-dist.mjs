// Serves dist/ the way Cloudflare Pages does for EastWire: headers from dist/_headers and the
// single-page-app fallback from _redirects. Used by the Playwright tests, so they run against
// the production build with the real Content-Security-Policy.
//
// Usage: node scripts/serve-dist.mjs [port]
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = new URL('../dist/', import.meta.url).pathname
const port = Number(process.argv[2] ?? 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

/** Parses the _headers format: an unindented path pattern, then indented "Name: value" lines. */
function parseHeaders(text) {
  const rules = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!line.startsWith(' ')) rules.push({ pattern: line.trim(), headers: {} })
    else {
      const i = line.indexOf(':')
      rules.at(-1).headers[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  return rules
}

const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8'))
const matches = (pattern, path) =>
  pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = normalize(join(root, path))
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'index.html') // _redirects: /* /index.html 200
  }
  for (const rule of rules) {
    if (matches(rule.pattern, path)) for (const [k, v] of Object.entries(rule.headers)) res.setHeader(k, v)
  }
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(res)
}).listen(port, '127.0.0.1', () => console.log(`dist on http://127.0.0.1:${port}`))
