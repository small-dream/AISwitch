import type { RestoreAction } from '@/services/restore-service'

/** 还原动作 → 预览徽标文案与色调（纯映射，便于单测） */
export const RESTORE_ACTION_LABELS: Record<
  RestoreAction,
  { label: string; tone: 'default' | 'success' | 'warning' }
> = {
  'restore-baseline': { label: '还原为安装前内容', tone: 'success' },
  'restore-earliest-backup': { label: '还原为最早备份（近似）', tone: 'warning' },
  'strip-managed-keys': { label: '清除 AISwitch 写入的键', tone: 'warning' },
  delete: { label: '删除（安装前不存在）', tone: 'default' },
  keep: { label: '跳过', tone: 'default' },
}
