import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { metadataToFieldText, parseModelMetadataField } from './model-metadata'
import type { PresetFormValues } from './preset-form-schema'

const EMPTY_VALUES: Omit<PresetFormValues, 'tool'> = {
  name: '',
  providerName: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  smallFastModel: '',
  modelMetadataJson: '',
}

/** 编辑取预设本体；导入/复制取草稿；新建取空值，目标工具默认当前 Tab */
export function toFormValues(
  preset: Preset | null,
  draft: PresetInput | null,
  defaultTool: TargetTool
): PresetFormValues {
  const source: PresetInput | null = preset ?? draft
  if (!source) {
    return { ...EMPTY_VALUES, tool: defaultTool }
  }
  return {
    tool: source.tool,
    name: source.name,
    providerName: source.providerName,
    baseUrl: source.baseUrl ?? '',
    apiKey: source.apiKey,
    model: source.model,
    smallFastModel: source.smallFastModel ?? '',
    modelMetadataJson: metadataToFieldText(source.modelMetadata),
  }
}

/** 表单值 → 领域输入：空串归一化为 undefined，smallFastModel 仅 Claude 使用，元数据 JSON 仅 Codex 使用 */
export function toPresetInput(values: PresetFormValues): PresetInput {
  const smallFastModel =
    values.tool === 'claude-code' && values.smallFastModel ? values.smallFastModel : undefined
  const { modelMetadataJson, apiKey, ...rest } = values
  const modelMetadata =
    values.tool === 'codex'
      ? parseModelMetadataField(modelMetadataJson ?? '', values.model).entry
      : undefined
  return {
    ...rest,
    apiKey: apiKey === '' ? undefined : apiKey,
    baseUrl: values.baseUrl === '' ? undefined : values.baseUrl,
    smallFastModel,
    modelMetadata,
  }
}
