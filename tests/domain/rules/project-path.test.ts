import { describe, expect, it } from 'vitest'

import {
  absoluteProjectDir,
  normalizeProjectPath,
  projectConfigPath,
} from '@/domain/rules/project-path'
import { effectiveToolStatus } from '@/domain/entities/project-config'

describe('project path rules', () => {
  it('规范化 HOME 相对目录并生成配置路径', () => {
    expect(normalizeProjectPath('work\\\\repo/')).toBe('work/repo')
    expect(projectConfigPath('work/repo', '.claude/settings.json')).toBe(
      'work/repo/.claude/settings.json'
    )
  })

  it('拒绝绝对路径和路径逃逸', () => {
    expect(() => normalizeProjectPath('/tmp/repo')).toThrow('HOME')
    expect(() => normalizeProjectPath('../repo')).toThrow('..')
  })

  it('项目已配置时优先于全局状态', () => {
    const project = {
      tool: 'claude-code' as const,
      status: 'installed' as const,
      activeModel: 'project',
    }
    const global = {
      tool: 'claude-code' as const,
      status: 'installed' as const,
      activeModel: 'global',
    }
    expect(effectiveToolStatus(project, global)?.activeModel).toBe('project')
    expect(effectiveToolStatus({ tool: 'claude-code', status: 'not-configured' }, global)).toBe(
      global
    )
  })
})

describe('absoluteProjectDir · 记录到授权路径', () => {
  it('拼接主目录并统一正斜杠（容忍 home 尾斜杠与反斜杠）', () => {
    expect(absoluteProjectDir('/Users/jake', 'repos/demo')).toBe('/Users/jake/repos/demo')
    expect(absoluteProjectDir('C:\\Users\\jake\\', 'repos\\demo')).toBe('C:/Users/jake/repos/demo')
  })

  it('篡改记录（绝对路径 / .. 逃逸 / 空 / 主目录本身）一律不授权', () => {
    expect(absoluteProjectDir('/Users/jake', '/etc/passwd')).toBeNull()
    expect(absoluteProjectDir('/Users/jake', '../../etc')).toBeNull()
    expect(absoluteProjectDir('/Users/jake', 'C:/Windows')).toBeNull()
    expect(absoluteProjectDir('/Users/jake', '')).toBeNull()
    expect(absoluteProjectDir('/Users/jake', '.')).toBeNull()
  })
})
