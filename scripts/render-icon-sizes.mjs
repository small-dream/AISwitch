// 在 tauri icon 之后运行：用渲染器「原生尺寸」重写小尺寸 PNG 与 icon.ico，
// 避免缩放导致的锯齿（每个尺寸独立 8x 超采样渲染，含 ICO 内嵌各层）。
// icon.icns 用 'rounded' 风格原生重建：macOS 不自动裁圆，圆角必须画进图标里。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { encodePng, renderRgba } from './generate-icon.mjs'

const ICONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons')
const SS = 8

function pngSize(file) {
  const buf = readFileSync(file)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function renderPng(size, style = 'square') {
  return encodePng(size, renderRgba(size, SS, style))
}

function rewritePngSizes() {
  const files = ['32x32.png', '64x64.png', '128x128.png', '128x128@2x.png', 'icon.png']
  for (const name of files) {
    const file = join(ICONS_DIR, name)
    const { width, height } = pngSize(file)
    if (width !== height) {
      console.warn(`跳过非正方形 ${name}（${width}x${height}）`)
      continue
    }
    writeFileSync(file, renderPng(width))
    console.log(`native rendered ${name} (${width}x${width})`)
  }
}

/** ICO（PNG 内嵌格式，Vista+ 标准）：16/24/32/48/64/128/256 各原生渲染层 */
function buildIco(sizes) {
  const images = sizes.map((size) => ({ size, png: renderPng(size) }))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size
    entry[1] = size >= 256 ? 0 : size
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bpp
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

rewritePngSizes()
const icoFile = join(ICONS_DIR, 'icon.ico')
writeFileSync(icoFile, buildIco([16, 24, 32, 48, 64, 128, 256]))
console.log('icon.ico rebuilt with natively rendered layers (16-256)')

/** icns：PNG 内嵌格式，对应 iconutil 的 iconset 全档位（1x + @2x），圆角风格 */
function buildIcns() {
  // [类型码, 渲染尺寸] —— @2x 档位直接按物理分辨率原生渲染，无需缩放
  const entries = [
    ['icp4', 16], // icon_16x16
    ['ic11', 32], // icon_16x16@2x
    ['icp5', 32], // icon_32x32
    ['ic12', 64], // icon_32x32@2x
    ['ic07', 128], // icon_128x128
    ['ic13', 256], // icon_128x128@2x
    ['ic08', 256], // icon_256x256
    ['ic14', 512], // icon_256x256@2x
    ['ic09', 512], // icon_512x512
    ['ic10', 1024], // icon_512x512@2x
  ]
  const chunks = entries.map(([type, size]) => {
    const png = renderPng(size, 'rounded')
    const chunk = Buffer.alloc(8 + png.length)
    chunk.write(type, 0, 'ascii')
    chunk.writeUInt32BE(8 + png.length, 4)
    png.copy(chunk, 8)
    return chunk
  })
  const total = chunks.reduce((sum, c) => sum + c.length, 0) + 8
  const header = Buffer.alloc(8)
  header.write('icns', 0, 'ascii')
  header.writeUInt32BE(total, 4)
  return Buffer.concat([header, ...chunks])
}

const icnsFile = join(ICONS_DIR, 'icon.icns')
writeFileSync(icnsFile, buildIcns())
console.log('icon.icns rebuilt with rounded macOS style (16-1024)')
