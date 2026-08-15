import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, PresetCollection } from '@/domain/entities/preset'
import { presetCollectionSchema } from '@/domain/schemas/preset'
import type { FileSystemPort } from '@/types/fs-port'

const EMPTY_COLLECTION: PresetCollection = { version: 1, presets: [] }

/** 预设库（~/.aiswitch/presets.json）读写仓库 */
export class PresetRepository {
  constructor(private readonly fs: FileSystemPort) {}

  async load(): Promise<PresetCollection> {
    if (!(await this.fs.exists(PATHS.presetsFile))) {
      return EMPTY_COLLECTION
    }
    const text = await this.fs.readTextFile(PATHS.presetsFile)
    const collection = this.parseCollection(text)
    // 读路径 best-effort：顺手收紧历史版本遗留的 0644 明文密钥文件与目录，失败不阻断加载
    await this.fs.restrictPermissions(PATHS.appDir).catch((error: unknown) => {
      console.warn('收紧 ~/.aiswitch 目录权限失败', error)
    })
    await this.fs.restrictPermissions(PATHS.presetsFile).catch((error: unknown) => {
      console.warn('收紧 presets.json 权限失败', error)
    })
    return collection
  }

  async save(collection: PresetCollection): Promise<void> {
    await this.fs.mkdir(PATHS.appDir)
    await this.fs.restrictPermissions(PATHS.appDir)
    await writeTextAtomic(this.fs, PATHS.presetsFile, `${JSON.stringify(collection, null, 2)}\n`)
  }

  async list(): Promise<Preset[]> {
    return (await this.load()).presets
  }

  private parseCollection(text: string): PresetCollection {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new AppError('E_CONFIG_PARSE', '预设库文件不是合法 JSON', { path: PATHS.presetsFile })
    }
    const result = presetCollectionSchema.safeParse(raw)
    if (!result.success) {
      throw new AppError('E_CONFIG_PARSE', '预设库结构校验失败', { path: PATHS.presetsFile })
    }
    return result.data
  }
}
