import { readFile } from 'node:fs/promises'

const tag = process.argv[2]
const tagMatch = /^v(\d+\.\d+\.\d+)$/.exec(tag ?? '')

if (!tagMatch) {
  throw new Error('Release tag must match vX.Y.Z')
}

const version = tagMatch[1]
const [packageJson, tauriConfig, changelog] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8'),
])

if (packageJson.version !== version || tauriConfig.version !== version) {
  throw new Error(`Version mismatch: package.json and tauri.conf.json must both be ${version}`)
}

const sectionPattern = new RegExp(
  `^## \\[${version.replaceAll('.', '\\.')}\\].*$(.*?)(?=^## \\[|\\s*$)`,
  'ms'
)
const section = sectionPattern.exec(changelog)?.[0]?.trim()

if (!section) {
  throw new Error(`CHANGELOG.md is missing a section for ${version}`)
}

process.stdout.write(`${section}\n`)
