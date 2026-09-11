import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PATHS } from '@/constants/paths'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import { AppError } from '@/domain/errors'
import { SwitchService } from '@/services/switch-service'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import { makePreset } from '../helpers/make-preset'
import { createMemoryFs } from '../helpers/memory-fs'

function setup() {
  const fs = createMemoryFs()
  const repo = new PresetRepository(fs)
  const baselines = new BaselineManager(fs, new BackupManager(fs))
  const applied: string[] = []
  const target: ConfigTarget = {
    tool: 'claude-code',
    detect: () => Promise.resolve({ tool: 'claude-code', status: 'installed' }),
    apply: (preset) => {
      applied.push(preset.id)
      const result: ApplyResult = { tool: 'claude-code', appliedAt: new Date().toISOString() }
      return Promise.resolve(result)
    },
    verify: () => Promise.resolve(true),
    rollback: () => Promise.resolve(true),
  }
  registerTarget(target)
  return { fs, repo, baselines, service: new SwitchService(repo, baselines), applied }
}

describe('SwitchService', () => {
  it('加载预设并委托给对应目标工具', async () => {
    const { repo, service, applied } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })

    const result = await service.switch('claude-code', preset.id)

    expect(result.tool).toBe('claude-code')
    expect(applied).toEqual([preset.id])
  })

  it('预设不存在抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = setup()
    await expect(service.switch('claude-code', 'missing')).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })

  it('预设与目标工具不匹配抛出 E_VALIDATION_FAILED', async () => {
    const { repo, service } = setup()
    await repo.save({ version: 1, presets: [makePreset({ tool: 'codex' })] })

    try {
      await service.switch('claude-code', 'preset-1')
      expect.unreachable('应当抛出 AppError')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('E_VALIDATION_FAILED')
    }
  })
})

describe('SwitchService 安装前基线挂钩', () => {
  it('首次切换前捕获基线一次，二次切换不重复捕获', async () => {
    const { repo, service, baselines } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })

    await service.switch('claude-code', preset.id)
    const manifest = await baselines.manifest()
    const capturedAt = manifest.tools['claude-code']?.files[PATHS.claudeSettings]?.capturedAt
    expect(capturedAt).toBeTruthy()

    await service.switch('claude-code', preset.id)
    const again = await baselines.manifest()
    expect(again.tools['claude-code']?.files[PATHS.claudeSettings]?.capturedAt).toBe(capturedAt)
  })

  it('基线捕获失败只降级告警，不阻断切换', async () => {
    const { repo, applied } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })
    const failing = {
      captureIfAbsent: () => Promise.reject(new Error('disk full')),
    }
    const service = new SwitchService(repo, failing as unknown as BaselineManager)

    const result = await service.switch('claude-code', preset.id)

    expect(result.tool).toBe('claude-code')
    expect(applied).toEqual([preset.id])
  })
})

/** 可控闸门：避免使用非空断言的 deferred 模式 */
function createGate(): { gate: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return { gate, release }
}

function makeResult(tool: 'claude-code' | 'codex'): ApplyResult {
  return { tool, appliedAt: new Date().toISOString() }
}

function targetWith(apply: ConfigTarget['apply'], tool: 'claude-code' | 'codex' = 'claude-code'): ConfigTarget {
  return {
    tool,
    detect: () => Promise.resolve({ tool, status: 'installed' }),
    apply,
    verify: () => Promise.resolve(true),
    rollback: () => Promise.resolve(true),
  }
}

function makeLockedService() {
  const fs = createMemoryFs()
  const repo = new PresetRepository(fs)
  const baselines = new BaselineManager(fs, new BackupManager(fs))
  return { repo, service: new SwitchService(repo, baselines) }
}

describe('SwitchService 并发串行化：同一工具', () => {
  it('并发 switch 严格串行执行', async () => {
    const events: string[] = []
    registerTarget(
      targetWith(async (preset) => {
        events.push(`enter:${preset.id}`)
        await new Promise((resolve) => setTimeout(resolve, 10))
        events.push(`exit:${preset.id}`)
        return makeResult('claude-code')
      })
    )
    const { repo, service } = makeLockedService()
    await repo.save({ version: 1, presets: [makePreset({ id: 'p1' }), makePreset({ id: 'p2' })] })

    await Promise.all([service.switch('claude-code', 'p1'), service.switch('claude-code', 'p2')])

    expect(events).toEqual(['enter:p1', 'exit:p1', 'enter:p2', 'exit:p2'])
  })

  it('rollback 与进行中的 switch 走同一串行链', async () => {
    const events: string[] = []
    const applyGate = createGate()
    const enteredGate = createGate()
    const target = targetWith(async () => {
      events.push('apply:enter')
      enteredGate.release()
      await applyGate.gate
      events.push('apply:exit')
      return makeResult('claude-code')
    })
    target.rollback = () => {
      events.push('rollback')
      return Promise.resolve(true)
    }
    registerTarget(target)
    const { repo, service } = makeLockedService()
    await repo.save({ version: 1, presets: [makePreset({ id: 'p1' })] })

    const switching = service.switch('claude-code', 'p1')
    await enteredGate.gate
    const rolling = service.rollback('claude-code')
    applyGate.release()
    await Promise.all([switching, rolling])

    expect(events).toEqual(['apply:enter', 'apply:exit', 'rollback'])
  })
})

describe('SwitchService 并发串行化：失败恢复', () => {
  it('失败的 switch 不阻塞同一工具的后续调用', async () => {
    registerTarget(
      targetWith((preset) =>
        preset.id === 'p1'
          ? Promise.reject(new AppError('E_CONFIG_WRITE', '写入失败', {}))
          : Promise.resolve(makeResult('claude-code'))
      )
    )
    const { repo, service } = makeLockedService()
    await repo.save({ version: 1, presets: [makePreset({ id: 'p1' }), makePreset({ id: 'p2' })] })

    await expect(service.switch('claude-code', 'p1')).rejects.toMatchObject({
      code: 'E_CONFIG_WRITE',
    })
    await expect(service.switch('claude-code', 'p2')).resolves.toMatchObject({
      tool: 'claude-code',
    })
  })
})

describe('SwitchService 并发串行化：不同工具', () => {
  it('不同工具的 switch 可以并行', async () => {
    const entered: string[] = []
    const bothEntered = createGate()
    const makeSlow = (tool: 'claude-code' | 'codex'): ConfigTarget =>
      targetWith(async () => {
        entered.push(tool)
        if (entered.length === 2) {
          // 两个工具的 apply 都已进入才放行：全局串行实现会在此死锁并超时
          bothEntered.release()
        }
        await bothEntered.gate
        return makeResult(tool)
      }, tool)
    registerTarget(makeSlow('claude-code'))
    registerTarget(makeSlow('codex'))
    const { repo, service } = makeLockedService()
    await repo.save({
      version: 1,
      presets: [makePreset({ id: 'p1' }), makePreset({ id: 'p2', tool: 'codex' })],
    })

    await Promise.all([service.switch('claude-code', 'p1'), service.switch('codex', 'p2')])

    expect(entered).toHaveLength(2)
  })
})
