import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// vitest 未开启 globals，RTL 自动清理不会注册；手动统一卸载已渲染组件
afterEach(() => {
  cleanup()
})
