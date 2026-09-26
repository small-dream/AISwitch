import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UseFormReturn } from 'react-hook-form'

import { Input } from '@/ui/components/Input'
import type { PresetFormValues } from './preset-form-schema'

type ModelFieldName = 'model' | 'smallFastModel'

interface Anchor {
  top: number
  left: number
  width: number
}

interface ModelComboBoxProps {
  form: UseFormReturn<PresetFormValues>
  name: ModelFieldName
  options: readonly string[]
  placeholder: string
  label: string
  emptyText: string
}

/** 候选过滤：空输入列出全部，否则按子串匹配（大小写无关） */
function filterOptions(options: readonly string[], keyword: string): string[] {
  const needle = keyword.trim().toLowerCase()
  if (needle === '') {
    return [...options]
  }
  return options.filter((option) => option.toLowerCase().includes(needle))
}

function anchorOf(element: HTMLElement | null): Anchor | null {
  if (!element) {
    return null
  }
  const rect = element.getBoundingClientRect()
  return { top: rect.bottom + 4, left: rect.left, width: rect.width }
}

/** 点击外部或按 Esc 收起：弹层渲染到 body，故需挂在 document 上监听 */
function useDismiss(
  open: boolean,
  container: { current: HTMLDivElement | null },
  close: () => void
) {
  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!container.current?.contains(target)) {
        close()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, container, close])
}

const POPUP_CLASS =
  'fixed z-50 max-h-56 overflow-y-auto rounded-lg border border-app-border bg-app-card py-1 shadow-xl'

/** 单条候选：点击即回填并收起 */
function OptionRow({ option, onPick }: { option: string; onPick: (model: string) => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected="false"
      onClick={() => {
        onPick(option)
      }}
      className="block w-full px-3 py-1.5 text-left text-sm text-app hover:bg-app-hover"
    >
      {option}
    </button>
  )
}

/** 弹层：portal + fixed 定位，既不被弹窗滚动区裁切，也不随内容滚动错位。 */
function OptionPopup({
  anchor,
  options,
  emptyText,
  onPick,
}: {
  anchor: Anchor
  options: readonly string[]
  emptyText: string
  onPick: (model: string) => void
}) {
  const style = { top: anchor.top, left: anchor.left, width: anchor.width }
  const list = (
    <ul role="listbox" style={style} className={POPUP_CLASS}>
      {options.map((option) => (
        <li key={option}>
          <OptionRow option={option} onPick={onPick} />
        </li>
      ))}
    </ul>
  )
  const empty = (
    <p role="status" style={style} className={POPUP_CLASS}>
      {emptyText}
    </p>
  )
  return createPortal(options.length > 0 ? list : empty, document.body)
}

/**
 * 模型名输入（US-19）：可自由手填，右侧 ▼ 按钮列出候选并一键回填。
 * 按钮常驻：无候选时弹层说明补齐办法，避免出现「根本没有下拉」的困惑。
 */
export function ModelComboBox({
  form,
  name,
  options,
  placeholder,
  label,
  emptyText,
}: ModelComboBoxProps) {
  const container = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const value = form.watch(name) ?? ''
  const matches = useMemo(() => filterOptions(options, value), [options, value])
  const close = useCallback(() => {
    setAnchor(null)
  }, [])
  const open = anchor !== null

  useDismiss(open, container, close)

  const toggle = () => {
    setAnchor(open ? null : anchorOf(container.current))
  }
  const pick = (model: string) => {
    form.setValue(name, model, { shouldDirty: true })
    close()
  }

  return (
    <div ref={container} className="flex min-w-0 flex-1 items-center gap-2">
      <Input {...form.register(name)} placeholder={placeholder} aria-label={label} />
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-card px-2 text-app transition-colors duration-150 hover:border-app-border-strong hover:bg-app-hover"
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {anchor ? (
        <OptionPopup anchor={anchor} options={matches} emptyText={emptyText} onPick={pick} />
      ) : null}
    </div>
  )
}
