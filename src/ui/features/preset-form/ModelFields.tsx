import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FieldErrors, UseFormReturn } from 'react-hook-form'

import type { TargetTool } from '@/domain/entities/preset'
import { mergeModelOptions, templateModelOptions } from '@/domain/rules/model-options'
import { useModelCatalog } from '@/hooks/use-model-catalog'
import { useT, type TFn } from '@/i18n/index'
import { Button } from '@/ui/components/Button'
import { FormField } from '@/ui/components/FormField'
import { errorMessage } from '@/utils/error-message'
import { ModelComboBox } from './ModelComboBox'
import type { PresetFormValues } from './preset-form-schema'

interface ModelFeedback {
  kind: 'ok' | 'error'
  text: string
}

/** 表单字段可能为空串/未注册，统一按「未填写」语义交给下游（避免把空串当有效地址） */
function optional(value: string | undefined): string | undefined {
  return value === '' ? undefined : value
}

/** 候选模型 = 模板推荐（离线，按 baseUrl 反查）+ 本次拉取的供应商目录 */
function useModelCandidates(tool: TargetTool, form: UseFormReturn<PresetFormValues>, t: TFn) {
  const [fetched, setFetched] = useState<readonly string[]>([])
  const [feedback, setFeedback] = useState<ModelFeedback | null>(null)
  const catalog = useModelCatalog()
  const baseUrl = form.watch('baseUrl')
  const apiKey = form.watch('apiKey')
  const options = useMemo(
    () => mergeModelOptions(templateModelOptions(tool, baseUrl), fetched),
    [tool, baseUrl, fetched]
  )

  const load = async () => {
    try {
      const result = await catalog.list({
        tool,
        baseUrl: optional(baseUrl),
        apiKey: optional(apiKey),
      })
      if (result.status === 'error') {
        setFeedback({ kind: 'error', text: result.message })
        return
      }
      setFetched(result.models)
      setFeedback(
        result.models.length > 0
          ? {
              kind: 'ok',
              text: t('presetForm.modelFetched', { count: String(result.models.length) }),
            }
          : { kind: 'error', text: t('presetForm.modelFetchEmpty') }
      )
    } catch (error) {
      setFeedback({ kind: 'error', text: errorMessage(error) })
    }
  }

  return { options, feedback, load, pending: catalog.pending }
}

function FetchModelsButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  const t = useT()
  const label = t(pending ? 'presetForm.modelFetching' : 'presetForm.modelFetch')
  return (
    <Button
      variant="secondary"
      className="shrink-0"
      disabled={pending}
      onClick={onClick}
      title={label}
    >
      <RefreshCw className={pending ? 'animate-spin' : undefined} aria-hidden />
      {label}
    </Button>
  )
}

/** 内联反馈：成功灰字、失败红字；无反馈时展示用法提示 */
function ModelHint({ feedback, fallback }: { feedback: ModelFeedback | null; fallback: string }) {
  if (!feedback) {
    return <p className="text-xs text-app-muted">{fallback}</p>
  }
  const tone = feedback.kind === 'ok' ? 'text-app-muted' : 'text-app-danger-text'
  return <p className={`text-xs ${tone}`}>{feedback.text}</p>
}

/**
 * 模型名字段（US-19）：带候选下拉按钮的输入框，既能点选也能手填；
 * 「获取模型」按当前 Base URL + Key 拉取供应商目录，失败仅提示，不阻断表单。
 */
export function ModelFields({
  form,
  errors,
  tool,
}: {
  form: UseFormReturn<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
  tool: TargetTool
}) {
  const t = useT()
  const { options, feedback, load, pending } = useModelCandidates(tool, form, t)
  const hint = t(tool === 'codex' ? 'presetForm.modelHintCodex' : 'presetForm.modelHint')

  return (
    <>
      <FormField label={t('presetForm.model')} error={errors.model?.message}>
        <div className="flex items-center gap-2">
          <ModelComboBox
            form={form}
            name="model"
            options={options}
            placeholder={t('presetForm.modelPlaceholder')}
            label={t('presetForm.model')}
            emptyText={t('presetForm.modelNoCandidates')}
          />
          <FetchModelsButton
            pending={pending}
            onClick={() => {
              void load()
            }}
          />
        </div>
        <ModelHint feedback={feedback} fallback={hint} />
      </FormField>
      {tool === 'claude-code' ? (
        <FormField label={t('presetForm.smallFast')} error={errors.smallFastModel?.message}>
          <ModelComboBox
            form={form}
            name="smallFastModel"
            options={options}
            placeholder={t('presetForm.smallFastPlaceholder')}
            label={t('presetForm.smallFast')}
            emptyText={t('presetForm.modelNoCandidates')}
          />
        </FormField>
      ) : null}
    </>
  )
}
