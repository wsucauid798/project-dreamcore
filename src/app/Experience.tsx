import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { SplatScene } from '../scene/SplatScene'
import { FlyControls } from '../controls/FlyControls'
import { OrbitMode } from '../controls/OrbitMode'
import { SceneFadeOverlay, useSceneFade } from '../scene/SceneTransition'
import { useTouchInput } from '../controls/useTouchInput'
import { HUD } from '../ui/HUD'
import { detectCapabilities } from '../lib/capabilities'
import { buildSceneFrame } from '../lib/orient'

// Catches errors thrown inside the R3F tree (most commonly: a splat loader
// rejecting because the server didn't send Content-Length, or a parse
// failure). Without this, Suspense silently swallows the error and the user
// just sees a black screen with no clue what went wrong.
class SceneErrorBoundary extends Component<
  { onError: (err: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) {
    const error = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown scene error')
    console.error('[dreamcore] Scene render failed', error)
    this.props.onError(error)
  }
  render() { return this.state.failed ? null : this.props.children }
}

// In-experience host: R3F canvas with the splat scene, controls, and HUD.
export function Experience() {
  const manifest = useStore((s) => s.currentManifest)
  const phase = useStore((s) => s.phase)
  const mode = useStore((s) => s.mode)
  const setMobile = useStore((s) => s.setMobile)
  const setWebGL2 = useStore((s) => s.setWebGL2)
  const setQuality = useStore((s) => s.setQuality)
  useSceneFade()

  const caps = useMemo(() => detectCapabilities(), [])
  const [lodIndex, setLodIndex] = useState(caps.preferredLodIndex)
  useEffect(() => { setLodIndex(caps.preferredLodIndex) }, [caps.preferredLodIndex, manifest?.id])
  const [sceneError, setSceneError] = useState<Error | null>(null)
  // Reset error when switching scenes so the new one gets a fresh attempt.
  useEffect(() => { setSceneError(null) }, [manifest?.id])
  const goToStart = useStore((s) => s.goToStart)

  useEffect(() => {
    setMobile(caps.isMobile)
    setWebGL2(caps.webgl2)
    setQuality(caps.webgl2 ? 'high' : 'low')
  }, [caps, setMobile, setWebGL2, setQuality])

  const { leftStick, rightStick, leftEl, rightEl } = useTouchInput()

  const flipUp = useStore((s) => manifest ? !!s.upFlips[manifest.id] : false)
  const frame = useMemo(
    () => manifest ? buildSceneFrame(manifest, flipUp) : null,
    [manifest, flipUp],
  )

  if (!manifest || !frame) return null

  // Camera sizing from scene scale
  const baseSpeed = Math.max(1.5, frame.horizontalExtent * 0.05) // m/s at speed=1
  // Allow flying generously above the ceiling and just below the floor;
  // movement is camera-facing now (no Space ascend) so the limit is mostly
  // a safety net to prevent the user disappearing into the void.
  const yMax = frame.ceilY + frame.worldRadius
  const yMin = -frame.worldRadius * 0.2

  return (
    <div className="fixed inset-0 z-10">
      <Canvas
        key={manifest.id}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
        dpr={[1, caps.isMobile ? 1.5 : 2]}
        camera={{
          fov: 70,
          near: 0.05,
          far: Math.max(800, frame.worldRadius * 6),
          position: [frame.cameraEye.x, frame.cameraEye.y, frame.cameraEye.z],
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(frame.cameraTarget)
          // Recover gracefully if the GPU drops the context (driver hiccups, OOM, etc).
          // THREE.WebGLRenderer already logs context-lost/restored on its own,
          // so we only call preventDefault to opt into auto-restore — no extra logs.
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
        }}
      >
        <color attach="background" args={[0x05050a]} />
        <fog attach="fog" args={[0x05050a, frame.worldRadius * 1.5, frame.worldRadius * 6]} />
        <SceneErrorBoundary onError={setSceneError}>
          <SplatScene manifest={manifest} lodIndex={lodIndex} />
        </SceneErrorBoundary>
        <FlyControls
          enabled={mode === 'fly' && phase === 'experience'}
          baseSpeed={baseSpeed}
          yLimit={{ min: yMin, max: yMax }}
          leftStick={leftStick}
          rightStick={rightStick}
        />
        <OrbitMode
          enabled={mode === 'orbit' && phase === 'experience'}
          target={new THREE.Vector3(frame.cameraTarget.x, frame.cameraTarget.y, frame.cameraTarget.z)}
          worldRadius={frame.worldRadius}
        />
      </Canvas>
      <SceneFadeOverlay />
      <HUD
        leftRef={leftEl}
        rightRef={rightEl}
        lodIndex={lodIndex}
        lodCount={manifest.kind === 'single' ? (manifest.lods?.length ?? 1) : 3}
        onLodChange={setLodIndex}
      />
      {sceneError && (
        <div className="pointer-events-auto fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
          <div className="w-full max-w-2xl rounded-2xl border border-warn/60 bg-warn/10 p-4 text-left shadow-veil backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warn">Scene failed to load</p>
            <p className="mt-2 text-sm text-text">{sceneError.message}</p>
            <p className="mt-2 text-xs text-text-soft">
              If you launched via the showcase script, the production server may be missing
              the <code className="font-mono text-accent">Content-Length</code> header that
              the splat loader requires. Try <code className="font-mono text-accent">npm run dev</code> instead,
              or rebuild after pulling the latest <code className="font-mono text-accent">server.mjs</code>.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={goToStart}
                className="rounded-full border border-line/70 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-text-soft hover:border-accent hover:text-accent"
              >
                Back to start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
