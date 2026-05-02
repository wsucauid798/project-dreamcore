import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Filter two recurring third-party warnings we can't fix at the source:
//   1. `THREE.Clock: This module has been deprecated` — three.js itself still
//      uses Clock internally; the deprecation is meant for app code, not us.
//   2. `WebGL warning: texSubImage: No texture bound to TEXTURE_2D[0]` —
//      drei's Splat loader uploads chunks before the GPU texture is bound;
//      harmless under the hood, but spams the console on every scene load.
// Anything else still passes through. Match is exact-substring + scoped to
// console.warn only, so real WebGL/three errors are untouched.
const SUPPRESSED_WARN_FRAGMENTS = [
  'THREE.Clock',
  'texSubImage: No texture bound',
]
const originalWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : ''
  if (SUPPRESSED_WARN_FRAGMENTS.some((needle) => first.includes(needle))) return
  originalWarn(...args)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
