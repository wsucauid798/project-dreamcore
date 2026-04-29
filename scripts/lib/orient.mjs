// Auto-orientation helpers.
// Given a sample of splat positions, find the up-axis and ground plane
// so the renderer can re-frame the scene as +Y up regardless of source axes.

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

// 3x3 symmetric eigendecomposition via Jacobi rotations.
// Returns { values: [l0,l1,l2] (descending), vectors: [v0,v1,v2] (column = eigvec) }.
function jacobi3(M) {
  const a = [
    [M[0][0], M[0][1], M[0][2]],
    [M[1][0], M[1][1], M[1][2]],
    [M[2][0], M[2][1], M[2][2]],
  ]
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  for (let iter = 0; iter < 64; iter++) {
    let p = 0, q = 1, max = Math.abs(a[0][1])
    if (Math.abs(a[0][2]) > max) { p = 0; q = 2; max = Math.abs(a[0][2]) }
    if (Math.abs(a[1][2]) > max) { p = 1; q = 2; max = Math.abs(a[1][2]) }
    if (max < 1e-12) break
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
    const c = 1 / Math.sqrt(t * t + 1)
    const s = t * c
    const app = a[p][p], aqq = a[q][q], apq = a[p][q]
    a[p][p] = app - t * apq
    a[q][q] = aqq + t * apq
    a[p][q] = a[q][p] = 0
    for (let i = 0; i < 3; i++) {
      if (i !== p && i !== q) {
        const aip = a[i][p], aiq = a[i][q]
        a[i][p] = a[p][i] = c * aip - s * aiq
        a[i][q] = a[q][i] = s * aip + c * aiq
      }
      const vip = v[i][p], viq = v[i][q]
      v[i][p] = c * vip - s * viq
      v[i][q] = s * vip + c * viq
    }
  }
  const evals = [a[0][0], a[1][1], a[2][2]]
  const order = [0, 1, 2].sort((i, j) => evals[j] - evals[i])
  return {
    values: order.map((i) => evals[i]),
    vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]]),
  }
}

/**
 * @param sample - Float32Array of XYZ triples (length = 3*N)
 * @returns {{ up: [x,y,z], centroid: [x,y,z], floorY: number, extents: [w,d,h], bbox: { min, max } }}
 */
export function analyseOrientation(sample) {
  const N = sample.length / 3
  if (N < 8) {
    return {
      up: [0, 1, 0], centroid: [0, 0, 0], floorY: 0,
      extents: [1, 1, 1], bbox: { min: [0, 0, 0], max: [0, 0, 0] },
    }
  }
  // Centroid + bbox
  let mx = 0, my = 0, mz = 0
  let minx = Infinity, miny = Infinity, minz = Infinity
  let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity
  for (let i = 0; i < N; i++) {
    const x = sample[3 * i], y = sample[3 * i + 1], z = sample[3 * i + 2]
    mx += x; my += y; mz += z
    if (x < minx) minx = x; if (x > maxx) maxx = x
    if (y < miny) miny = y; if (y > maxy) maxy = y
    if (z < minz) minz = z; if (z > maxz) maxz = z
  }
  const cx = mx / N, cy = my / N, cz = mz / N
  // Covariance
  let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0
  for (let i = 0; i < N; i++) {
    const dx = sample[3 * i] - cx
    const dy = sample[3 * i + 1] - cy
    const dz = sample[3 * i + 2] - cz
    cxx += dx * dx; cyy += dy * dy; czz += dz * dz
    cxy += dx * dy; cxz += dx * dz; cyz += dy * dz
  }
  const inv = 1 / N
  const C = [
    [cxx * inv, cxy * inv, cxz * inv],
    [cxy * inv, cyy * inv, cyz * inv],
    [cxz * inv, cyz * inv, czz * inv],
  ]
  const { vectors } = jacobi3(C)
  // Smallest-variance eigenvector = "thin" axis (the up direction for floor /
  // exterior scans). PCA gives this direction with arbitrary sign. We cannot
  // reliably disambiguate the sign from the data alone — for 3DGS, gaussian
  // density follows texture detail (lights, vents on the ceiling) not gravity,
  // so density-based heuristics get it wrong half the time. Ship the PCA
  // direction as-is and expose a one-key UI flip the user can hit if a scene
  // comes up inverted.
  const up = norm3(vectors[2])
  // Project all samples onto up to find floor (5th percentile) and ceiling (95th)
  const proj = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const dx = sample[3 * i] - cx
    const dy = sample[3 * i + 1] - cy
    const dz = sample[3 * i + 2] - cz
    proj[i] = dot3([dx, dy, dz], up)
  }
  const sortedProj = Float32Array.from(proj).sort()
  const floorOffset = sortedProj[Math.floor(N * 0.05)]
  const ceilOffset = sortedProj[Math.floor(N * 0.95)]
  // Build a right-handed (right, up, fwd) basis. PCA gives us three orthogonal
  // eigenvectors, but they aren't ordered by handedness — derive `right` from
  // `up × fwd` to guarantee det(R) = +1 (otherwise Matrix4.decompose() will
  // hand us a reflection and the scene renders flipped/behind the camera).
  let fwdRaw = norm3(vectors[0])
  // Project out any up-component so fwd is in the floor plane
  const fwdDotUp = dot3(fwdRaw, up)
  fwdRaw = norm3([
    fwdRaw[0] - up[0] * fwdDotUp,
    fwdRaw[1] - up[1] * fwdDotUp,
    fwdRaw[2] - up[2] * fwdDotUp,
  ])
  const fwd = fwdRaw
  const right = norm3([
    up[1] * fwd[2] - up[2] * fwd[1],
    up[2] * fwd[0] - up[0] * fwd[2],
    up[0] * fwd[1] - up[1] * fwd[0],
  ])
  let minR = Infinity, maxR = -Infinity, minF = Infinity, maxF = -Infinity
  for (let i = 0; i < N; i++) {
    const dx = sample[3 * i] - cx
    const dy = sample[3 * i + 1] - cy
    const dz = sample[3 * i + 2] - cz
    const r = dot3([dx, dy, dz], right)
    const f = dot3([dx, dy, dz], fwd)
    if (r < minR) minR = r; if (r > maxR) maxR = r
    if (f < minF) minF = f; if (f > maxF) maxF = f
  }
  return {
    up,
    right,
    forward: fwd,
    centroid: [cx, cy, cz],
    floorOffset,
    ceilOffset,
    height: ceilOffset - floorOffset,
    extents: [maxR - minR, maxF - minF, ceilOffset - floorOffset],
    bbox: { min: [minx, miny, minz], max: [maxx, maxy, maxz] },
  }
}

/**
 * Suggested camera entry pose: stand at centroid, eye at floor + 1.7m, look forward.
 */
export function suggestEntryPose(orient) {
  const { centroid, up, forward, floorOffset, height, extents } = orient
  const eyeOffset = Math.min(1.7, Math.max(0.4, height * 0.3))
  const eyeY = floorOffset + eyeOffset
  const back = Math.max(extents[0], extents[1]) * 0.35
  // place camera slightly behind the centroid along forward, lifted to eye height
  const eye = [
    centroid[0] - forward[0] * back + up[0] * eyeY,
    centroid[1] - forward[1] * back + up[1] * eyeY,
    centroid[2] - forward[2] * back + up[2] * eyeY,
  ]
  const target = [
    centroid[0] + up[0] * eyeY,
    centroid[1] + up[1] * eyeY,
    centroid[2] + up[2] * eyeY,
  ]
  return { eye, target }
}
