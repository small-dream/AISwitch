// 应用图标渲染器：品牌靛蓝底 + 白色几何「AI」字形（等宽笔画、无衬线）
// - 直接执行：生成 1024 源图 scripts/app-icon.png（全出血方形，供 Windows/Linux/iOS/Android）
// - 作为模块：导出 renderRgba/encodePng，供 render-icon-sizes.mjs 原生渲染各尺寸
//   renderRgba 支持 'square'（全出血）与 'rounded'（macOS 圆角矩形 + 透明角落）两种风格
// 运行 npm run icon 会接着调用 tauri icon 与 render-icon-sizes 补齐原生小尺寸与 icns
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CANVAS = 1024 // 几何设计坐标系
const BRAND = [0x63, 0x36, 0xf1] // indigo #6366F1
const WHITE = [0xff, 0xff, 0xff]

// ---------- 字形定义（1024 坐标系多边形，偶奇规则：后续多边形为孔） ----------

// 「A」：外三角 - 上孔 - 下孔，笔画水平厚度 88
function buildA() {
  const cx = 413
  const y0 = 300
  const y1 = 724
  const halfW = 182
  const k = halfW / (y1 - y0)
  const s = 88
  const yBarTop = 610
  const yBarBot = 676
  const yApex = y0 + Math.round((s + 14) / k)
  const halfAt = (y) => k * (y - y0) - s

  return [
    [
      [cx - halfW, y1],
      [cx, y0],
      [cx + halfW, y1],
    ],
    [
      [cx, yApex],
      [cx - halfAt(yBarTop), yBarTop],
      [cx + halfAt(yBarTop), yBarTop],
    ],
    [
      [cx - halfAt(yBarBot), yBarBot],
      [cx + halfAt(yBarBot), yBarBot],
      [cx + halfAt(y1), y1],
      [cx - halfAt(y1), y1],
    ],
  ]
}

// 「I」：与 A 同宽（88）的纯竖笔画，无衬线，紧邻 A 时读作大写 I
function buildI() {
  const xL = 695
  const xR = 783
  const y0 = 300
  const y1 = 724
  return [
    [
      [xL, y0],
      [xL, y1],
      [xR, y1],
      [xR, y0],
    ],
  ]
}

const LETTERS = [buildA(), buildI()].map((shapes) => ({
  shapes,
  minX: Math.min(...shapes.flat().map((p) => p[0])) - 1,
  maxX: Math.max(...shapes.flat().map((p) => p[0])) + 1,
  minY: Math.min(...shapes.flat().map((p) => p[1])) - 1,
  maxY: Math.max(...shapes.flat().map((p) => p[1])) + 1,
}))

// ---------- 光栅化 ----------

// macOS 圆角底：Apple 规范几何 —— 1024 画布中央 824×824 圆角矩形，半径 185
const MAC = { half: 412, radius: 185, cx: 512, cy: 512 }

function insideRounded(x, y) {
  const dx = Math.max(Math.abs(x - MAC.cx) - (MAC.half - MAC.radius), 0)
  const dy = Math.max(Math.abs(y - MAC.cy) - (MAC.half - MAC.radius), 0)
  return dx * dx + dy * dy <= MAC.radius * MAC.radius
}

function inside(shapes, x, y) {
  let crossings = 0
  for (const poly of shapes) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]
      const [xj, yj] = poly[j]
      if (yi > y !== yj > y) {
        const xCross = xi + ((y - yi) * (xj - xi)) / (yj - yi)
        if (xCross > x) {
          crossings++
        }
      }
    }
  }
  return crossings % 2 === 1
}

/**
 * 以 size×size、ss×ss 超采样渲染，返回带 PNG 行过滤字节的原始数据
 * style: 'square' 全出血不透明（Windows/Linux/iOS/Android）
 *        'rounded' macOS 圆角底，圆角外为透明像素
 */
export function renderRgba(size, ss = 8, style = 'square') {
  const scale = CANVAS / size
  const rowLen = 1 + size * 4
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      let bgHits = 0
      let hits = 0
      const total = ss * ss
      const gx0 = x * scale
      const gy0 = y * scale
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = gx0 + ((sx + 0.5) / ss) * scale
          const py = gy0 + ((sy + 0.5) / ss) * scale
          const bg = style === 'rounded' ? insideRounded(px, py) : true
          if (!bg) {
            continue
          }
          bgHits++
          for (const letter of LETTERS) {
            if (px < letter.minX || px > letter.maxX || py < letter.minY || py > letter.maxY) {
              continue
            }
            if (inside(letter.shapes, px, py)) {
              hits++
              break
            }
          }
        }
      }
      const letterCov = hits / total
      const bgCov = style === 'rounded' ? bgHits / total : 1
      const i = rowStart + 1 + x * 4
      for (let c = 0; c < 3; c++) {
        raw[i + c] = Math.round(BRAND[c] + (WHITE[c] - BRAND[c]) * letterCov)
      }
      raw[i + 3] = Math.round(bgCov * 255)
    }
  }
  return raw
}

// ---------- PNG 编码 ----------

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

export function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (invokedDirectly) {
  const out = join(dirname(fileURLToPath(import.meta.url)), 'app-icon.png')
  writeFileSync(out, encodePng(CANVAS, renderRgba(CANVAS, 8)))
  console.log(`icon written: ${out} (${CANVAS}x${CANVAS}, full-bleed opaque, 8x supersampled)`)
}
