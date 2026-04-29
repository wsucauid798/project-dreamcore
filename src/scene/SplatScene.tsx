import { Suspense, useMemo } from 'react'
import { Splat } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneManifest } from '../state/store'
import { buildSceneFrame } from '../lib/orient'
import { useStore } from '../state/store'

type Props = {
  manifest: SceneManifest
  lodIndex: number
  showDebugBox?: boolean
}

/**
 * Scene loaded from a manifest: handles single-PLY scenes (one .splat per LOD)
 * and lod-blocks scenes (multiple blocks at the chosen LOD level).
 *
 * The whole splat group is positioned/rotated by decomposing the manifest's
 * orientation matrix into TRS — using the matrix directly with
 * matrixAutoUpdate=false fights drei's internal per-frame sort.
 */
export function SplatScene({ manifest, lodIndex, showDebugBox = false }: Props) {
  const flipUp = useStore((s) => !!s.upFlips[manifest.id])
  const frame = useMemo(() => buildSceneFrame(manifest, flipUp), [manifest, flipUp])

  // Decompose matrix → position/quaternion/scale so Three.js owns matrix updates.
  const trs = useMemo(() => {
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    frame.matrix.decompose(pos, quat, scl)
    return { pos, quat, scl }
  }, [frame])

  const splatUrls = useMemo(() => {
    const base = `${import.meta.env.BASE_URL}assets/scenes/${manifest.id}/`
    if (manifest.kind === 'single') {
      const lods = manifest.lods ?? []
      const idx = Math.min(Math.max(0, lodIndex), lods.length - 1)
      const lod = lods[idx]
      return lod ? [base + lod.file] : []
    } else {
      const blocks = manifest.blocks ?? []
      const out: string[] = []
      const localIdx = Math.min(Math.max(0, lodIndex), 2)
      for (const block of blocks) {
        const lod = block.lods[localIdx] ?? block.lods[block.lods.length - 1]
        if (lod) out.push(base + lod.file)
      }
      return out
    }
  }, [manifest, lodIndex])

  // Bounding box (post-transform) helps confirm the scene exists in view
  // even if splats fail to render. Toggle via showDebugBox.
  const boxArgs = useMemo<[number, number, number]>(() => {
    return [frame.horizontalExtent, Math.max(2, frame.ceilY), frame.horizontalExtent]
  }, [frame])

  return (
    <group position={trs.pos} quaternion={trs.quat} scale={trs.scl}>
      {showDebugBox && (
        <mesh position={[0, frame.ceilY / 2, 0]}>
          <boxGeometry args={boxArgs} />
          <meshBasicMaterial color={0xc084fc} wireframe />
        </mesh>
      )}
      <Suspense fallback={null}>
        {splatUrls.map((url) => (
          <Splat key={url} src={url} alphaTest={0.05} chunkSize={25000} />
        ))}
      </Suspense>
    </group>
  )
}
