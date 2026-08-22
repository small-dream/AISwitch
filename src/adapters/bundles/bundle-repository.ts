import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Bundle, BundleCollection } from '@/domain/entities/bundle'
import { bundleCollectionSchema } from '@/domain/schemas/bundle'
import type { FileSystemPort } from '@/types/fs-port'

const EMPTY_COLLECTION: BundleCollection = { version: 1, bundles: [] }

/** 组合预设库（~/.aiswitch/bundles.json）读写仓库，语义与 PresetRepository 对齐 */
export class BundleRepository {
  constructor(private readonly fs: FileSystemPort) {}

  async load(): Promise<BundleCollection> {
    if (!(await this.fs.exists(PATHS.bundlesFile))) {
      return EMPTY_COLLECTION
    }
    const text = await this.fs.readTextFile(PATHS.bundlesFile)
    const collection = this.parseCollection(text)
    await this.fs.restrictPermissions(PATHS.appDir).catch((error: unknown) => {
      console.warn('收紧 ~/.aiswitch 目录权限失败', error)
    })
    await this.fs.restrictPermissions(PATHS.bundlesFile).catch((error: unknown) => {
      console.warn('收紧 bundles.json 权限失败', error)
    })
    return collection
  }

  async save(collection: BundleCollection): Promise<void> {
    await this.fs.mkdir(PATHS.appDir)
    await this.fs.restrictPermissions(PATHS.appDir)
    await writeTextAtomic(this.fs, PATHS.bundlesFile, `${JSON.stringify(collection, null, 2)}\n`)
  }

  async list(): Promise<Bundle[]> {
    return (await this.load()).bundles
  }

  private parseCollection(text: string): BundleCollection {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new AppError('E_CONFIG_PARSE', '组合预设库文件不是合法 JSON', {
        path: PATHS.bundlesFile,
      })
    }
    const result = bundleCollectionSchema.safeParse(raw)
    if (!result.success) {
      throw new AppError('E_CONFIG_PARSE', '组合预设库结构校验失败', {
        path: PATHS.bundlesFile,
      })
    }
    return result.data
  }
}
