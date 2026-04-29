#!/usr/bin/env node
/**
 * Project Dreamcore — scene converter.
 *
 * Reads 3DGS .ply files from src/assets/scenes/ and writes web-optimised
 * .splat binaries plus a manifest.json into public/assets/scenes/.
 *
 * Usage:
 *   node scripts/convert-scenes.mjs                    # convert everything new
 *   node scripts/convert-scenes.mjs --force            # rebuild even if up-to-date
 *   node scripts/convert-scenes.mjs --only library     # convert one scene
 *   node scripts/convert-scenes.mjs --max-mb 30        # cap LOD0 size (decimate harder)
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { readPlyHeader, streamPlyBody, plyReaders } from './lib/ply.mjs'
import { encodeSplat, importance, SPLAT_RECORD_BYTES } from './lib/splat.mjs'
import { analyseOrientation, suggestEntryPose } from './lib/orient.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}
const FORCE = argv.includes('--force')
const DRY_RUN = argv.includes('--dry-run')
const ONLY = flag('--only')
const INPUT_ROOT = path.resolve(flag('--input') ?? path.join(ROOT, 'src', 'assets', 'scenes'))
const OUTPUT_ROOT = path.resolve(flag('--output') ?? path.join(ROOT, 'public', 'assets', 'scenes'))
const MAX_MB = (() => {
  const v = flag('--max-mb')
  return v ? Number(v) : 28
})()

// LOD ladder for single-block scenes: keep every Nth splat (importance-sorted).
const SINGLE_LODS = [
  { id: 'lod0', keep: 1.0 },
  { id: 'lod1', keep: 0.45 },
  { id: 'lod2', keep: 0.18 },
  { id: 'lod3', keep: 0.07 },
]

// ---------------------------------------------------------------------------
// Helpers

const log = (...args) => console.log('[convert]', ...args)
const warn = (...args) => console.warn('[convert]', ...args)

async function pathExists(p) { try { await fs.stat(p); return true } catch { return false } }

async function listScenes() {
  const entries = await fs.readdir(INPUT_ROOT, { withFileTypes: true })
  const scenes = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.ply')) {
      // Single-PLY scene
      const id = entry.name.replace(/\.ply$/i, '')
      scenes.push({ id, kind: 'single', plyPath: path.join(INPUT_ROOT, entry.name) })
    } else if (entry.isDirectory()) {
      // Multi-block (LOD-pyramid) scene: dir/Block***/LOD*/point_cloud.ply
      const sub = await fs.readdir(path.join(INPUT_ROOT, entry.name), { withFileTypes: true })
      const blocks = sub.filter((s) => s.isDirectory() && /^Block\d+/i.test(s.name))
      if (blocks.length > 0) {
        scenes.push({
          id: entry.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          displayId: entry.name,
          kind: 'lod-blocks',
          dir: path.join(INPUT_ROOT, entry.name),
          blocks: blocks.map((b) => b.name).sort(),
        })
      }
    }
  }
  if (ONLY) return scenes.filter((s) => s.id === ONLY || s.displayId === ONLY)
  return scenes
}

/**
 * Read all gaussian records from a PLY into typed arrays.
 * For very large PLYs we never materialise more than the running buffers.
 *
 * Returns:
 *   positions: Float32Array of length 3*N
 *   importance: Float32Array of length N
 *   stride/scratch fields are NOT retained — caller re-reads to write splats.
 *
 * (We do two passes: pass 1 = positions + importance for sampling; pass 2 =
 * re-read & encode the chosen indices to .splat. This keeps peak memory low.)
 */
async function pass1ReadPositionsAndImportance(filePath, header) {
  const N = header.vertexCount
  const positions = new Float32Array(N * 3)
  const imp = new Float32Array(N)
  const off = header.offsets
  const required = ['x', 'y', 'z', 'f_dc_0', 'f_dc_1', 'f_dc_2', 'opacity', 'scale_0', 'scale_1', 'scale_2']
  for (const k of required) {
    if (off[k] === undefined) throw new Error(`PLY ${filePath} missing required field: ${k}`)
  }
  const r = plyReaders
  const tx = header.properties.find((p) => p.name === 'x').type
  const stride = header.stride

  await streamPlyBody(filePath, header, async (view, count, base) => {
    const buf = Buffer.from(view.buffer, view.byteOffset, view.byteLength)
    for (let i = 0; i < count; i++) {
      const o = i * stride
      const x = r[tx](buf, o + off.x)
      const y = r[tx](buf, o + off.y)
      const z = r[tx](buf, o + off.z)
      positions[3 * (base + i)] = x
      positions[3 * (base + i) + 1] = y
      positions[3 * (base + i) + 2] = z
      const g = {
        x, y, z,
        r: r[tx](buf, o + off.f_dc_0),
        g: r[tx](buf, o + off.f_dc_1),
        b: r[tx](buf, o + off.f_dc_2),
        opacity: r[tx](buf, o + off.opacity),
        s0: r[tx](buf, o + off.scale_0),
        s1: r[tx](buf, o + off.scale_1),
        s2: r[tx](buf, o + off.scale_2),
      }
      imp[base + i] = importance(g)
    }
  })
  return { positions, importance: imp }
}

