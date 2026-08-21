import type { Preset, PresetInput } from '@/domain/entities/preset'

/** 复制预设默认名后缀（PRD US-02：同工具内预设名唯一） */
export const DUPLICATE_NAME_SUFFIX = ' 副本'

/** 已有预设 → 待编辑草稿：剔除 id 与时间戳，modelMetadata 深拷贝（PRD US-02 复制） */
export function presetInputFromPreset(preset: Preset): PresetInput {
  return {
    tool: preset.tool,
    name: `${preset.name}${DUPLICATE_NAME_SUFFIX}`,
    providerName: preset.providerName,
    baseUrl: preset.baseUrl,
    apiKey: preset.apiKey,
    model: preset.model,
    smallFastModel: preset.smallFastModel,
    modelMetadata: preset.modelMetadata ? structuredClone(preset.modelMetadata) : undefined,
  }
}
