import type { TargetTool, ToolStatus } from '@/domain/entities/preset'

/** 项目配置作用域：路径相对用户 HOME，避免跨平台绝对路径差异。 */
export interface ProjectConfigTarget {
  projectPath: string
  tool: TargetTool
}

/** 项目配置优先于全局配置；项目未配置时回退全局。 */
export function effectiveToolStatus(
  projectStatus: ToolStatus | undefined,
  globalStatus: ToolStatus | undefined
): ToolStatus | undefined {
  if (projectStatus && projectStatus.status !== 'not-configured') {
    return projectStatus
  }
  return globalStatus
}
