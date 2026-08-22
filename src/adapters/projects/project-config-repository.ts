import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type {
  ProjectConfigRecord,
  ProjectConfigRecordCollection,
} from '@/domain/entities/project-config-record'
import { projectConfigRecordCollectionSchema } from '@/domain/schemas/project-config-record'
import type { TargetTool } from '@/domain/entities/preset'
import type { FileSystemPort } from '@/types/fs-port'

/** 已写入项目配置的索引仓库，保存于 ~/.aiswitch。 */
export class ProjectConfigRepository {
  constructor(private readonly fs: FileSystemPort) {}

  async list(): Promise<ProjectConfigRecord[]> {
    if (!(await this.fs.exists(PATHS.projectConfigsFile))) {
      return []
    }
    const raw = await this.readCollection()
    return raw.records
  }

  async upsert(record: ProjectConfigRecord): Promise<void> {
    const records = await this.list()
    const next = records.filter(
      (item) => item.projectPath !== record.projectPath || item.tool !== record.tool
    )
    await this.save({ version: 1, records: [...next, record] })
  }

  async remove(projectPath: string, tool: TargetTool): Promise<void> {
    const records = await this.list()
    await this.save({
      version: 1,
      records: records.filter((item) => item.projectPath !== projectPath || item.tool !== tool),
    })
  }

  private async readCollection(): Promise<ProjectConfigRecordCollection> {
    const text = await this.fs.readTextFile(PATHS.projectConfigsFile)
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new AppError('E_CONFIG_PARSE', '项目配置记录不是合法 JSON', {
        path: PATHS.projectConfigsFile,
      })
    }
    const parsed = projectConfigRecordCollectionSchema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError('E_CONFIG_PARSE', '项目配置记录结构校验失败', {
        path: PATHS.projectConfigsFile,
      })
    }
    return parsed.data
  }

  private async save(collection: ProjectConfigRecordCollection): Promise<void> {
    await this.fs.mkdir(PATHS.appDir)
    await this.fs.restrictPermissions(PATHS.appDir)
    await writeTextAtomic(this.fs, PATHS.projectConfigsFile, `${JSON.stringify(collection, null, 2)}\n`)
  }
}
