import type { BundleRepository } from '@/adapters/bundles/bundle-repository'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { AppError } from '@/domain/errors'
import type { Bundle, BundleInput } from '@/domain/entities/bundle'
import type { TargetTool } from '@/domain/entities/preset'
import { bundleInputSchema } from '@/domain/schemas/bundle'
import type { SwitchService } from '@/services/switch-service'

export interface BundleSwitchResult {
  tool: TargetTool
  presetId: string
  ok: boolean
  error?: string
}

/** 组合预设用例：CRUD + 引用完整性 + 聚合切换（US-17） */
export class BundleService {
  constructor(
    private readonly repo: BundleRepository,
    private readonly presets: PresetRepository,
    private readonly switches: SwitchService
  ) {}

  list(): Promise<Bundle[]> {
    return this.repo.list()
  }

  async create(input: BundleInput): Promise<Bundle> {
    const validated = this.parseInput(input)
    const bundles = await this.repo.list()
    this.assertNameAvailable(bundles, validated, null)
    await this.assertReferencesValid(validated)
    const now = new Date().toISOString()
    const bundle: Bundle = { ...validated, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await this.repo.save({ version: 1, bundles: [...bundles, bundle] })
    return bundle
  }

  async update(id: string, input: BundleInput): Promise<Bundle> {
    const validated = this.parseInput(input)
    const bundles = await this.repo.list()
    const existing = bundles.find((bundle) => bundle.id === id)
    if (!existing) {
      throw new AppError('E_PRESET_NOT_FOUND', '组合预设不存在', { id })
    }
    this.assertNameAvailable(bundles, validated, id)
    await this.assertReferencesValid(validated)
    const updated: Bundle = {
      ...existing,
      ...validated,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await this.repo.save({ version: 1, bundles: bundles.map((b) => (b.id === id ? updated : b)) })
    return updated
  }

  async remove(id: string): Promise<void> {
    const bundles = await this.repo.list()
    if (!bundles.some((bundle) => bundle.id === id)) {
      throw new AppError('E_PRESET_NOT_FOUND', '组合预设不存在', { id })
    }
    await this.repo.save({ version: 1, bundles: bundles.filter((bundle) => bundle.id !== id) })
  }

  /** 聚合切换：逐工具独立，某工具失败不阻断另一工具（与逐文件容错哲学一致） */
  async switch(bundleId: string): Promise<BundleSwitchResult[]> {
    const bundle = (await this.repo.list()).find((item) => item.id === bundleId)
    if (!bundle) {
      throw new AppError('E_PRESET_NOT_FOUND', '组合预设不存在', { bundleId })
    }
    const targets: { tool: TargetTool; presetId: string }[] = []
    if (bundle.claudePresetId) {
      targets.push({ tool: 'claude-code', presetId: bundle.claudePresetId })
    }
    if (bundle.codexPresetId) {
      targets.push({ tool: 'codex', presetId: bundle.codexPresetId })
    }

    const results: BundleSwitchResult[] = []
    for (const target of targets) {
      try {
        await this.switches.switch(target.tool, target.presetId)
        results.push({ tool: target.tool, presetId: target.presetId, ok: true })
      } catch (error) {
        results.push({
          tool: target.tool,
          presetId: target.presetId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return results
  }

  private assertNameAvailable(
    bundles: readonly Bundle[],
    input: BundleInput,
    excludeId: string | null
  ): void {
    const duplicated = bundles.some(
      (bundle) => bundle.name.toLowerCase() === input.name.toLowerCase() && bundle.id !== excludeId
    )
    if (duplicated) {
      throw new AppError('E_PRESET_DUPLICATE_NAME', '已存在同名组合预设', {
        name: input.name,
      })
    }
  }

  private parseInput(input: BundleInput): BundleInput {
    const parsed = bundleInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new AppError('E_VALIDATION_FAILED', '组合预设至少需要选择一个工具的预设', {
        issues: parsed.error.issues,
      })
    }
    return parsed.data
  }

  private async assertReferencesValid(input: BundleInput): Promise<void> {
    const presets = await this.presets.list()
    const assertPreset = (tool: TargetTool, presetId: string | undefined): void => {
      if (!presetId) {
        return
      }
      const preset = presets.find((item) => item.id === presetId)
      if (!preset) {
        throw new AppError('E_PRESET_NOT_FOUND', '组合引用的预设不存在', {
          presetId,
          tool,
        })
      }
      if (preset.tool !== tool) {
        throw new AppError('E_VALIDATION_FAILED', '组合引用与目标工具不匹配', {
          presetId,
          tool,
        })
      }
    }
    assertPreset('claude-code', input.claudePresetId)
    assertPreset('codex', input.codexPresetId)
  }
}
