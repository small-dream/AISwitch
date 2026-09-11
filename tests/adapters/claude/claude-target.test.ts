import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createClaudeTarget } from '@/adapters/claude'
import { CLAUDE_ENV_KEYS, CLAUDE_SLOT_KEYS } from '@/constants/config-keys'
import { AppError, isAppError } from '@/domain/errors'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const SETTINGS_FIXTURE = readFileSync(join(FIXTURES, 'claude-settings.json'), 'utf8')

function parseSettings(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined) {
    throw new Error('settings.json 未写入')
  }
  return JSON.parse(raw) as Record<string, unknown>
}

describe('ClaudeConfigTarget · detect', () => {
  it('detect：未检测到全局配置（不判定为未安装，兼容 VS Code 插件场景）', async () => {
    const target = createClaudeTarget(createMemoryFs())
    expect(await target.detect()).toEqual({ tool: 'claude-code', status: 'not-configured' })
  })

  it('detect：读取当前模型与供应商（槽位映射模式回退链）', async () => {
    const target = createClaudeTarget(createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE }))
    expect(await target.detect()).toEqual({
      tool: 'claude-code',
      status: 'installed',
      activeModel: 'old-sonnet',
      activeProviderName: 'https://old-relay.example.com',
    })
  })

  it('detect：损坏配置归为 unknown', async () => {
    const target = createClaudeTarget(createMemoryFs({ '.claude/settings.json': '{broken' }))
    expect(await target.detect()).toEqual({ tool: 'claude-code', status: 'unknown' })
  })
})

describe('ClaudeConfigTarget · apply / rollback', () => {
  it('apply：写入预设键、保留未知字段、创建备份', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const target = createClaudeTarget(fs)
    const preset = makePreset()

    const result = await target.apply(preset)

    expect(result.tool).toBe('claude-code')
    expect(result.backupPath).toMatch(/--settings\.json$/)
    const written = parseSettings(fs.files().get('.claude/settings.json')) as {
      env: Record<string, string>
      permissions: unknown
    }
    expect(written.env[CLAUDE_ENV_KEYS.model]).toBe('glm-4.6')
    expect(written.env[CLAUDE_ENV_KEYS.authToken]).toBe('sk-test-key')
    expect(written.env[CLAUDE_SLOT_KEYS.sonnet]).toBe('glm-4.6')
    expect(written.env[CLAUDE_SLOT_KEYS.opus]).toBe('glm-4.6')
    expect(written.env[CLAUDE_SLOT_KEYS.haiku]).toBe('glm-4.6')
    expect(written.env.OTHER_KEY).toBe('keep-me')
    expect(written.permissions).toEqual({ allow: ['Bash'] })
    expect(await target.verify(preset)).toBe(true)
  })

  it('apply：首次（无既有配置）不产生备份且校验通过', async () => {
    const fs = createMemoryFs()
    const target = createClaudeTarget(fs)

    const result = await target.apply(makePreset())

    expect(result.backupPath).toBeUndefined()
    expect(await target.verify(makePreset())).toBe(true)
  })

  it('rollback：恢复最近一份备份', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const target = createClaudeTarget(fs)
    await target.apply(makePreset())

    expect(await target.rollback()).toBe(true)
    expect(fs.files().get('.claude/settings.json')).toBe(SETTINGS_FIXTURE)
  })
})

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

describe('ClaudeConfigTarget · apply 失败回滚（校验失败）', () => {
  it('校验失败：恢复的是本次 apply 的备份，而非更早的备份', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const target = createClaudeTarget(fs)
    await target.apply(makePreset())
    const beforeSecondApply = fs.files().get('.claude/settings.json')
    tamperOnceAfterRename(fs, '.claude/settings.json', '{"env":{}}')

    const error = await captureApplyError(target.apply(makePreset({ model: 'glm-5' })))

    expect(error.code).toBe('E_CONFIG_VERIFY')
    expect(error.message).toContain('已自动回滚')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: true })
    // 恢复内容为第二次 apply 前的状态（本次备份），不是 fixture（更早的备份）
    expect(fs.files().get('.claude/settings.json')).toBe(beforeSecondApply)
    expect(fs.files().get('.claude/settings.json')).not.toBe(SETTINGS_FIXTURE)
  })

  it('首次写入校验失败：删除新建文件，错误不谎称已回滚', async () => {
    const fs = createMemoryFs()
    const target = createClaudeTarget(fs)
    tamperOnceAfterRename(fs, '.claude/settings.json', '{"env":{}}')

    const error = await captureApplyError(target.apply(makePreset()))

    expect(error.code).toBe('E_CONFIG_VERIFY')
    expect(error.message).not.toContain('已自动回滚')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: false })
    expect(fs.files().has('.claude/settings.json')).toBe(false)
  })
})

describe('ClaudeConfigTarget · apply 失败回滚（写阶段与回滚失败）', () => {
  it('写阶段失败（rename 后收紧权限抛错）：回滚清理半截状态并保留原错误码', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const realRestrict = fs.restrictPermissions.bind(fs)
    let shouldFail = true
    fs.restrictPermissions = (path) => {
      if (shouldFail && path === '.claude/settings.json') {
        shouldFail = false
        return Promise.reject(new Error('EPERM'))
      }
      return realRestrict(path)
    }
    const target = createClaudeTarget(fs)

    const error = await captureApplyError(target.apply(makePreset()))

    expect(error.code).toBe('E_FS_PERMISSION')
    expect(error.context).toMatchObject({ rollbackFailed: false, rolledBack: true })
    // rename 已成功、新内容曾落盘，回滚必须把它清回 fixture
    expect(fs.files().get('.claude/settings.json')).toBe(SETTINGS_FIXTURE)
  })

  it('回滚自身失败：context 携带 rollbackFailed 且消息不谎称已回滚', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const realRename = fs.rename.bind(fs)
    fs.rename = (from, to) =>
      to === '.claude/settings.json' ? Promise.reject(new Error('IO 错误')) : realRename(from, to)
    const target = createClaudeTarget(fs)

    const error = await captureApplyError(target.apply(makePreset()))

    expect(error.code).toBe('E_FS_WRITE')
    expect(error.message).not.toContain('已自动回滚')
    expect(error.context.rollbackFailed).toBe(true)
    expect(fs.files().get('.claude/settings.json')).toBe(SETTINGS_FIXTURE)
  })
})
