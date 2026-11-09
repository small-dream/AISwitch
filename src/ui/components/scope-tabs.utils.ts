import type { AppScope } from '@/types/app-scope'

/** 作用域页签顺序（左 → 右），键盘循环与渲染共用 */
export const appScopes: readonly AppScope[] = ['global', 'project']

/** 方向键 → 相邻页签（Home/End 也可以直达首尾）；其他按键返回 null */
export function nextScope(current: AppScope, key: string): AppScope | null {
  const index = appScopes.indexOf(current)
  if (key === 'ArrowRight') {
    return appScopes[(index + 1) % appScopes.length] ?? null
  }
  if (key === 'ArrowLeft') {
    return appScopes[(index + appScopes.length - 1) % appScopes.length] ?? null
  }
  if (key === 'Home') {
    return appScopes[0] ?? null
  }
  if (key === 'End') {
    return appScopes[appScopes.length - 1] ?? null
  }
  return null
}