/**
 * Pass 2: re-read PLY, encode chosen indices to .splat output.
 * `keepSet` is a Uint8Array of length N (1 = keep). `outBuf` is pre-sized.
 */
async function pass2EncodeSelected(filePath, header, keepSet, outBuf) {
  const off = header.offsets
  const r = plyReaders
  const tx = header.properties.find((p) => p.name === 'x').type
  const stride = header.stride
  let writeIdx = 0
  await streamPlyBody(filePath, header, async (view, count, base) => {
    const buf = Buffer.from(view.buffer, view.byteOffset, view.byteLength)
    for (let i = 0; i < count; i++) {
      const idx = base + i
      if (!keepSet[idx]) continue
      const o = i * stride
      const g = {
        x: r[tx](buf, o + off.x),
        y: r[tx](buf, o + off.y),
        z: r[tx](buf, o + off.z),
        r: r[tx](buf, o + off.f_dc_0),
        g: r[tx](buf, o + off.f_dc_1),
        b: r[tx](buf, o + off.f_dc_2),
        opacity: r[tx](buf, o + off.opacity),
        s0: r[tx](buf, o + off.scale_0),
        s1: r[tx](buf, o + off.scale_1),
        s2: r[tx](buf, o + off.scale_2),
        qw: r[tx](buf, o + off.rot_0),
        qx: r[tx](buf, o + off.rot_1),
        qy: r[tx](buf, o + off.rot_2),
        qz: r[tx](buf, o + off.rot_3),
      }
      encodeSplat(outBuf, writeIdx * SPLAT_RECORD_BYTES, g)
      writeIdx++
    }
  })
  return writeIdx
}

/**
 * Top-K importance sampling. Returns Uint8Array(N) flag array with exactly K ones.
 * O(N log K) via a min-heap.
 */
function pickTopByImportance(impArr, K) {
  const N = impArr.length
  const flag = new Uint8Array(N)
  if (K >= N) { flag.fill(1); return { flag, kept: N } }
  // Mini binary min-heap of [value, index]
  const heap = new Float64Array(K)
  const idx = new Int32Array(K)
  let size = 0
  const swap = (i, j) => {
    const tv = heap[i]; heap[i] = heap[j]; heap[j] = tv
    const ti = idx[i]; idx[i] = idx[j]; idx[j] = ti
  }
  const siftUp = (i) => {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p] <= heap[i]) break
      swap(p, i); i = p
    }
  }
  const siftDown = (i) => {
    while (true) {
      const l = i * 2 + 1, r = l + 1; let m = i
      if (l < size && heap[l] < heap[m]) m = l
      if (r < size && heap[r] < heap[m]) m = r
      if (m === i) break
      swap(i, m); i = m
    }
  }
  for (let i = 0; i < N; i++) {
    const v = impArr[i]
    if (size < K) {
      heap[size] = v; idx[size] = i; size++
      siftUp(size - 1)
    } else if (v > heap[0]) {
      heap[0] = v; idx[0] = i
      siftDown(0)
    }
  }
  for (let i = 0; i < size; i++) flag[idx[i]] = 1
  return { flag, kept: size }
}

// Importance-stratified sample of N indices for orientation analysis.
function sampleIndices(N, count) {
  const k = Math.min(count, N)
  const out = new Int32Array(k)
  // Reservoir-free: deterministic stride
  const step = N / k
  for (let i = 0; i < k; i++) out[i] = Math.floor(i * step)
  return out
}

function gatherSamplePositions(positions, indices) {
  const sample = new Float32Array(indices.length * 3)
  for (let i = 0; i < indices.length; i++) {
    const j = indices[i]
    sample[3 * i] = positions[3 * j]
    sample[3 * i + 1] = positions[3 * j + 1]
    sample[3 * i + 2] = positions[3 * j + 2]
  }
  return sample
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }) }

async function isUpToDate(srcPath, outDir) {
  if (FORCE) return false
  const manifestPath = path.join(outDir, 'manifest.json')
  if (!(await pathExists(manifestPath))) return false
  try {
    const [src, manifest] = await Promise.all([fs.stat(srcPath), fs.stat(manifestPath)])
    return manifest.mtimeMs >= src.mtimeMs
  } catch { return false }
}

