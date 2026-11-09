import { register, unregister } from '@tauri-apps/plugin-global-shortcut'

import { toAppError } from '@/domain/errors'

/**
 * 全局快捷键端口（ARCHITECTURE §2.3 D9）：插件调用收敛于此，hook 只负责业务回调与失败反馈。
 * 浏览器预览没有 IPC 桥，注册/注销一律按成功处理，避免开发环境刷失败提示。
 */
export interface GlobalShortcutPort {
  register(accelerator: string, handler: () => void): Promise<void>
  unregister(accelerator: string): Promise<void>
}

function hasRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 串行队列：注册与注销必须按调用顺序生效。
 * React StrictMode 会「挂载 → 卸载 → 再挂载」，若两批调用并发，注销可能早于注册完成，
 * 结果是快捷键在开发环境随机失效；排队后顺序恒为 注册 → 注销 → 注册。
 */
let chain: Promise<unknown> = Promise.resolve()

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export const tauriGlobalShortcuts: GlobalShortcutPort = {
  register(accelerator, handler) {
    if (!hasRuntime()) {
      return Promise.resolve()
    }
    return enqueue(async () => {
      try {
        await register(accelerator, handler)
      } catch (error) {
        throw toAppError(error, 'E_UNKNOWN', '注册全局快捷键失败', { accelerator })
      }
    })
  },

  unregister(accelerator) {
    if (!hasRuntime()) {
      return Promise.resolve()
    }
    return enqueue(async () => {
      try {
        await unregister(accelerator)
      } catch (error) {
        throw toAppError(error, 'E_UNKNOWN', '注销全局快捷键失败', { accelerator })
      }
    })
  },
}
