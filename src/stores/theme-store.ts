import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'jake.theme'

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // 存储不可用（隐私模式等）时仅内存生效
  }
}

function initialTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: initialTheme(),
  setTheme: (theme) => {
    persistTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next: Theme = useThemeStore.getState().theme === 'dark' ? 'light' : 'dark'
    persistTheme(next)
    set({ theme: next })
  },
}))
