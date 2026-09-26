import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UseFormReturn } from 'react-hook-form'

import { Input } from '@/ui/components/Input'
import type { PresetFormValues } from './preset-form-schema'

type ModelFieldName = 'model' | 'smallFastModel'

/** 弹层高度上限（对应 max-h-56）、与字段的间距、与窗口边缘的安全边距 */
const POPUP_MAX_HEIGHT = 224
const POPUP_GAP = 4
const VIEWPORT_MARGIN = 8

/** 弹层内联定位：left / width 对齐字段，垂直方向 top 与 bottom 二选一 */
interface PopupStyle {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

/** 「点在外面」判定用的元素引用（输入框容器与 portal 弹层都要算内部） */
interface ElementRef<T extends HTMLElement> {
  current: T | null
}

interface ModelComboBoxProps {
  form: UseFormReturn<PresetFormValues>
  name: ModelFieldName
  options: readonly string[]
  placeholder: string
  label: string
  emptyText: string
}

/**
 * 候选过滤：空输入列出全部；输入与某个候选完全一致（= 刚从列表里选中）同样列出全部，
 * 否则按子串匹配。缺了「完全一致」这条，选中后再打开就只剩命中项，像是「列表出不来了」。
 */
function filterOptions(options: readonly string[], keyword: string): string[] {
  const needle = keyword.trim().toLowerCase()
  if (needle === '' || options.some((option) => option.toLowerCase() === needle)) {
    return [...options]
  }
  return options.filter((option) => option.toLowerCase().includes(needle))
}

/**
 * 弹层定位：默认向下展开；下方空间不够就翻到上方，并按住得下的一侧限制高度。
 * 若固定向下且不限高，靠近窗口底部的字段会把弹层尾段推出可视区（「最后一个显示不全」），
 * 更靠下时整块都看不见。
 */
function popupStyle(element: HTMLElement | null): PopupStyle | null {
  if (!element) {
    return null
  }
  const rect = element.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom - POPUP_GAP - VIEWPORT_MARGIN
  const above = rect.top - POPUP_GAP - VIEWPORT_MARGIN
  const maxHeight = Math.max(Math.min(POPUP_MAX_HEIGHT, Math.max(below, above)), 0)
  const horizontal = { left: rect.left, width: rect.width, maxHeight }
  if (below >= above) {
    return { ...horizontal, top: rect.bottom + POPUP_GAP }
  }
  return { ...horizontal, bottom: window.innerHeight - rect.top + POPUP_GAP }
}

/**
 * 点击外部或按 Esc 收起。弹层经 portal 渲染到 body，不在输入框容器内，
 * 因此必须把弹层自身也算作「内部」——否则 mousedown 会先卸载弹层，
 * 随后的 click 落不到已消失的候选项上（表现为「点了没反应」）。
 */
function useDismiss(open: boolean, refs: readonly ElementRef<HTMLElement>[], close: () => void) {
  useEffect(() => {
    if (!open) {
      return
    }
    const isInside = (target: Node) => refs.some((ref) => ref.current?.contains(target) === true)
    const onPointerDown = (event: MouseEvent) => {
      if (!isInside(event.target as Node)) {
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
  }, [open, refs, close])
}

/** 弹层打开期间跟随字段：窗口缩放或页面滚动时重算位置，避免弹层和字段错位 */
function useAnchorFollow(open: boolean, reposition: () => void) {
  useEffect(() => {
    if (!open) {
      return
    }
    document.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])
}

const POPUP_CLASS =
  'fixed z-50 overflow-y-auto rounded-lg border border-app-border bg-app-card shadow-xl'

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

/** 右侧 ▼ 按钮：常驻，点开或收起候选弹层 */
function DropdownTrigger({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={onToggle}
      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-card px-2 text-app transition-colors duration-150 hover:border-app-border-strong hover:bg-app-hover"
    >
      <ChevronDown className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** 弹层：portal + fixed 定位，既不被弹窗滚动区裁切，也不随内容滚动错位。 */
function OptionPopup({
  style,
  options,
  emptyText,
  onPick,
  popupRef,
}: {
  style: PopupStyle
  options: readonly string[]
  emptyText: string
  onPick: (model: string) => void
  popupRef: ElementRef<HTMLDivElement>
}) {
  return createPortal(
    <div ref={popupRef} style={style} className={POPUP_CLASS}>
      {options.length > 0 ? (
        <ul role="listbox" className="py-1">
          {options.map((option) => (
            <li key={option}>
              <OptionRow option={option} onPick={onPick} />
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="px-3 py-1.5 text-sm text-app-muted">
          {emptyText}
        </p>
      )}
    </div>,
    document.body
  )
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
  const popup = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<PopupStyle | null>(null)
  const inside = useMemo<ElementRef<HTMLElement>[]>(() => [container, popup], [])
  const value = form.watch(name) ?? ''
  const matches = useMemo(() => filterOptions(options, value), [options, value])
  const close = useCallback(() => {
    setStyle(null)
  }, [])
  const reposition = useCallback(() => {
    setStyle(popupStyle(container.current))
  }, [])
  const open = style !== null

  useDismiss(open, inside, close)
  useAnchorFollow(open, reposition)

  const toggle = () => {
    setStyle(open ? null : popupStyle(container.current))
  }
  const pick = (model: string) => {
    form.setValue(name, model, { shouldDirty: true })
    close()
  }

  return (
    <div ref={container} className="flex min-w-0 flex-1 items-center gap-2">
      <Input {...form.register(name)} placeholder={placeholder} aria-label={label} />
      <DropdownTrigger label={label} open={open} onToggle={toggle} />
      {style ? (
        <OptionPopup
          style={style}
          options={matches}
          emptyText={emptyText}
          onPick={pick}
          popupRef={popup}
        />
      ) : null}
    </div>
  )
}
