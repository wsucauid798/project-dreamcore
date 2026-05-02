// Tiny static server for the production build (./dist).
// No dependencies. Auto-opens the browser when ready.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { exec } from 'node:child_process'

const PREFERRED_PORT = Number(process.env.PORT) || 5174
const ROOT = resolve('./dist')

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.splat': 'application/octet-stream',
  '.wasm':  'application/wasm',
  '.txt':   'text/plain; charset=utf-8',
}

// Distinguishing header on every response. The launcher uses this to detect
// "is there already a Dreamcore server running on this port?" before
// deciding whether to start a new one.
const SERVER_TAG = '1'

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    let filePath = normalize(join(ROOT, urlPath))
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden') }

    let s
    try { s = await stat(filePath) } catch { /* not found */ }
    if (s?.isDirectory()) filePath = join(filePath, 'index.html')

    let body
    try { body = await readFile(filePath) } catch {
      // SPA fallback so deep links resolve to index.html
      filePath = join(ROOT, 'index.html')
      body = await readFile(filePath)
    }

    const ext = extname(filePath).toLowerCase()
    // index.html points to hashed JS/CSS, so it MUST NOT be cached — otherwise
    // a browser holding a stale copy will keep loading old asset hashes after
    // a rebuild. Hashed assets (and immutable scene data) cache aggressively.
    const isHtml = ext === '.html'
    const cacheControl = isHtml
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000, immutable'
    // Content-Length is REQUIRED — drei's Splat loader bails without it.
    // If we omit it, Node switches to Transfer-Encoding: chunked and the
    // splats fail with "Failed to get content length", leaving a black screen.
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': body.byteLength,
      'cache-control': cacheControl,
      'x-dreamcore': SERVER_TAG,
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500); res.end('Server error: ' + err.message)
  }
})

// Open a URL in the user's default browser. Cross-platform best-effort —
// failure is silently ignored, the user can open it manually.
function openBrowser(url) {
  const opener = process.platform === 'win32' ? `start "" "${url}"`
              : process.platform === 'darwin' ? `open "${url}"`
              : `xdg-open "${url}"`
  exec(opener, () => { /* ignore failure */ })
}

// Probe: is there already a Dreamcore server on PREFERRED_PORT?
// (matched via the x-dreamcore response header)
async function findExisting() {
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 800)
    const url = `http://localhost:${PREFERRED_PORT}/`
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timeout)
    if (res.headers.get('x-dreamcore') === SERVER_TAG) return url
    return null
  } catch {
    return null
  }
}

// Listen on PREFERRED_PORT; if busy with something non-Dreamcore, ask the
// OS for any free port via listen(0).
function start() {
  const announce = () => {
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : PREFERRED_PORT
    const url = `http://localhost:${port}`
    console.log(`\n  Project Dreamcore is running at:`)
    console.log(`  → ${url}\n`)
    console.log(`  Press Ctrl+C to stop.\n`)
    openBrowser(url)
  }

  const onPreferredError = (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`  Port ${PREFERRED_PORT} is busy — picking any free port…`)
      server.removeListener('error', onPreferredError)
      server.once('error', (e) => {
        console.error('Server failed to start:', e)
        process.exit(1)
      })
      server.listen(0, announce)
    } else {
      console.error('Server failed to start:', err)
      process.exit(1)
    }
  }

  server.once('error', onPreferredError)
  server.listen(PREFERRED_PORT, () => {
    server.removeListener('error', onPreferredError)
    announce()
  })
}

// Startup: if Dreamcore is already running, just point the browser at the
// existing URL (browsers focus the matching tab instead of opening a new
// one) and exit. No second server, no second tab.
const existing = await findExisting()
if (existing) {
  console.log(`\n  Project Dreamcore is already running at ${existing}\n`)
  openBrowser(existing)
  process.exit(0)
}

start()
