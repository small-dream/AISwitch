import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { AppError } from '@/domain/errors'
import type { Preset, PresetInput } from '@/domain/entities/preset'

/** 预设用例：CRUD 编排 + 唯一性校验（PRD US-02） */
export class PresetService {
  constructor(private readonly repo: PresetRepository) {}

  list(): Promise<Preset[]> {
    return this.repo.list()
  }

  async create(input: PresetInput): Promise<Preset> {
    const presets = await this.repo.list()
    this.assertNameAvailable(presets, input, null)
    const now = new Date().toISOString()
    const preset: Preset = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await this.repo.save({ version: 1, presets: [...presets, preset] })
    return preset
  }

  async update(id: string, input: PresetInput): Promise<Preset> {
    const presets = await this.repo.list()
    const existing = presets.find((preset) => preset.id === id)
    if (!existing) {
      throw new AppError('E_PRESET_NOT_FOUND', '预设不存在', { id })
    }
    this.assertNameAvailable(presets, input, id)
    const updated: Preset = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await this.repo.save({ version: 1, presets: presets.map((p) => (p.id === id ? updated : p)) })
    return updated
  }

  async remove(id: string): Promise<void> {
    const presets = await this.repo.list()
    if (!presets.some((preset) => preset.id === id)) {
      throw new AppError('E_PRESET_NOT_FOUND', '预设不存在', { id })
    }
    await this.repo.save({ version: 1, presets: presets.filter((preset) => preset.id !== id) })
  }

  private assertNameAvailable(
    presets: readonly Preset[],
    input: PresetInput,
    excludeId: string | null
  ): void {
    const duplicated = presets.some(
      (preset) =>
        preset.tool === input.tool &&
        preset.name.toLowerCase() === input.name.toLowerCase() &&
        preset.id !== excludeId
    )
    if (duplicated) {
      throw new AppError('E_PRESET_DUPLICATE_NAME', '同一工具下已存在同名预设', {
        name: input.name,
        tool: input.tool,
      })
    }
  }
}
