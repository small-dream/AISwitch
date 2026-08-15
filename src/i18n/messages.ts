import { useLocaleStore } from './locale-store'

/**
 * 运行时消息本地化：服务层/适配器仍以中文 message 作为传输与兜底（零改动），
 * UI 边界按「消息原文 → 英文」映射翻译；未收录的消息原样返回。
 * 新增 AppError / 还原 detail 文案时须在此补一条英文映射。
 */
const EN_MESSAGES: Record<string, string> = {
  // 适配器：配置解析
  'Claude 配置不是合法 JSON': 'Claude config is not valid JSON',
  'Claude 配置结构不符合预期': 'Claude config has an unexpected structure',
  'Codex 配置不是合法 TOML': 'Codex config is not valid TOML',
  'Codex 配置结构不符合预期': 'Codex config has an unexpected structure',
  'Codex auth.json 不是合法 JSON': 'Codex auth.json is not valid JSON',
  'Codex models.json 不是合法 JSON': 'Codex models.json is not valid JSON',
  '预设库文件不是合法 JSON': 'Preset store file is not valid JSON',
  预设库结构校验失败: 'Preset store file failed validation',
  // 适配器：基线 / 权限 / 写入
  基线清单解析失败: 'Failed to parse the baseline manifest',
  '受管文件清单为空，无法捕获基线': 'Managed file list is empty; cannot capture baseline',
  文件权限收紧失败: 'Failed to restrict file permissions',
  写入文件失败: 'Failed to write file',
  // 服务 / 领域规则
  预设不存在: 'Preset not found',
  同一工具下已存在同名预设: 'A preset with this name already exists for this tool',
  预设与目标工具不匹配: 'Preset does not match the target tool',
  '切换后回读校验失败，已自动回滚': 'Post-switch verification failed; rolled back automatically',
  '元数据条目 slug 与预设模型不一致': 'Metadata entry slug does not match the preset model',
  '模型元数据必须是 JSON 对象': 'Model metadata must be a JSON object',
  '模型元数据是整份目录文件，但其中没有与模型名匹配的条目':
    'Model metadata is a full catalog file, but contains no entry matching the model name',
  '未检测到可导入的配置（无已知字段）': 'No importable config detected (no known fields)',
  // 还原
  还原文件失败: 'Failed to restore file',
  该文件不支持剥离托管键: 'This file does not support stripping managed keys',
  无需处理: 'Nothing to do',
  '基线副本缺失，已跳过': 'Baseline copy missing; skipped',
  '备份已不可用，已跳过': 'Backup no longer available; skipped',
  '文件已不存在，已跳过': 'File no longer exists; skipped',
  '文件已不存在，无需剥离': 'File no longer exists; nothing to strip',
  // 兜底
  发生未知错误: 'An unknown error occurred',
}

/** 已知运行时消息的本地化；中文直接透传，英文查表，未收录原样返回 */
export function localizeMessage(message: string): string {
  if (useLocaleStore.getState().locale !== 'en') {
    return message
  }
  return EN_MESSAGES[message] ?? message
}
