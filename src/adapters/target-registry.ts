import { AppError } from '@/domain/errors'
import type { TargetTool } from '@/domain/entities/preset'
import type { ConfigTarget } from '@/types/config-target'

const registry = new Map<TargetTool, ConfigTarget>()

/** 新目标工具在自身模块内调用完成注册（如 adapters/gemini/index.ts） */
export function registerTarget(target: ConfigTarget): void {
  registry.set(target.tool, target)
}

export function getTarget(tool: TargetTool): ConfigTarget {
  const target = registry.get(tool)
  if (!target) {
    throw new AppError('E_TARGET_NOT_SUPPORTED', `目标工具未注册: ${tool}`, { tool })
  }
  return target
}

export function listTargets(): ConfigTarget[] {
  return [...registry.values()]
}
