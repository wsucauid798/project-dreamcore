// Tiny static server for the production build (./dist).
// No dependencies. Auto-opens the browser when ready.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { exec } from 'node:child_process'

const PORT = Number(process.env.PORT) || 5174
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
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'public, max-age=600',
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500); res.end('Server error: ' + err.message)
  }
})

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log(`\n  Project Dreamcore is running at:`)
  console.log(`  → ${url}\n`)
  console.log(`  Press Ctrl+C to stop.\n`)

  const opener = process.platform === 'win32' ? `start "" "${url}"`
              : process.platform === 'darwin' ? `open "${url}"`
              : `xdg-open "${url}"`
  exec(opener, () => { /* ignore failure — user can open manually */ })
})
