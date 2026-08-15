import type { TranslationKey } from '@/i18n/index'
import type { RestoreAction } from '@/services/restore-service'

/** 还原动作 → 预览徽标词条与色调（纯映射，便于单测） */
export const RESTORE_ACTION_LABELS: Record<
  RestoreAction,
  { key: TranslationKey; tone: 'default' | 'success' | 'warning' }
> = {
  'restore-baseline': { key: 'restore.action.restoreBaseline', tone: 'success' },
  'restore-earliest-backup': { key: 'restore.action.restoreEarliestBackup', tone: 'warning' },
  'strip-managed-keys': { key: 'restore.action.stripManagedKeys', tone: 'warning' },
  delete: { key: 'restore.action.delete', tone: 'default' },
  keep: { key: 'restore.action.keep', tone: 'default' },
}
