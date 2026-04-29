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

export function buildSceneFrame(m: SceneManifest): SceneFrame {
  const up = v(m.up).normalize()
  const fwd = v(m.forward).normalize()
  // Make sure forward is orthogonal to up
  fwd.sub(up.clone().multiplyScalar(up.dot(fwd))).normalize()
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize()

  // Orientation rotation: source basis (right, up, fwd) -> three (x, y, -z)
  // Build a matrix whose ROWS are the source basis (since we want to project
  // any source vector onto these axes to express it in world coords).
  const rot = new THREE.Matrix4().makeBasis(right, up, fwd.clone().multiplyScalar(-1))
  rot.transpose() // invert orthonormal basis

  const centroid = v(m.centroid)
  // Translate so centroid maps to origin, then add a y offset so floor is at 0
  const translatedToOrigin = new THREE.Matrix4().makeTranslation(
    -centroid.x, -centroid.y, -centroid.z,
  )
  // After rotation: world y = up·(p - 0) effectively. We want floor at y=0,
  // so move the whole thing up by -m.floorOffset (manifest stores offsets in source frame).
  const floorLift = new THREE.Matrix4().makeTranslation(0, -m.floorOffset, 0)

  // Order: first translate centroid to origin, then rotate into +Y up,
  // then lift so floor sits at y=0.
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

  const ceilY = (m.ceilOffset - m.floorOffset)
  const horizontalExtent = Math.max(m.extents[0], m.extents[1])

  return { matrix, cameraEye: eyeLocal, cameraTarget: targetLocal, worldRadius, floorY: 0, ceilY, horizontalExtent }
}
