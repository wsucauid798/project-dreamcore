// Minimal binary 3DGS PLY parser.
// Streams the body so we never load multi-GB files into a single Buffer.

import { promises as fs, createReadStream } from 'node:fs'

const TYPE_BYTES = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4,
  float: 4, float32: 4,
  double: 8, float64: 8,
}

const READERS = {
  float: (b, o) => b.readFloatLE(o),
  float32: (b, o) => b.readFloatLE(o),
  double: (b, o) => b.readDoubleLE(o),
  float64: (b, o) => b.readDoubleLE(o),
  int: (b, o) => b.readInt32LE(o),
  int32: (b, o) => b.readInt32LE(o),
  uint: (b, o) => b.readUInt32LE(o),
  uint32: (b, o) => b.readUInt32LE(o),
  short: (b, o) => b.readInt16LE(o),
  int16: (b, o) => b.readInt16LE(o),
  ushort: (b, o) => b.readUInt16LE(o),
  uint16: (b, o) => b.readUInt16LE(o),
  char: (b, o) => b.readInt8(o),
  int8: (b, o) => b.readInt8(o),
  uchar: (b, o) => b.readUInt8(o),
  uint8: (b, o) => b.readUInt8(o),
}

export async function readPlyHeader(filePath) {
  const fd = await fs.open(filePath, 'r')
  try {
    // Header is ASCII; read up to 16KB which is plenty.
    const buf = Buffer.alloc(16384)
    const { bytesRead } = await fd.read(buf, 0, buf.length, 0)
    const text = buf.subarray(0, bytesRead).toString('binary')
    const endTag = 'end_header\n'
    const endIdx = text.indexOf(endTag)
    if (endIdx < 0) throw new Error(`PLY header > 16KB or missing end_header in ${filePath}`)
    const headerBytes = endIdx + endTag.length
    const lines = text.slice(0, endIdx).split('\n').map((l) => l.trim())
    if (lines[0] !== 'ply') throw new Error(`Not a PLY file: ${filePath}`)
    const fmt = lines[1]
    if (!fmt.startsWith('format binary_little_endian')) {
      throw new Error(`Only binary_little_endian PLY supported, got: ${fmt}`)
    }
    const properties = []
    let vertexCount = 0
    let inVertex = false
    for (const line of lines) {
      if (line.startsWith('element ')) {
        const [, name, count] = line.split(/\s+/)
        inVertex = name === 'vertex'
        if (inVertex) vertexCount = Number(count)
      } else if (inVertex && line.startsWith('property ')) {
        const parts = line.split(/\s+/)
        const type = parts[1]
        const name = parts[parts.length - 1]
        if (!TYPE_BYTES[type]) throw new Error(`Unsupported PLY type: ${type}`)
        properties.push({ name, type, size: TYPE_BYTES[type] })
      }
    }
    let stride = 0
    const offsets = {}
    for (const p of properties) {
      offsets[p.name] = stride
      stride += p.size
    }
    const stat = await fd.stat()
    const expectedBodyBytes = stride * vertexCount
    if (stat.size - headerBytes !== expectedBodyBytes) {
      // Don't throw — some files have extra trailing bytes — just warn via return
      // (caller can compute count from file size if mismatched).
    }
    return { vertexCount, properties, offsets, stride, headerBytes, fileBytes: stat.size }
  } finally {
    await fd.close()
  }
}

/**
 * Stream PLY vertex records, calling `onChunk(view, count, baseIndex)` for each chunk.
 * `view` is a DataView positioned over a Buffer holding `count` packed records.
 */
export async function streamPlyBody(filePath, header, onChunk, { chunkVertices = 65536 } = {}) {
  const { stride, headerBytes, vertexCount } = header
  const stream = createReadStream(filePath, {
    start: headerBytes,
    end: headerBytes + stride * vertexCount - 1,
    highWaterMark: stride * chunkVertices,
  })
  let leftover = Buffer.alloc(0)
  let baseIndex = 0
  for await (const chunk of stream) {
    const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk
    const wholeRecords = Math.floor(buf.length / stride)
    if (wholeRecords > 0) {
      const usedBytes = wholeRecords * stride
      const view = new DataView(buf.buffer, buf.byteOffset, usedBytes)
      await onChunk(view, wholeRecords, baseIndex)
      baseIndex += wholeRecords
      leftover = buf.subarray(usedBytes)
    } else {
      leftover = buf
    }
  }
}

export const plyReaders = READERS
