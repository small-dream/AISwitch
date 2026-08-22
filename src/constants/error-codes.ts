/**
 * 统一错误码（分域）。
 * 业务含义详见 docs/CODING_STANDARDS.md §6；本文件是唯一事实来源。
 */
export const ERROR_CODES = [
  // 文件系统域
  'E_FS_READ',
  'E_FS_WRITE',
  'E_FS_PERMISSION',
  // 配置解析与写入域
  'E_CONFIG_PARSE',
  'E_CONFIG_WRITE',
  'E_CONFIG_VERIFY',
  // 预设库域
  'E_PRESET_NOT_FOUND',
  'E_PRESET_DUPLICATE_NAME',
  // 备份与回滚域
  'E_BACKUP_FAILED',
  'E_ROLLBACK_FAILED',
  'E_BASELINE_FAILED',
  'E_RESTORE_FAILED',
  // 目标工具域
  'E_TARGET_NOT_SUPPORTED',
  // 连通性测试域
  'E_NETWORK_TEST_FAILED',
  // 应用更新域
  'E_UPDATE_CHECK',
  'E_UPDATE_DOWNLOAD',
  'E_UPDATE_INSTALL',
  // 校验与兜底
  'E_VALIDATION_FAILED',
  'E_UNKNOWN',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]
