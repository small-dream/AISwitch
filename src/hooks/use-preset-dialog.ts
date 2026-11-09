import { useState } from 'react'

import type { Preset, PresetInput } from '@/domain/entities/preset'
import { presetInputFromPreset } from '@/domain/rules/duplicate-preset'

/** 预设表单弹窗状态：新建 / 编辑 / 导入（US-07）/ 复制 四种打开方式 */
export function usePresetDialog() {
  const [editing, setEditing] = useState<Preset | null>(null)
  const [draft, setDraft] = useState<PresetInput | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [open, setOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setDraft(null)
    setDuplicating(false)
    setOpen(true)
  }

  const openEdit = (preset: Preset) => {
    setEditing(preset)
    setDraft(null)
    setDuplicating(false)
    setOpen(true)
  }

  const openImported = (input: PresetInput) => {
    // 导入是异步的：若用户已经打开了别的弹窗（如新建）并开始填写，不要再覆盖他的表单
    if (open) {
      return
    }
    setEditing(null)
    setDraft(input)
    setDuplicating(false)
    setOpen(true)
  }

  const openDuplicate = (preset: Preset) => {
    setEditing(null)
    setDraft(presetInputFromPreset(preset))
    setDuplicating(true)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
  }

  return {
    editing,
    draft,
    duplicating,
    open,
    openCreate,
    openEdit,
    openImported,
    openDuplicate,
    close,
  }
}
