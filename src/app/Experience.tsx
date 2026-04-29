import { useEffect, useMemo, useRef, useState } from 'react'
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

  useEffect(() => {
    setMobile(caps.isMobile)
    setWebGL2(caps.webgl2)
    setQuality(caps.webgl2 ? 'high' : 'low')
  }, [caps, setMobile, setWebGL2, setQuality])

  const { leftStick, rightStick, leftEl, rightEl } = useTouchInput()

  const frame = useMemo(() => manifest ? buildSceneFrame(manifest) : null, [manifest])

  const canvasContainerRef = useRef<HTMLDivElement>(null)

  if (!manifest || !frame) return null

  // Camera sizing from scene scale
  const baseSpeed = Math.max(1.5, frame.horizontalExtent * 0.05) // m/s at speed=1
  // Allow flying generously above the ceiling and just below the floor;
  // movement is camera-facing now (no Space ascend) so the limit is mostly
  // a safety net to prevent the user disappearing into the void.
  const yMax = frame.ceilY + frame.worldRadius
  const yMin = -frame.worldRadius * 0.2

  return (
    <div className="fixed inset-0 z-10" ref={canvasContainerRef}>
      <Canvas
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, caps.isMobile ? 1.5 : 2]}
        camera={{
          fov: 70,
          near: 0.05,
          far: Math.max(800, frame.worldRadius * 6),
          position: [frame.cameraEye.x, frame.cameraEye.y, frame.cameraEye.z],
        }}
        onCreated={({ camera }) => {
          camera.lookAt(frame.cameraTarget)
        }}
      >
        <color attach="background" args={[0x05050a]} />
        <fog attach="fog" args={[0x05050a, frame.worldRadius * 1.5, frame.worldRadius * 6]} />
        <SplatScene manifest={manifest} lodIndex={lodIndex} />
        <FlyControls
          enabled={mode === 'fly' && phase === 'experience'}
          baseSpeed={baseSpeed}
          yLimit={{ min: yMin, max: yMax }}
          leftStick={leftStick}
          rightStick={rightStick}
          pointerLockTarget={canvasContainerRef.current}
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
    </div>
  )
}
