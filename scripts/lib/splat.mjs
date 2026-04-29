// 3DGS PLY → standard `.splat` (32 bytes/splat) converter.
//
// .splat layout per record (matches Antimatter15 / mkkellogg gaussian-splats-3d):
//   [0..12)  pos   : float32 x 3
//   [12..24) scale : float32 x 3   (linear; we apply exp() to log-scale fields)
//   [24..28) color : uint8 x 4     (R, G, B, A — sigmoid(opacity) for A,
//                                   0.5 + SH_C0 * f_dc_n  for RGB)
//   [28..32) rot   : uint8 x 4     ((q[i] * 128) + 128, normalized quaternion)

export const SPLAT_RECORD_BYTES = 32
const SH_C0 = 0.28209479177387814

const sigmoid = (x) => 1 / (1 + Math.exp(-x))
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const u8 = (x) => Math.max(0, Math.min(255, Math.round(x)))

/**
 * Encode one 3DGS record into a 32-byte chunk inside `out` at byteOffset.
 * `g` is the gaussian fields read out of the source PLY view.
 */
export function encodeSplat(out, byteOffset, g) {
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength)
  // pos
  dv.setFloat32(byteOffset + 0, g.x, true)
  dv.setFloat32(byteOffset + 4, g.y, true)
  dv.setFloat32(byteOffset + 8, g.z, true)
  // scale (exp on raw log-scale)
  dv.setFloat32(byteOffset + 12, Math.exp(g.s0), true)
  dv.setFloat32(byteOffset + 16, Math.exp(g.s1), true)
  dv.setFloat32(byteOffset + 20, Math.exp(g.s2), true)
  // colour: SH DC term to base RGB
  out[byteOffset + 24] = u8((0.5 + SH_C0 * g.r) * 255)
  out[byteOffset + 25] = u8((0.5 + SH_C0 * g.g) * 255)
  out[byteOffset + 26] = u8((0.5 + SH_C0 * g.b) * 255)
  out[byteOffset + 27] = u8(clamp01(sigmoid(g.opacity)) * 255)
  // rotation: normalize then map to byte
  let qw = g.qw, qx = g.qx, qy = g.qy, qz = g.qz
  const len = Math.hypot(qw, qx, qy, qz) || 1
  qw /= len; qx /= len; qy /= len; qz /= len
  out[byteOffset + 28] = u8(qw * 128 + 128)
  out[byteOffset + 29] = u8(qx * 128 + 128)
  out[byteOffset + 30] = u8(qy * 128 + 128)
  out[byteOffset + 31] = u8(qz * 128 + 128)
}

/**
 * Visual importance heuristic — used for LOD downsampling.
 * Brighter, more opaque, larger-on-screen splats win.
 */
export function importance(g) {
  const a = sigmoid(g.opacity)
  // Surface area proxy from log-scale exp() — capped to prevent runaway sky-splats.
  const sx = Math.min(2, Math.exp(g.s0))
  const sy = Math.min(2, Math.exp(g.s1))
  const sz = Math.min(2, Math.exp(g.s2))
  const area = sx * sy + sy * sz + sx * sz
  const brightness = Math.abs(g.r) + Math.abs(g.g) + Math.abs(g.b)
  return a * (0.6 + 0.4 * brightness) * (0.4 + area)
}
