// Client-side helpers for re-framing scenes per the manifest's PCA result.
//
// The converter computes a `up` vector in source-PLY coordinates. To make
// flying feel natural we want the world's +Y to be up. We therefore build
// a rotation that maps the manifest's `up` -> world +Y, `forward` -> world -Z.
//
// We then translate the scene so its centroid sits at the origin and the
// detected floor lies on y=0.

import * as THREE from 'three'
import type { SceneManifest, Vec3 } from '../state/store'

const v = (x: Vec3) => new THREE.Vector3(x[0], x[1], x[2])

export type SceneFrame = {
  /** Apply this matrix to splat group to put scene in +Y-up world frame, floor at y=0. */
  matrix: THREE.Matrix4
  /** World-space entry pose (after the matrix transform is applied). */
  cameraEye: THREE.Vector3
  cameraTarget: THREE.Vector3
  /** Bounding sphere radius (world units), useful for far plane / orbit limits. */
  worldRadius: number
  /** Floor height (world y, post-transform): 0 by construction. */
  floorY: 0
  /** Ceiling-ish height in world y. */
  ceilY: number
  /** Roughly how big the scene is along its widest horizontal axis. */
  horizontalExtent: number
}

export function buildSceneFrame(m: SceneManifest, flipUp = false): SceneFrame {
  const up = v(m.up).normalize()
  if (flipUp) up.negate()
  const fwd = v(m.forward).normalize()
  // Make sure forward is orthogonal to up
  fwd.sub(up.clone().multiplyScalar(up.dot(fwd))).normalize()
  // Right-handed basis: right = up × forward
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize()

  // Mapping source (right, up, forward) -> world (X, Y, Z). Since the source
  // basis is right-handed, this is a pure rotation (det = +1). Three.js'
  // camera convention (looks down -Z) is independent — we set camera
  // position and target in world coords explicitly.
  // Build a matrix R such that R · right = +X, R · up = +Y, R · forward = +Z.
  // That means R has rows = (right, up, forward).
  const rot = new THREE.Matrix4().makeBasis(right, up, fwd)
  rot.transpose() // columns -> rows

  const centroid = v(m.centroid)
  const translatedToOrigin = new THREE.Matrix4().makeTranslation(
    -centroid.x, -centroid.y, -centroid.z,
  )
  // When flipUp is on, what was "ceiling" in the manifest is now the floor.
  // Project the new up onto the manifest's two stored offsets accordingly.
  const floorOffset = flipUp ? -m.ceilOffset : m.floorOffset
  const ceilOffset = flipUp ? -m.floorOffset : m.ceilOffset
  const floorLift = new THREE.Matrix4().makeTranslation(0, -floorOffset, 0)

  // Order: subtract centroid → rotate → lift floor.
  const matrix = new THREE.Matrix4()
  matrix.multiplyMatrices(rot, translatedToOrigin)
  matrix.premultiply(floorLift)

  // Suggested camera (manifest is in source coords) → world coords
  const eyeLocal = v(m.suggestedCamera.eye).applyMatrix4(matrix)
  const targetLocal = v(m.suggestedCamera.target).applyMatrix4(matrix)

  // Approximate world radius = 0.5 * diagonal of source bbox
  const min = v(m.bbox.min)
  const max = v(m.bbox.max)
  const diag = max.clone().sub(min).length()
  const worldRadius = diag / 2

  const ceilY = (ceilOffset - floorOffset)
  const horizontalExtent = Math.max(m.extents[0], m.extents[1])

  return { matrix, cameraEye: eyeLocal, cameraTarget: targetLocal, worldRadius, floorY: 0, ceilY, horizontalExtent }
}
