// A stand-in for a sleeping free-tier API, for measuring cold loads locally.
//
//   node scripts/slow-proxy.mjs <port> <target> <wakeSeconds> [snapshotFile]
//
// Starts "asleep": the first request starts a wake-up of <wakeSeconds>, and every request waits
// until then; after that it forwards at once. Adds permissive CORS (local only). If a snapshot
// file is given it is served at /snapshot.json immediately, like the edge Worker would.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const [port = '8099', target = 'http://localhost:8080', wake = '50', snapshotFile] = process.argv.slice(2)
let awakeAt = null
const ready = () => (awakeAt === null ? (awakeAt = Date.now() + Number(wake) * 1000) : awakeAt)

createServer(async (req, res) => {
  const cors = { 'access-control-allow-origin': '*' }
  if (req.url === '/snapshot.json' && snapshotFile) {
    res.writeHead(200, { ...cors, 'content-type': 'application/json' })
    res.end(readFileSync(snapshotFile))
    return
  }
  const wait = ready() - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  try {
    const upstream = await fetch(target + req.url, { headers: { accept: 'application/json' } })
    const body = Buffer.from(await upstream.arrayBuffer())
    res.writeHead(upstream.status, { ...cors, 'content-type': upstream.headers.get('content-type') ?? 'application/json' })
    res.end(body)
  } catch {
    res.writeHead(502, cors)
    res.end()
  }
}).listen(Number(port), '127.0.0.1', () => console.log(`slow proxy on ${port}, waking ${wake}s after the first request`))
