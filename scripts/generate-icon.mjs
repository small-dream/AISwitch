// 生成应用图标源文件 scripts/app-icon.png（1024x1024 RGBA）
// 运行 npm run icon 会接着调用 tauri icon 产出 src-tauri/icons/ 全套图标
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 1024
const RADIUS = 220
const DOT_RADIUS = 210
const BRAND = [0x63, 0x36, 0xf1] // indigo #6366F1
const WHITE = [0xff, 0xff, 0xff]
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'app-icon.png')

function insideRoundedSquare(x, y) {
  const dx = Math.max(RADIUS - Math.min(x, SIZE - 1 - x), 0)
  const dy = Math.max(RADIUS - Math.min(y, SIZE - 1 - y), 0)
  return dx * dx + dy * dy <= RADIUS * RADIUS
}

function buildRaw() {
  const rowLen = 1 + SIZE * 4
  const raw = Buffer.alloc(SIZE * rowLen)
  const center = SIZE / 2
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * rowLen
    raw[rowStart] = 0 // PNG filter: none
    for (let x = 0; x < SIZE; x++) {
      if (!insideRoundedSquare(x, y)) continue // 透明圆角
      const inDot = (x - center) ** 2 + (y - center) ** 2 <= DOT_RADIUS ** 2
      const [r, g, b] = inDot ? WHITE : BRAND
      const i = rowStart + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = 0xff
    }
  }
  return raw
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(OUT, encodePng(buildRaw()))
console.log(`icon written: ${OUT} (${SIZE}x${SIZE})`)
