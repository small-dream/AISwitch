import { getTarget, listTargets } from '@/adapters/target-registry'
import type { TargetTool, ToolStatus } from '@/domain/entities/preset'

/** 环境探测用例（PRD US-01）：并发探测全部已注册目标工具 */
export async function detectAllTools(): Promise<ToolStatus[]> {
  return Promise.all(listTargets().map((target) => target.detect()))
}

export function detectTool(tool: TargetTool): Promise<ToolStatus> {
  return getTarget(tool).detect()
}
