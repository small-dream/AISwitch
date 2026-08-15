import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { useLocaleStore } from '@/i18n/locale-store'

// jsdom 的 navigator.language 为 en-US，而 locale-store 在导入时解析语言；
// 全套测试的文案断言基于中文，须在任何用例前钉住默认语言（存储 + store 双保险）
try {
  window.localStorage.setItem('jake.locale', 'zh-CN')
} catch {
  // 存储不可用时仍由下方 setState 兜底
}
useLocaleStore.setState({ locale: 'zh-CN' })

// vitest 未开启 globals，RTL 自动清理不会注册；手动统一卸载已渲染组件
afterEach(() => {
  cleanup()
})
