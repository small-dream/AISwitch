import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RestorePlan, RestoreResult } from '@/services/restore-service'
import { RestoreDialog } from '@/ui/features/restore/RestoreDialog'

function makePlan(): RestorePlan {
  return {
    hasBaseline: true,
    files: [
      {
        tool: 'claude-code',
        file: '.claude/settings.json',
        action: 'restore-baseline',
        approximate: false,
      },
    ],
  }
}

function makeResult(): RestoreResult {
  return { allSucceeded: true, results: [{ file: '.claude/settings.json', status: 'done' }] }
}

const state = vi.hoisted((): { plan: RestorePlan; result: RestoreResult } => {
  const plan: RestorePlan = {
    hasBaseline: true,
    files: [
      {
        tool: 'claude-code',
        file: '.claude/settings.json',
        action: 'restore-baseline',
        approximate: false,
      },
    ],
  }
  const result: RestoreResult = {
    allSucceeded: true,
    results: [{ file: '.claude/settings.json', status: 'done' }],
  }
  return { plan, result }
})

vi.mock('@/hooks/use-restore', () => ({
  useRestorePlan: () => ({
    data: state.plan,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useExecuteRestore: () => ({
    isPending: false,
    mutate: (_input: undefined, options?: { onSuccess?: (result: RestoreResult) => void }) => {
      options?.onSuccess?.(state.result)
    },
  }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function enterConfirmAndSubmit() {
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('输入还原以确认'), { target: { value: '还原' } })
  fireEvent.click(screen.getByRole('button', { name: '确认还原' }))
}

describe('RestoreDialog 三步状态机', () => {
  beforeEach(() => {
    state.plan = makePlan()
    state.result = makeResult()
  })

  it('预览动作 → 输入「还原」确认 → 结果闭环', () => {
    render(<RestoreDialog onClose={vi.fn()} />)

    expect(screen.getByText('还原为安装前内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    const confirm = screen.getByRole('button', { name: '确认还原' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('输入还原以确认'), { target: { value: '还原' } })
    expect(confirm).not.toBeDisabled()
    fireEvent.click(confirm)

    expect(screen.getByText('已还原到安装 AISwitch 之前的状态。')).toBeInTheDocument()
    expect(screen.getByText('settings.json')).toBeInTheDocument()
  })
})

describe('RestoreDialog 预览守卫', () => {
  beforeEach(() => {
    state.plan = makePlan()
  })

  it('无可还原配置 → 空态提示并禁用下一步', () => {
    state.plan = {
      hasBaseline: true,
      files: [
        {
          tool: 'claude-code',
          file: '.claude/settings.json',
          action: 'keep',
          approximate: false,
        },
      ],
    }
    render(<RestoreDialog onClose={vi.fn()} />)

    expect(
      screen.getByText('没有需要还原的配置，你的工具配置已是未安装 AISwitch 时的状态。')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('无基线时如实提示近似还原', () => {
    state.plan = {
      hasBaseline: false,
      files: [
        {
          tool: 'codex',
          file: '.codex/config.toml',
          action: 'strip-managed-keys',
          approximate: true,
        },
      ],
    }
    render(<RestoreDialog onClose={vi.fn()} />)

    expect(screen.getByText('未检测到安装前基线，将尽力近似还原')).toBeInTheDocument()
    expect(screen.getByText('清除 AISwitch 写入的键')).toBeInTheDocument()
  })
})

describe('RestoreDialog 结果反馈', () => {
  beforeEach(() => {
    state.plan = makePlan()
    state.result = makeResult()
  })

  it('跳过项如实展示原因', () => {
    state.result = {
      allSucceeded: true,
      results: [
        { file: '.claude/settings.json', status: 'skipped', detail: '文件已不存在，已跳过' },
      ],
    }
    render(<RestoreDialog onClose={vi.fn()} />)
    enterConfirmAndSubmit()

    expect(screen.getByText('文件已不存在，已跳过')).toBeInTheDocument()
  })

  it('部分失败时展示失败详情', () => {
    state.result = {
      allSucceeded: false,
      results: [{ file: '.claude/settings.json', status: 'failed', detail: 'EACCES' }],
    }
    render(<RestoreDialog onClose={vi.fn()} />)
    enterConfirmAndSubmit()

    expect(screen.getByText('部分文件未能还原，详情如下：')).toBeInTheDocument()
    expect(screen.getByText('EACCES')).toBeInTheDocument()
  })
})
