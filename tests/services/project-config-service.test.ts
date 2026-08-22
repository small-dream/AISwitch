import { describe, expect, it } from 'vitest'

import { PresetRepository } from '@/adapters/presets/preset-repository'
import { ProjectConfigService } from '@/services/project-config-service'
import { makePreset } from '../helpers/make-preset'
import { createMemoryFs } from '../helpers/memory-fs'

function serviceWithPreset(initial: Record<string, string>, overrides: Parameters<typeof makePreset>[0] = {}) {
  const fs = createMemoryFs(initial)
  const repo = new PresetRepository(fs)
  const preset = makePreset({ id: 'p1', ...overrides })
  return { fs, preset, service: new ProjectConfigService(fs, repo), repo }
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
