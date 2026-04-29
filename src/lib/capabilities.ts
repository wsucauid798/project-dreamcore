// Device + GPU capability detection. Runs once at boot.

export type Capabilities = {
  webgl2: boolean
  isMobile: boolean
  isLowEnd: boolean
  preferredLodIndex: number // index into the manifest.lods array (0 = highest quality)
}

export function detectCapabilities(): Capabilities {
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod|opera mini|iemobile|mobile/.test(ua) ||
    (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)

  let webgl2 = false
  try {
    const canvas = document.createElement('canvas')
    webgl2 = !!canvas.getContext('webgl2')
  } catch { /* ignore */ }

  // Heuristic: low end if mobile + < 4GB device memory (where exposed) OR <= 4 cores
  const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency || 4
  const isLowEnd = isMobile && ((dm !== undefined && dm < 4) || cores <= 4)

  let preferredLodIndex = 0
  if (isLowEnd) preferredLodIndex = 3
  else if (isMobile) preferredLodIndex = 2
  else preferredLodIndex = 1 // a single floor at LOD0 is ~28MB; default to LOD1 (~17MB) on desktop too

  return { webgl2, isMobile, isLowEnd, preferredLodIndex }
}
