import { create } from 'zustand'

export type Locale = 'zh-CN' | 'en'

const STORAGE_KEY = 'jake.locale'

function persistLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // 存储不可用（隐私模式等）时仅内存生效
  }
}

/** 已保存的选择优先；否则跟随系统语言（zh* → zh-CN，其余 → en） */
function resolveLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-CN' || stored === 'en') {
      return stored
    }
  } catch {
    // 读取失败时回落系统语言
  }
  const language = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN'
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: resolveLocale(),
  setLocale: (locale) => {
    persistLocale(locale)
    set({ locale })
  },
  toggleLocale: () => {
    const next: Locale = useLocaleStore.getState().locale === 'zh-CN' ? 'en' : 'zh-CN'
    persistLocale(next)
    set({ locale: next })
  },
}))
