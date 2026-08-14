import { useEffect } from 'react'

import { useThemeStore } from '@/stores/theme-store'

/** 将主题同步到 <html> 的 .dark 类与原生 color-scheme（滚动条等原生控件跟随） */
export function useApplyTheme(): void {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])
}
