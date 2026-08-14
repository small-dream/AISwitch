import { AppError } from '@/domain/errors'
import type { PresetInput, TargetTool } from '@/domain/entities/preset'
import { claudePresetInputFrom, codexPresetInputFrom } from '@/domain/rules/import-preset'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig } from '@/domain/schemas/codex-config'

/** 导入数据源（由组合根注入具体适配器读取函数，保持依赖倒置） */
export interface ImportSources {
  readClaude(): Promise<ClaudeSettings | null>
  readCodexConfig(): Promise<CodexConfig | null>
  readCodexAuth(): Promise<unknown>
  readCodexModels(): Promise<unknown>
}

/** 从本机现有配置导入生成预设草稿（PRD US-07） */
export class ImportService {
  constructor(private readonly sources: ImportSources) {}

  async importFrom(tool: TargetTool): Promise<PresetInput> {
    const input = tool === 'claude-code' ? await this.importClaude() : await this.importCodex()
    if (!input) {
      throw new AppError('E_VALIDATION_FAILED', '未检测到可导入的配置（无已知字段）', { tool })
    }
    return input
  }

  private async importClaude(): Promise<PresetInput | null> {
    const settings = await this.sources.readClaude()
    return settings ? claudePresetInputFrom(settings) : null
  }

  private async importCodex(): Promise<PresetInput | null> {
    const config = await this.sources.readCodexConfig()
    if (!config) {
      return null
    }
    const auth = await this.sources.readCodexAuth()
    const modelsCatalog = await this.sources.readCodexModels()
    return codexPresetInputFrom(config, auth, modelsCatalog)
  }
}
