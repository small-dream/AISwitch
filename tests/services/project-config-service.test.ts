import { describe, expect, it } from 'vitest'

import { PresetRepository } from '@/adapters/presets/preset-repository'
import { createProjectConfigRecordStore, projectConfigOps } from '@/adapters/projects/project-config-ops'
import { AppError } from '@/domain/errors'
import { ProjectConfigService } from '@/services/project-config-service'
import { makePreset } from '../helpers/make-preset'
import { createMemoryFs, type MemoryFs } from '../helpers/memory-fs'

function serviceWithPreset(initial: Record<string, string>, overrides: Parameters<typeof makePreset>[0] = {}) {
  const fs = createMemoryFs(initial)
  const repo = new PresetRepository(fs)
  const preset = makePreset({ id: 'p1', ...overrides })
  const service = new ProjectConfigService(fs, repo, createProjectConfigRecordStore(fs), projectConfigOps)
  return { fs, preset, service, repo }
}

describe('ProjectConfigService', () => {
  it('仅写入项目目录并保留全局配置', async () => {
    const { fs, preset, service, repo } = serviceWithPreset({ '.claude/settings.json': '{"env":{"OTHER":"keep"}}' }, { model: 'project-model' })
    await repo.save({ version: 1, presets: [preset] })

    await service.apply('repos/demo', 'claude-code', preset.id)

    expect(fs.files().has('.claude/settings.json')).toBe(true)
    expect(fs.files().get('repos/demo/.claude/settings.json')).toContain('project-model')
  })

  it('读取项目配置用于优先级判定', async () => {
    const { service } = serviceWithPreset({ 'repos/demo/.codex/config.toml': 'model = "project-model"\n' })

    const status = await service.detect('repos/demo', 'codex')

    expect(status).toMatchObject({ status: 'installed', activeModel: 'project-model' })
  })

  it('移除 Claude 项目配置但保留用户自有字段', async () => {
    const { fs, preset, service, repo } = serviceWithPreset({ 'repos/demo/.claude/settings.json': '{"env":{"OTHER":"keep"}}' }, { model: 'project-model' })
    await repo.save({ version: 1, presets: [preset] })
    await service.apply('repos/demo', 'claude-code', preset.id)

    await service.remove('repos/demo', 'claude-code')

    expect(fs.files().get('repos/demo/.claude/settings.json')).toContain('OTHER')
    expect(fs.files().get('repos/demo/.claude/settings.json')).not.toContain('project-model')
  })

  it('移除仅由 AISwitch 创建的 Claude 配置文件', async () => {
    const { fs, preset, service, repo } = serviceWithPreset({})
    await repo.save({ version: 1, presets: [preset] })
    await service.apply('repos/demo', 'claude-code', preset.id)

    await service.remove('repos/demo', 'claude-code')

    expect(fs.files().has('repos/demo/.claude/settings.json')).toBe(false)
  })

  it('移除 Codex 托管键但保留其他 provider 与 auth 字段', async () => {
    const { fs, preset, service, repo } = serviceWithPreset({
      'repos/demo/.codex/config.toml': '[model_providers.other]\nname = "Other"\n',
      'repos/demo/.codex/auth.json': '{"OTHER_TOKEN":"keep"}',
    }, { tool: 'codex', baseUrl: 'https://relay.example.com' })
    await repo.save({ version: 1, presets: [preset] })
    await service.apply('repos/demo', 'codex', preset.id)

    await service.remove('repos/demo', 'codex')

    expect(fs.files().get('repos/demo/.codex/config.toml')).toContain('other')
    expect(fs.files().get('repos/demo/.codex/auth.json')).toContain('OTHER_TOKEN')
    expect(fs.files().get('repos/demo/.codex/config.toml')).not.toContain('jake_current')
  })
})

describe('ProjectConfigService records', () => {
  it('写入后记录项目目录，移除后清理记录', async () => {
    const { fs, preset, service, repo } = serviceWithPreset({}, { model: 'project-model' })
    await repo.save({ version: 1, presets: [preset] })

    await service.apply('repos/demo', 'claude-code', preset.id)

    expect(await service.listRecords('claude-code')).toEqual([
      expect.objectContaining({ projectPath: 'repos/demo', tool: 'claude-code' }),
    ])

    await service.remove('repos/demo', 'claude-code')

    expect(await service.listRecords('claude-code')).toEqual([])
    expect(fs.files().has('.aiswitch/project-configs.json')).toBe(true)
  })
})


/** 让指定子串路径的写入失败，其余写入照常（模拟写序列中途磁盘故障） */
function failingWrite(fs: MemoryFs, failOn: string): MemoryFs {
  return {
    ...fs,
    writeTextFile(path, contents) {
      if (path.includes(failOn)) {
        return Promise.reject(new Error('EACCES'))
      }
      return fs.writeTextFile(path, contents)
    },
  }
}

describe('ProjectConfigService.apply 失败回滚', () => {
  it('第二个文件写入失败：config.toml 恢复原内容、auth.json 保持不存在、错误码保留', async () => {
    const fs = failingWrite(
      createMemoryFs({ 'repos/demo/.codex/config.toml': 'model = "old"\n' }),
      'auth.json'
    )
    const repo = new PresetRepository(fs)
    const preset = makePreset({ id: 'p1', tool: 'codex' })
    await repo.save({ version: 1, presets: [preset] })
    const service = new ProjectConfigService(fs, repo, createProjectConfigRecordStore(fs), projectConfigOps)

    const error = await service.apply('repos/demo', 'codex', preset.id).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('E_FS_WRITE')
    expect((error as AppError).context.rolledBack).toBe(true)
    expect(fs.files().get('repos/demo/.codex/config.toml')).toBe('model = "old"\n')
    expect(fs.files().has('repos/demo/.codex/auth.json')).toBe(false)
  })

  it('models.json 写入失败：已写的 config/auth 回滚，应用创建的 models.json 被移除', async () => {
    const fs = failingWrite(
      createMemoryFs({
        'repos/demo/.codex/config.toml': 'model = "old"\n',
        'repos/demo/.codex/auth.json': '{"OPENAI_API_KEY":"sk-user"}',
      }),
      'models.json'
    )
    const repo = new PresetRepository(fs)
    const preset = makePreset({
      id: 'p1',
      tool: 'codex',
      modelMetadata: { 'glm-4.6': { slug: 'glm-4.6' } },
    })
    await repo.save({ version: 1, presets: [preset] })
    const service = new ProjectConfigService(fs, repo, createProjectConfigRecordStore(fs), projectConfigOps)

    const error = await service.apply('repos/demo', 'codex', preset.id).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('E_FS_WRITE')
    expect(fs.files().get('repos/demo/.codex/config.toml')).toBe('model = "old"\n')
    expect(fs.files().get('repos/demo/.codex/auth.json')).toBe('{"OPENAI_API_KEY":"sk-user"}')
    expect(fs.files().has('repos/demo/.codex/models.json')).toBe(false)
  })
})
