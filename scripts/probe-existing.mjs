// Quick probe: is a Dreamcore server already running on the preferred
// port? If yes, point the browser at it and exit 0. If no, exit 1.
//
// The launcher .bat / .command runs this BEFORE the build step so a
// repeated launch doesn't rebuild 38MB of assets just to find out the app
// is already up. On exit 0 the launcher skips build + server start.

import { exec } from 'node:child_process'

const PREFERRED_PORT = Number(process.env.PORT) || 5174
const SERVER_TAG = '1' // must match SERVER_TAG in server.mjs

function openBrowser(url) {
  const opener = process.platform === 'win32' ? `start "" "${url}"`
              : process.platform === 'darwin' ? `open "${url}"`
              : `xdg-open "${url}"`
  exec(opener, () => { /* ignore failure */ })
}

try {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 800)
  const url = `http://localhost:${PREFERRED_PORT}/`
  const res = await fetch(url, { signal: ctrl.signal })
  clearTimeout(timeout)
  if (res.headers.get('x-dreamcore') === SERVER_TAG) {
    console.log(`\n  Dreamcore is already running at ${url} — opening that tab.\n`)
    openBrowser(url)
    process.exit(0) // signal to launcher: skip build + server
  }
} catch { /* nothing on the port; fall through */ }

process.exit(1) // signal to launcher: proceed with build + server
