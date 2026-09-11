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

function parentOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

/** 递归记录目录及其全部祖先（与生产 mkdir recursive: true 语义一致，重复调用幂等） */
function recordDir(dirs: Set<string>, path: string): void {
  let current = path
  while (current && !dirs.has(current)) {
    dirs.add(current)
    current = parentOf(current)
  }
}

/**
 * 与 Tauri plugin-fs 一致：writeTextFile 不创建父目录，父目录未 mkdir 时抛 ENOENT。
 * 仅 mkdir 或种子文件隐式创建过的目录可写；HOME 根（无父级）始终可写。
 */
function requireParentDir(dirs: Set<string>, path: string): void {
  const parent = parentOf(path)
  if (parent && !dirs.has(parent)) {
    throw new Error(`ENOENT: 父目录未创建: ${parent}（写入 ${path}）`)
  }
}

/** 列出 path 第一层的文件/目录名（去重保序） */
function firstLevelNames(store: Map<string, string>, dirs: Set<string>, path: string): string[] {
  const prefix = `${path}/`
  const names = new Set<string>()
  const collect = (key: string): void => {
    if (!key.startsWith(prefix)) {
      return
    }
    const [first] = key.slice(prefix.length).split('/')
    if (first) {
      names.add(first)
    }
  }
  store.forEach((_, key) => {
    collect(key)
  })
  dirs.forEach(collect)
  return [...names]
}

/** 文件已存在、目录已创建、或目录下有子节点（含 files().set 直接落表的模拟写入） */
function pathExists(store: Map<string, string>, dirs: Set<string>, path: string): boolean {
  if (store.has(path) || dirs.has(path)) {
    return true
  }
  const prefix = `${path}/`
  return [...store.keys()].some((key) => key.startsWith(prefix))
}

/** 种子文件视为既有 fixture：隐式创建其父目录，仅新写入受严格校验 */
function seedParentDirs(store: Map<string, string>, dirs: Set<string>): void {
  for (const key of store.keys()) {
    recordDir(dirs, parentOf(key))
  }
}

/**
 * FileSystemPort 内存替身：路径语义与生产实现一致（相对 HOME 正斜杠）。
 * 忠实于真实 fs 的目录约束：写入/改名目标要求父目录已存在（mkdir 或种子文件隐式创建），
 * 否则抛 ENOENT —— 避免测试放行生产上必失败的「写到不存在的目录」。
 */
export function createMemoryFs(initial: Record<string, string> = {}): MemoryFs {
  const store = new Map<string, string>(Object.entries(initial))
  const dirs = new Set<string>()
  const restrictedPaths: string[] = []
  seedParentDirs(store, dirs)
  return {
    homeDir: () => Promise.resolve(MEMORY_HOME),
    exists: (path) => Promise.resolve(pathExists(store, dirs, path)),
    readTextFile(path) {
      return Promise.resolve(requireFile(store, path))
    },
    writeTextFile(path, contents) {
      // Promise 执行体内抛错 → rejected Promise，与真实 fs 的异步失败一致
      return Promise.resolve().then(() => {
        requireParentDir(dirs, path)
        store.set(path, contents)
      })
    },
    readDir: (path) => Promise.resolve(firstLevelNames(store, dirs, path)),
    mkdir(path) {
      recordDir(dirs, path)
      return Promise.resolve()
    },
    remove(path) {
      store.delete(path)
      dirs.delete(path)
      return Promise.resolve()
    },
    rename(from, to) {
      return Promise.resolve().then(() => {
        const content = requireFile(store, from)
        requireParentDir(dirs, to)
        store.set(to, content)
        store.delete(from)
      })
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
