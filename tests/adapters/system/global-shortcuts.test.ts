import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { register, unregister } = vi.hoisted(() => ({
  register: vi.fn(),
  unregister: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({ register, unregister }))

import { tauriGlobalShortcuts } from '@/adapters/system/global-shortcuts'

const internals = window as unknown as Record<string, unknown>

describe('tauriGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    register.mockResolvedValue(undefined)
    unregister.mockResolvedValue(undefined)
  })

  afterEach(() => {
    Reflect.deleteProperty(internals, '__TAURI_INTERNALS__')
  })

  it('无 IPC 桥（浏览器预览）时不调用插件，也不报错', async () => {
    Reflect.deleteProperty(internals, '__TAURI_INTERNALS__')

    await tauriGlobalShortcuts.register('CmdOrCtrl+Shift+A', () => undefined)

    expect(register).not.toHaveBeenCalled()
  })

  it('有 IPC 桥时透传加速键与回调', async () => {
    internals.__TAURI_INTERNALS__ = {}
    const handler = () => undefined

    await tauriGlobalShortcuts.register('CmdOrCtrl+Shift+A', handler)

    expect(register).toHaveBeenCalledWith('CmdOrCtrl+Shift+A', handler)
  })

  it('插件拒绝时包装为 AppError，并保留加速键上下文', async () => {
    internals.__TAURI_INTERNALS__ = {}
    register.mockRejectedValue('permission denied')

    await expect(
      tauriGlobalShortcuts.register('CmdOrCtrl+Shift+S', () => undefined)
    ).rejects.toMatchObject({
      code: 'E_UNKNOWN',
      message: '注册全局快捷键失败',
      context: { accelerator: 'CmdOrCtrl+Shift+S' },
    })
  })

  it('注销同样包装错误码', async () => {
    internals.__TAURI_INTERNALS__ = {}
    unregister.mockRejectedValue('permission denied')

    await expect(tauriGlobalShortcuts.unregister('CmdOrCtrl+Shift+A')).rejects.toMatchObject({
      code: 'E_UNKNOWN',
      message: '注销全局快捷键失败',
    })
  })
})

describe('tauriGlobalShortcuts · 顺序', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    internals.__TAURI_INTERNALS__ = {}
  })

  afterEach(() => {
    Reflect.deleteProperty(internals, '__TAURI_INTERNALS__')
  })

  it('注册与注销串行执行：注销排在注册之后（StrictMode 双挂载不丢快捷键）', async () => {
    const order: string[] = []
    register.mockImplementation(() => {
      order.push('register')
      return Promise.resolve()
    })
    unregister.mockImplementation(() => {
      order.push('unregister')
      return Promise.resolve()
    })

    const first = tauriGlobalShortcuts.register('CmdOrCtrl+Shift+A', () => undefined)
    const second = tauriGlobalShortcuts.unregister('CmdOrCtrl+Shift+A')
    await Promise.all([first, second])

    expect(order).toEqual(['register', 'unregister'])
  })
})
