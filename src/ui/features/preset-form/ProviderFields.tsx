import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { PasswordInput } from '@/ui/components/PasswordInput'
import type { PresetFormValues } from './preset-form-schema'

/**
 * 供应商地址与密钥字段：Base URL 留空 = 官方 API。
 * 官方订阅不再走表单（列表里有内建条目），故这里始终可编辑。
 */
export function ProviderFields({
  register,
  errors,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
}) {
  const t = useT()
  return (
    <>
      <FormField label={t('presetForm.baseUrl')} error={errors.baseUrl?.message}>
        <Input {...register('baseUrl')} placeholder="https://open.bigmodel.cn/api/anthropic" />
      </FormField>
      <FormField label="API Key" error={errors.apiKey?.message}>
        <PasswordInput {...register('apiKey')} placeholder="sk-…" />
      </FormField>
    </>
  )
}
