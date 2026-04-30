import { useEffect } from 'react'
import { useStore } from '../state/store'

// Black overlay for cross-scene fades. DOM-based, not a post-pass.
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

// Drives fadeAlpha from app phase: black during load, fade in once ready.
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
