// Build the per-scene orientation frame: maps manifest up/forward to +Y/+Z
// world axes and lifts the floor to y=0.

import * as THREE from 'three'
import type { SceneManifest, Vec3 } from '../state/store'

const v = (x: Vec3) => new THREE.Vector3(x[0], x[1], x[2])

export type SceneFrame = {
  matrix: THREE.Matrix4
  cameraEye: THREE.Vector3
  cameraTarget: THREE.Vector3
  worldRadius: number
  floorY: 0
  ceilY: number
  horizontalExtent: number
}

export function buildSceneFrame(m: SceneManifest, flipUp = false): SceneFrame {
  // basis
  const up = v(m.up).normalize()
  if (flipUp) up.negate()
  const fwd = v(m.forward).normalize()
  fwd.sub(up.clone().multiplyScalar(up.dot(fwd))).normalize()
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize()

  // rotation: source (right, up, fwd) → world (X, Y, Z)
  const rot = new THREE.Matrix4().makeBasis(right, up, fwd)
  rot.transpose()

  // translation: centroid → origin, then lift floor to y=0
  const centroid = v(m.centroid)
  const translatedToOrigin = new THREE.Matrix4().makeTranslation(
    -centroid.x, -centroid.y, -centroid.z,
  )
  const floorOffset = flipUp ? -m.ceilOffset : m.floorOffset
  const ceilOffset = flipUp ? -m.floorOffset : m.ceilOffset
  const floorLift = new THREE.Matrix4().makeTranslation(0, -floorOffset, 0)

  const matrix = new THREE.Matrix4()
  matrix.multiplyMatrices(rot, translatedToOrigin)
  matrix.premultiply(floorLift)

  // camera entry pose, transformed to world coords
  let eyeLocal = v(m.suggestedCamera.eye).applyMatrix4(matrix)
  let targetLocal = v(m.suggestedCamera.target).applyMatrix4(matrix)

  // bounding sphere radius
  const min = v(m.bbox.min)
  const max = v(m.bbox.max)
  const worldRadius = max.clone().sub(min).length() / 2

  const ceilY = (ceilOffset - floorOffset)
  const horizontalExtent = Math.max(m.extents[0], m.extents[1])

  // outdoor: override with an establishing shot (PCA entry lands inside vegetation)
  if (m.kind === 'lod-blocks') {
    eyeLocal = new THREE.Vector3(0, ceilY * 1.4 + 5, -(horizontalExtent * 0.7))
    targetLocal = new THREE.Vector3(0, ceilY * 0.25, 0)
  }

  return { matrix, cameraEye: eyeLocal, cameraTarget: targetLocal, worldRadius, floorY: 0, ceilY, horizontalExtent }
}
