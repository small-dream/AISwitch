import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { AUTH_MODES } from '@/constants/auth-modes'
import type { AuthMode } from '@/domain/entities/preset'
import { useT, type TranslationKey } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Select } from '@/ui/components/Select'
import type { PresetFormValues } from './preset-form-schema'

const AUTH_MODE_LABEL_KEY = {
  'api-key': 'presetForm.authModeApiKey',
  subscription: 'presetForm.authModeSubscription',
} as const satisfies Record<AuthMode, TranslationKey>

/** 认证方式字段：官方订阅模式不写任何密钥，切换后由 CLI 自带登录态鉴权（PRD §5.13） */
export function AuthModeField({
  register,
  errors,
  authMode,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
  authMode: AuthMode
}) {
  const t = useT()
  const label = t('presetForm.authMode')
  return (
    <>
      <FormField label={label} error={errors.authMode?.message}>
        <Select {...register('authMode')} aria-label={label}>
          {AUTH_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(AUTH_MODE_LABEL_KEY[mode])}
            </option>
          ))}
        </Select>
      </FormField>
      {authMode === 'subscription' ? (
        <p className="rounded-md border border-app-border bg-app-sunken px-3 py-2 text-xs text-app-muted">
          {t('presetForm.subscriptionHint')}
        </p>
      ) : null}
    </>
  )
}
