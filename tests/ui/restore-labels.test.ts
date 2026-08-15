import { describe, expect, it } from 'vitest'

import type { RestoreAction } from '@/services/restore-service'
import { RESTORE_ACTION_LABELS } from '@/ui/features/restore/restore-labels'

const ALL_ACTIONS: RestoreAction[] = [
  'restore-baseline',
  'restore-earliest-backup',
  'strip-managed-keys',
  'delete',
  'keep',
]

describe('RESTORE_ACTION_LABELS', () => {
  it('每个还原动作都有非空中文标签（UI 预览完备性）', () => {
    for (const action of ALL_ACTIONS) {
      expect(RESTORE_ACTION_LABELS[action].label.length).toBeGreaterThan(0)
    }
    expect(Object.keys(RESTORE_ACTION_LABELS).length).toBe(ALL_ACTIONS.length)
  })

  it('近似动作使用 warning 色调，精确动作用 success 色调', () => {
    expect(RESTORE_ACTION_LABELS['restore-earliest-backup'].tone).toBe('warning')
    expect(RESTORE_ACTION_LABELS['strip-managed-keys'].tone).toBe('warning')
    expect(RESTORE_ACTION_LABELS['restore-baseline'].tone).toBe('success')
  })
})
