// 在 tauri icon 之后运行：用渲染器「原生尺寸」重写小尺寸 PNG 与 icon.ico，
// 避免缩放导致的锯齿（每个尺寸独立 8x 超采样渲染，含 ICO 内嵌各层）。
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

function renderPng(size) {
  return encodePng(size, renderRgba(size, SS))
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
