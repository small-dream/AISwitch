import { describe, expect, it } from 'vitest'

import { ProjectConfigRepository } from '@/adapters/projects/project-config-repository'
import { createMemoryFs } from '../../helpers/memory-fs'

const UPDATED_AT = '2026-01-01T00:00:00.000Z'

function record(projectPath: string, tool: 'claude-code' | 'codex') {
  return { projectPath, tool, updatedAt: UPDATED_AT }
}

describe('ProjectConfigRepository', () => {
  it('并发 upsert 两个工具不会丢记录（读-改-写串行）', async () => {
    const repo = new ProjectConfigRepository(createMemoryFs())

    await Promise.all([
      repo.upsert(record('repos/demo', 'claude-code')),
      repo.upsert(record('repos/demo', 'codex')),
    ])

    const records = await repo.list()
    expect(records).toHaveLength(2)
    expect(records.map((item) => item.tool).sort()).toEqual(['claude-code', 'codex'])
  })

  it('同目录同工具重复写入是覆盖而不是追加', async () => {
    const repo = new ProjectConfigRepository(createMemoryFs())

    await repo.upsert(record('repos/demo', 'claude-code'))
    await repo.upsert(record('repos/demo', 'claude-code'))

    expect(await repo.list()).toHaveLength(1)
  })

  it('remove 只删指定工具的记录', async () => {
    const repo = new ProjectConfigRepository(createMemoryFs())
    await repo.upsert(record('repos/demo', 'claude-code'))
    await repo.upsert(record('repos/demo', 'codex'))

    await repo.remove('repos/demo', 'codex')

    expect(await repo.list()).toEqual([record('repos/demo', 'claude-code')])
  })
})
