import { describe, expect, it } from 'vitest'

import { normalizeProjectPath, projectConfigPath } from '@/domain/rules/project-path'
import { effectiveToolStatus } from '@/domain/entities/project-config'

describe('project path rules', () => {
  it('规范化 HOME 相对目录并生成配置路径', () => {
    expect(normalizeProjectPath('work\\\\repo/')).toBe('work/repo')
    expect(projectConfigPath('work/repo', '.claude/settings.json')).toBe('work/repo/.claude/settings.json')
  })

  it('拒绝绝对路径和路径逃逸', () => {
    expect(() => normalizeProjectPath('/tmp/repo')).toThrow('HOME')
    expect(() => normalizeProjectPath('../repo')).toThrow('..')
  })

  it('项目已配置时优先于全局状态', () => {
    const project = { tool: 'claude-code' as const, status: 'installed' as const, activeModel: 'project' }
    const global = { tool: 'claude-code' as const, status: 'installed' as const, activeModel: 'global' }
    expect(effectiveToolStatus(project, global)?.activeModel).toBe('project')
    expect(effectiveToolStatus({ tool: 'claude-code', status: 'not-configured' }, global)).toBe(global)
  })
})
