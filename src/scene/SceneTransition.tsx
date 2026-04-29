import { useEffect } from 'react'
import { useStore } from '../state/store'

/**
 * Black overlay on top of the canvas for fade in/out between scenes.
 * Pure DOM/CSS — easier to control than a Three.js post-pass and stays
 * crisp on every screen.
 */
export function SceneFadeOverlay() {
  const fadeAlpha = useStore((s) => s.fadeAlpha)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 bg-veil"
      style={{
        opacity: fadeAlpha,
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    />
  )
}

/**
 * Drives fade alpha based on phase. When loading -> alpha 1, when in
 * experience and scene ready -> alpha 0.
 */
export function useSceneFade() {
  const phase = useStore((s) => s.phase)
  const manifest = useStore((s) => s.currentManifest)
  const setFade = useStore((s) => s.setFade)

  useEffect(() => {
    if (phase === 'experience' && manifest) {
      // Wait a tick to let the splat materialise, then fade in
      const t = setTimeout(() => setFade(0), 250)
      return () => clearTimeout(t)
    } else if (phase === 'loading' || phase === 'start') {
      setFade(1)
    }
  }, [phase, manifest, setFade])
}
