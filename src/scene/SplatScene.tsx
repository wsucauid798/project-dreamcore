import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Splat } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneManifest } from '../state/store'
import { buildSceneFrame } from '../lib/orient'

type Props = {
  manifest: SceneManifest
  lodIndex: number
  onReady?: (frame: ReturnType<typeof buildSceneFrame>) => void
}

/**
 * Scene loaded from a manifest: handles single-PLY scenes (one .splat per LOD)
 * and lod-blocks scenes (multiple blocks at the chosen LOD level).
 *
 * The whole splat group is wrapped in a `<group>` with the auto-computed
 * orientation matrix so that +Y is up and the floor is at y=0.
 */
export function SplatScene({ manifest, lodIndex, onReady }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const frame = useMemo(() => buildSceneFrame(manifest), [manifest])

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.matrixAutoUpdate = false
    groupRef.current.matrix.copy(frame.matrix)
    groupRef.current.matrixWorldNeedsUpdate = true
    onReady?.(frame)
    // Only run when the manifest changes
  }, [manifest.id, frame, onReady])

  const splatUrls = useMemo(() => {
    const base = `${import.meta.env.BASE_URL}assets/scenes/${manifest.id}/`
    if (manifest.kind === 'single') {
      const lods = manifest.lods ?? []
      const idx = Math.min(Math.max(0, lodIndex), lods.length - 1)
      const lod = lods[idx]
      return lod ? [base + lod.file] : []
    } else {
      // lod-blocks: pick the LOD level by index across all blocks
      const blocks = manifest.blocks ?? []
      const out: string[] = []
      // Block-level lods are ordered LOD3 (idx 0) → LOD5 (idx 2) by the converter.
      const localIdx = Math.min(Math.max(0, lodIndex), 2)
      for (const block of blocks) {
        const lod = block.lods[localIdx] ?? block.lods[block.lods.length - 1]
        if (lod) out.push(base + lod.file)
      }
      return out
    }
  }, [manifest, lodIndex])

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        {splatUrls.map((url) => (
          <Splat key={url} src={url} alphaTest={0.1} chunkSize={50000} />
        ))}
      </Suspense>
    </group>
  )
}