// ---------------------------------------------------------------------------
// Per-kind conversion

async function convertSingle(scene) {
  const outDir = path.join(OUTPUT_ROOT, scene.id)
  if (await isUpToDate(scene.plyPath, outDir)) {
    log(`✓ ${scene.id} (up to date)`)
    return readJson(path.join(outDir, 'manifest.json'))
  }
  await ensureDir(outDir)
  log(`→ ${scene.id} : reading PLY header`)
  const header = await readPlyHeader(scene.plyPath)
  const N = header.vertexCount
  log(`  vertex count = ${N.toLocaleString()}`)

  log(`  pass 1/2: positions + importance`)
  const t1 = Date.now()
  const { positions, importance: imp } = await pass1ReadPositionsAndImportance(scene.plyPath, header)
  log(`  pass 1 done in ${(Date.now() - t1)}ms`)

  // Orientation
  const sIdx = sampleIndices(N, 50000)
  const sample = gatherSamplePositions(positions, sIdx)
  const orient = analyseOrientation(sample)
  const entry = suggestEntryPose(orient)

  // Determine LOD0 cap based on MAX_MB
  const maxLod0Records = Math.floor((MAX_MB * 1024 * 1024) / SPLAT_RECORD_BYTES)
  const lodOutputs = []
  for (const lod of SINGLE_LODS) {
    const capByKeep = Math.floor(N * lod.keep)
    const target = lod.id === 'lod0' ? Math.min(capByKeep, maxLod0Records) : capByKeep
    const K = Math.max(1, target)
    log(`  ${lod.id}: targeting ${K.toLocaleString()} splats (${(K * SPLAT_RECORD_BYTES / 1024 / 1024).toFixed(1)} MB)`)
    const { flag, kept } = pickTopByImportance(imp, K)
    const outBuf = new Uint8Array(kept * SPLAT_RECORD_BYTES)
    const written = await pass2EncodeSelected(scene.plyPath, header, flag, outBuf)
    if (written !== kept) warn(`  expected ${kept}, wrote ${written}`)
    const outFile = path.join(outDir, `${lod.id}.splat`)
    await fs.writeFile(outFile, outBuf)
    lodOutputs.push({ id: lod.id, file: `${lod.id}.splat`, count: written, bytes: outBuf.length })
  }

  const manifest = {
    id: scene.id,
    displayName: prettyName(scene.id),
    kind: 'single',
    sourceVertexCount: N,
    bbox: orient.bbox,
    centroid: orient.centroid,
    up: orient.up,
    right: orient.right,
    forward: orient.forward,
    floorOffset: orient.floorOffset,
    ceilOffset: orient.ceilOffset,
    height: orient.height,
    extents: orient.extents,
    suggestedCamera: entry,
    lods: lodOutputs,
    builtAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  log(`✓ ${scene.id} : wrote ${lodOutputs.length} LODs`)
  return manifest
}

async function convertLodBlocks(scene) {
  // Pre-existing LOD pyramid (e.g. External_3dgs_ply/Block000/LOD3/point_cloud.ply).
  // Only ship the smaller LODs to web — LOD0/1 are hundreds of MB.
  const outDir = path.join(OUTPUT_ROOT, scene.id)
  await ensureDir(outDir)
  const SHIP_LODS = ['LOD3', 'LOD4', 'LOD5'] // ship-side names
  const blockManifests = []
  // Aggregate orientation from a sample across all blocks at LOD4
  let aggSample = []
  const totals = { byLod: {} }
  for (const blockName of scene.blocks) {
    const bDir = path.join(scene.dir, blockName)
    const blockOut = path.join(outDir, blockName)
    await ensureDir(blockOut)
    const bManifest = { id: blockName, lods: [] }
    for (const lodName of SHIP_LODS) {
      const ply = path.join(bDir, lodName, 'point_cloud.ply')
      if (!(await pathExists(ply))) { warn(`  missing ${ply}`); continue }
      const outFile = path.join(blockOut, `${lodName.toLowerCase()}.splat`)
      if (!FORCE && await pathExists(outFile)) {
        const stat = await fs.stat(outFile)
        bManifest.lods.push({ id: lodName.toLowerCase(), file: `${blockName}/${lodName.toLowerCase()}.splat`, bytes: stat.size, count: stat.size / SPLAT_RECORD_BYTES })
        continue
      }
      log(`→ ${scene.id}/${blockName}/${lodName}: reading header`)
      const header = await readPlyHeader(ply)
      log(`  vertex count = ${header.vertexCount.toLocaleString()}`)
      const { positions, importance: imp } = await pass1ReadPositionsAndImportance(ply, header)
      const flag = new Uint8Array(header.vertexCount).fill(1) // ship them all (already LOD-decimated)
      const outBuf = new Uint8Array(header.vertexCount * SPLAT_RECORD_BYTES)
      const written = await pass2EncodeSelected(ply, header, flag, outBuf)
      await fs.writeFile(outFile, outBuf.subarray(0, written * SPLAT_RECORD_BYTES))
      bManifest.lods.push({ id: lodName.toLowerCase(), file: `${blockName}/${lodName.toLowerCase()}.splat`, bytes: written * SPLAT_RECORD_BYTES, count: written })
      log(`  wrote ${(written * SPLAT_RECORD_BYTES / 1024 / 1024).toFixed(1)} MB`)
      // Use mid-LOD samples for global orientation
      if (lodName === 'LOD4' && aggSample.length < 200000) {
        const ind = sampleIndices(header.vertexCount, 30000)
        const samp = gatherSamplePositions(positions, ind)
        for (let i = 0; i < samp.length; i++) aggSample.push(samp[i])
      }
      totals.byLod[lodName.toLowerCase()] = (totals.byLod[lodName.toLowerCase()] || 0) + written
    }
    blockManifests.push(bManifest)
  }
  const sample = Float32Array.from(aggSample)
  const orient = aggSample.length >= 24 ? analyseOrientation(sample) : {
    up: [0, 1, 0], centroid: [0, 0, 0], floorOffset: 0, ceilOffset: 1,
    height: 1, extents: [10, 10, 3],
    bbox: { min: [-5, -5, 0], max: [5, 5, 1] },
    right: [1, 0, 0], forward: [0, 0, 1],
  }
  const entry = suggestEntryPose(orient)
  const manifest = {
    id: scene.id,
    displayName: prettyName(scene.id),
    kind: 'lod-blocks',
    blocks: blockManifests,
    bbox: orient.bbox,
    centroid: orient.centroid,
    up: orient.up,
    right: orient.right,
    forward: orient.forward,
    floorOffset: orient.floorOffset,
    ceilOffset: orient.ceilOffset,
    height: orient.height,
    extents: orient.extents,
    suggestedCamera: entry,
    builtAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  log(`✓ ${scene.id} (lod-blocks): ${blockManifests.length} blocks`)
  return manifest
}

function prettyName(id) {
  // 1floor → 1st floor, library → Library, external_3dgs_ply → External
  if (/^(\d)floor$/i.test(id)) {
    const n = id[0]
    const ord = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][Number(n)] || `${n}th`
    return `${ord} floor`
  }
  if (id.toLowerCase().startsWith('external')) return 'External campus'
  return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'))
}

// ---------------------------------------------------------------------------
// Entry

async function main() {
  if (!(await pathExists(INPUT_ROOT))) {
    console.error(`Input directory not found: ${INPUT_ROOT}`)
    console.error('Place .ply files under src/assets/scenes/ and re-run.')
    process.exit(1)
  }
  await ensureDir(OUTPUT_ROOT)
  const scenes = await listScenes()
  if (scenes.length === 0) {
    console.error('No scenes found.')
    process.exit(1)
  }
  log(`found ${scenes.length} scene(s): ${scenes.map((s) => s.id).join(', ')}`)
  if (DRY_RUN) {
    for (const scene of scenes) {
      if (scene.kind === 'single') {
        const h = await readPlyHeader(scene.plyPath)
        const props = h.properties.map((p) => p.name).join(',')
        log(`  ${scene.id}: ${h.vertexCount.toLocaleString()} verts, stride=${h.stride}, props=${props}`)
      } else {
        log(`  ${scene.id}: ${scene.blocks.length} blocks (${scene.blocks.join(',')})`)
      }
    }
    return
  }
  const manifests = []
  for (const scene of scenes) {
    try {
      const m = scene.kind === 'single' ? await convertSingle(scene) : await convertLodBlocks(scene)
      manifests.push({
        id: m.id,
        displayName: m.displayName,
        kind: m.kind,
        path: `assets/scenes/${m.id}/manifest.json`,
      })
    } catch (e) {
      console.error(`✗ ${scene.id}: ${e.message}`)
      console.error(e.stack)
    }
  }
  const indexPath = path.join(OUTPUT_ROOT, 'index.json')
  await fs.writeFile(indexPath, JSON.stringify({
    builtAt: new Date().toISOString(),
    scenes: manifests,
  }, null, 2))
  log(`wrote ${indexPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
