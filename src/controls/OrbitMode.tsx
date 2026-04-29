import { useEffect, useMemo } from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../state/store'

type Props = {
  enabled: boolean
  target: THREE.Vector3
  worldRadius: number
}

/**
 * Orbit-around-target mode. The user's current camera position becomes the
 * starting orbit position; the target is the scene's centroid (post-orient).
 */
export function OrbitMode({ enabled, target, worldRadius }: Props) {
  const { camera } = useThree()
  const speed = useStore((s) => s.speed)
  const paused = useStore((s) => s.paused)

  // When orbit mode toggles on, ensure camera is at a sensible distance
  useEffect(() => {
    if (!enabled) return
    const distance = camera.position.distanceTo(target)
    const maxR = Math.max(2, worldRadius * 1.5)
    if (distance > maxR) {
      const dir = camera.position.clone().sub(target).normalize()
      camera.position.copy(target).addScaledVector(dir, maxR * 0.8)
    } else if (distance < 0.5) {
      camera.position.copy(target).add(new THREE.Vector3(0, worldRadius * 0.1, worldRadius * 0.6))
    }
    camera.lookAt(target)
  }, [enabled, camera, target, worldRadius])

  const targetCopy = useMemo(() => target.clone(), [target])

  if (!enabled) return null
  return (
    <OrbitControls
      target={targetCopy}
      enableDamping
      dampingFactor={0.1}
      panSpeed={0.7 * speed}
      rotateSpeed={0.7 * speed}
      zoomSpeed={0.8 * speed}
      enablePan
      enableZoom={!paused}
      enableRotate={!paused}
      minDistance={Math.max(0.4, worldRadius * 0.05)}
      maxDistance={worldRadius * 4}
      makeDefault
    />
  )
}
