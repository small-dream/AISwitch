import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UseFormReturn } from 'react-hook-form'

import type { ModelOptionGroup } from '@/domain/rules/model-options'
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
  /** 按来源分组（模板推荐 / 供应商目录），弹层里分组展示并标注出处 */
  groups: readonly ModelOptionGroup[]
  placeholder: string
  label: string
  emptyText: string
  /** 弹层打开时通知外部（用于首次打开自动补全供应商目录） */
  onOpen: () => void
}

/** 候选过滤：空输入或已选中（见 visibleGroups）时列出全部，否则按子串匹配（大小写无关） */
function filterOptions(options: readonly string[], keyword: string, picked: boolean): string[] {
  const needle = keyword.trim().toLowerCase()
  if (needle === '' || picked) {
    return [...options]
  }
  return options.filter((option) => option.toLowerCase().includes(needle))
}

/**
 * 可见分组：按输入过滤后丢掉空组。输入与某个候选完全一致（= 刚从列表里选中）时不过滤——
 * 否则选中后再打开就只剩命中项，看起来像「列表出不来了」。
 */
function visibleGroups(groups: readonly ModelOptionGroup[], keyword: string): ModelOptionGroup[] {
  const needle = keyword.trim().toLowerCase()
  const picked =
    needle !== '' &&
    groups.some((group) => group.options.some((option) => option.toLowerCase() === needle))
  return groups
    .map((group) => ({
      label: group.label,
      options: filterOptions(group.options, keyword, picked),
    }))
    .filter((group) => group.options.length > 0)
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

/** 弹层开合与定位：定位值本身就是「是否打开」的状态 */
function usePopupPlacement(container: ElementRef<HTMLElement>, onOpen: () => void) {
  const [style, setStyle] = useState<PopupStyle | null>(null)
  const close = useCallback(() => {
    setStyle(null)
  }, [])
  const reposition = useCallback(() => {
    setStyle(popupStyle(container.current))
  }, [container])
  const open = style !== null
  const toggle = () => {
    setStyle(open ? null : popupStyle(container.current))
    if (!open) {
      onOpen()
    }
  }
  return { style, open, toggle, close, reposition }
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

/** 一个来源分组的标题 + 选项 */
function OptionGroupSection({
  group,
  onPick,
}: {
  group: ModelOptionGroup
  onPick: (model: string) => void
}) {
  return (
    <li role="group" aria-label={group.label}>
      <p className="px-3 pt-2 pb-1 text-xs text-app-muted">{group.label}</p>
      <ul>
        {group.options.map((option) => (
          <li key={option}>
            <OptionRow option={option} onPick={onPick} />
          </li>
        ))}
      </ul>
    </li>
  )
}

/** 弹层：portal + fixed 定位，既不被弹窗滚动区裁切，也不随内容滚动错位。 */
function OptionPopup({
  style,
  groups,
  emptyText,
  onPick,
  popupRef,
}: {
  style: PopupStyle
  groups: readonly ModelOptionGroup[]
  emptyText: string
  onPick: (model: string) => void
  popupRef: ElementRef<HTMLDivElement>
}) {
  return createPortal(
    <div ref={popupRef} style={style} className={POPUP_CLASS}>
      {groups.length > 0 ? (
        <ul role="listbox" className="py-1">
          {groups.map((group) => (
            <OptionGroupSection key={group.label} group={group} onPick={onPick} />
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
  groups,
  placeholder,
  label,
  emptyText,
  onOpen,
}: ModelComboBoxProps) {
  const container = useRef<HTMLDivElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const inside = useMemo<ElementRef<HTMLElement>[]>(() => [container, popup], [])
  const value = form.watch(name) ?? ''
  const visible = useMemo(() => visibleGroups(groups, value), [groups, value])
  const placement = usePopupPlacement(container, onOpen)

  useDismiss(placement.open, inside, placement.close)
  useAnchorFollow(placement.open, placement.reposition)

  const pick = (model: string) => {
    form.setValue(name, model, { shouldDirty: true })
    placement.close()
  }

  return (
    <div ref={container} className="flex min-w-0 flex-1 items-center gap-2">
      <Input {...form.register(name)} placeholder={placeholder} aria-label={label} />
      <DropdownTrigger label={label} open={placement.open} onToggle={placement.toggle} />
      {placement.style ? (
        <OptionPopup
          style={placement.style}
          groups={visible}
          emptyText={emptyText}
          onPick={pick}
          popupRef={popup}
        />
      ) : null}
    </div>
  )
}
