import type { TargetTool } from '@/domain/entities/preset'

/** VS Code 插件安装迹象（PRD US-14）：仅用于增强提示，不影响任何功能判断 */
export type VscodePresence = Record<TargetTool, boolean>
