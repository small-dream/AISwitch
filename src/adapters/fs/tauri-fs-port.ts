import { homeDir as tauriHomeDir } from '@tauri-apps/api/path'
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename as renameFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import type { FileSystemPort } from '@/types/fs-port'

const HOME = BaseDirectory.Home

/** 生产环境 FileSystemPort 实现：Tauri fs 插件，相对 HOME 解析路径 */
export const tauriFs: FileSystemPort = {
  homeDir() {
    return tauriHomeDir()
  },
  async exists(path) {
    return exists(path, { baseDir: HOME })
  },
  async readTextFile(path) {
    return readTextFile(path, { baseDir: HOME })
  },
  async writeTextFile(path, contents) {
    await writeTextFile(path, contents, { baseDir: HOME })
  },
  async readDir(path) {
    const entries = await readDir(path, { baseDir: HOME })
    return entries.map((entry) => entry.name)
  },
  async mkdir(path) {
    await mkdir(path, { baseDir: HOME, recursive: true })
  },
  async remove(path) {
    await remove(path, { baseDir: HOME })
  },
  async rename(from, to) {
    await renameFile(from, to, { oldPathBaseDir: HOME, newPathBaseDir: HOME })
  },
}
