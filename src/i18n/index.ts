import { useCallback, useEffect } from 'react'

import { useLocaleStore, type Locale } from './locale-store'
import { en } from './en'
import { zhCN, type TranslationKey } from './zh-CN'

export type { Locale, TranslationKey }
export { useLocaleStore }

export type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { 'zh-CN': zhCN, en }

/** 核心翻译：按语言取词条（类型保证两套词典 key 对齐）；{x} 占位符按 params 插值（缺参保留原占位符） */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const template = DICTIONARIES[locale][key]
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

/** 组件内响应式翻译：语言切换时订阅 store 触发重渲染 */
export function useT(): TFn {
  const locale = useLocaleStore((state) => state.locale)
  return useCallback((key, params) => translate(locale, key, params), [locale])
}

/** 非 React 场景翻译（toast、通知、错误边界等）：读取当前语言，不订阅更新 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, key, params)
}

/** 将当前语言同步到 <html lang>（无障碍 / 字体选择跟随） */
export function useApplyLocale(): void {
  const locale = useLocaleStore((state) => state.locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
}
