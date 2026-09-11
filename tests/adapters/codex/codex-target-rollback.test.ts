import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createCodexTarget } from '@/adapters/codex'
import { AppError, isAppError } from '@/domain/errors'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const CONFIG_FIXTURE = readFileSync(join(FIXTURES, 'codex-config.toml'), 'utf8')
const AUTH_FIXTURE = readFileSync(join(FIXTURES, 'codex-auth.json'), 'utf8')
const MODELS_FIXTURE = readFileSync(join(FIXTURES, 'codex-models.json'), 'utf8')
const MODELS_PATH = '.codex/models.json'
const RELAY_PRESET = { tool: 'codex', baseUrl: 'https://relay.example.com/v1' } as const

function seededFs(): MemoryFs {
  return createMemoryFs({
    '.codex/config.toml': CONFIG_FIXTURE,
    '.codex/auth.json': AUTH_FIXTURE,
    [MODELS_PATH]: MODELS_FIXTURE,
  })
}

/** 捕获 apply 抛出的 AppError（非 AppError 视为测试失败） */
async function captureApplyError(promise: Promise<unknown>): Promise<AppError> {
  const error: unknown = await promise.catch((e: unknown) => e)
  if (!isAppError(error)) {
    throw new Error('应抛出 AppError')
  }
  return error
}

/** rename 落地后把目标文件篡改成坏内容（一次性），逼出写后回读校验失败 */
function tamperOnceAfterRename(fs: MemoryFs, target: string, badContent: string): void {
  const realRename = fs.rename.bind(fs)
  let tampered = false
  fs.rename = async (from, to) => {
    await realRename(from, to)
    if (!tampered && to === target) {
      tampered = true
      fs.files().set(to, badContent)
    }
  }
}

describe('CodexConfigTarget · apply 失败回滚（校验失败）', () => {
  it('校验失败：恢复本次 apply 的备份而非更早的备份，错误带真实回滚上下文', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    await target.apply(makePreset(RELAY_PRESET))
    const configBefore = fs.files().get('.codex/config.toml')
    const authBefore = fs.files().get('.codex/auth.json')
    tamperOnceAfterRename(fs, '.codex/config.toml', 'model = "tampered"\n')

    const error = await captureApplyError(
      target.apply(makePreset({ ...RELAY_PRESET, model: 'glm-5-turbo' }))
    )

    expect(error.code).toBe('E_CONFIG_VERIFY')
    expect(error.message).toContain('已自动回滚')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: true })
    expect(fs.files().get('.codex/config.toml')).toBe(configBefore)
    expect(fs.files().get('.codex/config.toml')).not.toBe(CONFIG_FIXTURE)
    expect(fs.files().get('.codex/auth.json')).toBe(authBefore)
  })

  it('首次写入校验失败：删除新建文件，错误不谎称已回滚', async () => {
    const fs = createMemoryFs()
    const target = createCodexTarget(fs)
    tamperOnceAfterRename(fs, '.codex/config.toml', 'model = "tampered"\n')

    const error = await captureApplyError(target.apply(makePreset(RELAY_PRESET)))

    expect(error.code).toBe('E_CONFIG_VERIFY')
    expect(error.message).not.toContain('已自动回滚')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: false })
    expect(fs.files().has('.codex/config.toml')).toBe(false)
    expect(fs.files().has('.codex/auth.json')).toBe(false)
  })
})

describe('CodexConfigTarget · apply 失败回滚（写阶段失败）', () => {
  it('auth 落盘后收紧权限抛错：回滚清理多文件部分状态并保留原错误码', async () => {
    const fs = seededFs()
    const realRestrict = fs.restrictPermissions.bind(fs)
    let shouldFail = true
    fs.restrictPermissions = (path) => {
      if (shouldFail && path === '.codex/auth.json') {
        shouldFail = false
        return Promise.reject(new Error('EPERM'))
      }
      return realRestrict(path)
    }
    const target = createCodexTarget(fs)

    const error = await captureApplyError(target.apply(makePreset(RELAY_PRESET)))

    expect(error.code).toBe('E_FS_PERMISSION')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: true })
    // config 已写入新内容、auth 写半截，回滚后都必须回到 fixture
    expect(fs.files().get('.codex/config.toml')).toBe(CONFIG_FIXTURE)
    expect(fs.files().get('.codex/auth.json')).toBe(AUTH_FIXTURE)
  })

  it('models.json 不在本次计划内：失败回滚不得触碰它（存在更早备份也一样）', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    // 第一次 apply 携带元数据：重写 models.json 并留下一份历史备份
    await target.apply(makePreset({ ...RELAY_PRESET, modelMetadata: { context_window: 128000 } }))
    // 用户随后自行编辑 models.json（与任何备份都不一致）
    const sentinel = '{"models":[{"slug":"user-custom","display_name":"User-Custom"}]}'
    fs.files().set(MODELS_PATH, sentinel)
    tamperOnceAfterRename(fs, '.codex/config.toml', 'model = "tampered"\n')

    // 无元数据 → models.json 不在本次改写计划内
    const error = await captureApplyError(target.apply(makePreset(RELAY_PRESET)))

    expect(error.code).toBe('E_CONFIG_VERIFY')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: true })
    expect(fs.files().get(MODELS_PATH)).toBe(sentinel)
  })
})

describe('CodexConfigTarget · apply 失败回滚（回滚自身失败）', () => {
  it('回滚自身失败：context 携带 rollbackFailed 且消息不谎称已回滚', async () => {
    const fs = seededFs()
    const realRename = fs.rename.bind(fs)
    fs.rename = (from, to) =>
      to === '.codex/config.toml' ? Promise.reject(new Error('IO 错误')) : realRename(from, to)
    const target = createCodexTarget(fs)

    const error = await captureApplyError(target.apply(makePreset(RELAY_PRESET)))

    expect(error.code).toBe('E_FS_WRITE')
    expect(error.message).not.toContain('已自动回滚')
    expect(error.context.rollbackFailed).toBe(true)
    // config 从未被写入（rename 未成功），auth 由回滚恢复
    expect(fs.files().get('.codex/config.toml')).toBe(CONFIG_FIXTURE)
    expect(fs.files().get('.codex/auth.json')).toBe(AUTH_FIXTURE)
  })
})
