import type { FileSystemPort } from '@/types/fs-port'

export interface MemoryFs extends FileSystemPort {
  /** 暴露内部文件表，供断言使用 */
  files(): Map<string, string>
  /** 记录 restrictPermissions 的调用顺序，供权限收紧断言使用 */
  restricted(): string[]
}

/** 读取文件内容；不存在时抛出与真实 fs 一致的 ENOENT 语义 */
function requireFile(store: Map<string, string>, path: string): string {
  const content = store.get(path)
  if (content === undefined) {
    throw new Error(`ENOENT: ${path}`)
  }
  return content
}

/** 内存替身的固定 HOME 绝对路径（断言 model_catalog_json 等托管绝对路径用） */
export const MEMORY_HOME = 'C:/Users/tester'

/** 列出 store 中 path 第一层的文件/目录名（去重保序） */
function firstLevelNames(store: Map<string, string>, path: string): string[] {
  const prefix = `${path}/`
  const names = new Set<string>()
  for (const key of store.keys()) {
    if (!key.startsWith(prefix)) {
      continue
    }
    const [first] = key.slice(prefix.length).split('/')
    if (first) {
      names.add(first)
    }
  }
  return [...names]
}

/** FileSystemPort 内存替身：路径语义与生产实现一致（相对 HOME 正斜杠） */
export function createMemoryFs(initial: Record<string, string> = {}): MemoryFs {
  const store = new Map<string, string>(Object.entries(initial))
  const restrictedPaths: string[] = []
  return {
    homeDir() {
      return Promise.resolve(MEMORY_HOME)
    },
    exists(path) {
      if (store.has(path)) {
        return Promise.resolve(true)
      }
      const prefix = `${path}/`
      const hasChildren = [...store.keys()].some((key) => key.startsWith(prefix))
      return Promise.resolve(hasChildren)
    },
    readTextFile(path) {
      return Promise.resolve(requireFile(store, path))
    },
    writeTextFile(path, contents) {
      store.set(path, contents)
      return Promise.resolve()
    },
    readDir(path) {
      return Promise.resolve(firstLevelNames(store, path))
    },
    mkdir() {
      return Promise.resolve()
    },
    remove(path) {
      store.delete(path)
      return Promise.resolve()
    },
    rename(from, to) {
      const content = requireFile(store, from)
      store.set(to, content)
      store.delete(from)
      return Promise.resolve()
    },
    restrictPermissions(path) {
      restrictedPaths.push(path)
      return Promise.resolve()
    },
    files() {
      return store
    },
    restricted() {
      return restrictedPaths
    },
  }
}
