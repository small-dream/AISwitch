import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { PasswordInput } from '@/ui/components/PasswordInput'
import type { PresetFormValues } from './preset-form-schema'

/**
 * 供应商地址与密钥字段：官方订阅模式下禁用——
 * 写入 Base URL / Key 会顶掉 CLI 的登录态（PRD §5.13）。
 */
export function ProviderFields({
  register,
  errors,
  keyless,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
  keyless: boolean
}) {
  const t = useT()
  return (
    <>
      <FormField label={t('presetForm.baseUrl')} error={errors.baseUrl?.message}>
        <Input
          {...register('baseUrl')}
          disabled={keyless}
          placeholder="https://open.bigmodel.cn/api/anthropic"
        />
      </FormField>
      <FormField label="API Key" error={errors.apiKey?.message}>
        <PasswordInput {...register('apiKey')} disabled={keyless} placeholder="sk-…" />
      </FormField>
    </>
  )
}
