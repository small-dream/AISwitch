/**
 * 中文词典（源头事实）：key 变更须同步 en.ts，缺英文词条会在编译期报错。
 */
export const zhCN = {
  // 通用
  'common.cancel': '取消',
  'common.save': '保存',
  'common.saving': '保存中…',
  'common.close': '关闭',
  'common.next': '下一步',
  'common.back': '返回',
  'common.loading': '加载中…',
  'common.delete': '删除',
  'common.restore': '恢复',
  'common.edit': '编辑',
  'common.unknownError': '发生未知错误',

  // 标题栏
  'header.toggleTheme': '切换主题',
  'header.toggleLang': '切换语言',
  'shortcut.noPresetToSwitch': '没有可切换的其他预设',
  'shortcut.switchedTo': '已切换到 {name}',
  'template.pickerLabel': '从供应商模板填充',
  'template.placeholder': '选择模板…',
  'template.local': '本地模型',
  'presetRow.localModel': '本地模型 · 无需 Key',
  'update.available': '更新到 v{version}',
  'update.ready': '新版本已下载，点击立即更新',
  'update.installing': '更新中…',
  'update.installFailed': '更新失败，请稍后重试',
  'scope.label': '配置作用域',
  'scope.global': '全局',
  'scope.project': '项目',
  'project.title': '项目级配置',
  'project.priority': '项目配置优先于全局配置；目录填写 HOME 下的相对路径，不会改写全局配置。',
  'project.directory': '项目目录',
  'project.directoryPlaceholder': '例如：work/my-repo',
  'project.chooseDirectory': '选择项目目录',
  'project.choosingDirectory': '正在打开目录选择器…',
  'project.changeDirectory': '更换',
  'project.preset': '项目预设',
  'project.apply': '写入项目',
  'project.applying': '写入中…',
  'project.active': '已检测到项目级配置，将覆盖全局配置。',
  'project.failed': '写入失败：',
  'project.records': '已写入项目',
  'project.remove': '移除配置',
  'project.confirmRemove': '再次点击确认移除',
  'project.removing': '移除中…',

  // 错误边界
  'errorBoundary.title': '界面出现异常',
  'errorBoundary.reload': '重新加载',

  // 密钥输入
  'password.show': '显示密钥',
  'password.hide': '隐藏密钥',

  // 模型预设面板
  'switchPanel.title': '模型预设',
  'switchPanel.importCurrent': '导入当前配置',
  'switchPanel.importing': '导入中…',
  'switchPanel.createPreset': '新建预设',
  'presetList.emptyTitle': '暂无预设',
  'presetList.emptyDescription': '点击右上角「新建预设」，创建第一个可复用的模型配置档案',

  // 预设行
  'presetRow.active': '当前',
  'presetRow.test': '测试',
  'presetRow.testing': '测试中…',
  'presetRow.apply': '应用',
  'presetRow.applying': '切换中…',
  'presetRow.confirmDelete': '确认删除?',
  'presetRow.deleted': '预设已删除',
  'presetRow.duplicate': '复制',
  'presetRow.switchedTo': '已切换到 {name}',
  'connectivity.ok': '连通正常（{latency}ms）',
  'connectivity.invalidKey': 'API Key 无效或无权限',
  'connectivity.unreachable': '无法连通',
  'connectivity.unsupported': '该供应商不支持探测，请直接切换验证',

  // 工具状态卡
  'status.installed': '已配置',
  'status.notConfigured': '未检测到配置',
  'status.unknown': '状态未知',
  'status.vscodeDetected': '检测到 VS Code 插件，切换后即可生效',
  'status.firstSwitchHint': '首次切换将自动创建全局配置，VS Code 插件方式使用同样生效',

  // 备份管理
  'backups.manage': '备份管理',
  'backups.restoreLatest': '恢复最近一份备份',
  'backups.restoredEntry': '已恢复 {name}',
  'backups.restoredLatest': '已恢复最近一份备份',
  'backups.noneAvailable': '没有可用备份',
  'backups.empty': '暂无备份',

  // 一键还原
  'restore.buttonTitle': '一键还原到安装前',
  'restore.dialogTitle': '一键还原到安装前',
  'restore.warning':
    '将把 Claude Code 与 Codex CLI 的配置恢复到安装 AISwitch 之前的状态，操作不可撤销。你的预设、密钥与备份会保留在 ~/.aiswitch 中，不受影响。',
  'restore.analyzing': '正在分析配置…',
  'restore.baselineFound': '已检测到安装前基线，可精确还原',
  'restore.baselineMissing': '未检测到安装前基线，将尽力近似还原',
  'restore.nothingToDo': '没有需要还原的配置，你的工具配置已是未安装 AISwitch 时的状态。',
  'restore.confirmPromptPrefix': '请输入',
  'restore.confirmPromptSuffix': '以确认执行：',
  'restore.confirmWord': '还原',
  'restore.confirmAria': '输入{word}以确认',
  'restore.confirmButton': '确认还原',
  'restore.confirming': '正在还原…',
  'restore.successToast': '已还原到安装 AISwitch 之前的状态',
  'restore.partialToast': '部分文件未能还原，请在结果中查看详情',
  'restore.resultSuccess': '已还原到安装 AISwitch 之前的状态。',
  'restore.resultPartial': '部分文件未能还原，详情如下：',
  'restore.action.restoreBaseline': '还原为安装前内容',
  'restore.action.restoreEarliestBackup': '还原为最早备份（近似）',
  'restore.action.stripManagedKeys': '清除 AISwitch 写入的键',
  'restore.action.delete': '删除（安装前不存在）',
  'restore.action.keep': '跳过',

  // 预设表单
  'presetForm.title.edit': '编辑预设',
  'presetForm.title.import': '导入配置为预设',
  'presetForm.title.duplicate': '复制预设',
  'presetForm.title.create': '新建预设',
  'presetForm.targetTool': '目标工具',
  'presetForm.name': '预设名称',
  'presetForm.namePlaceholder': '如：GLM-4.6',
  'presetForm.provider': '供应商名称',
  'presetForm.providerPlaceholder': '如：智谱 GLM',
  'presetForm.baseUrl': 'Base URL（留空 = 官方 API）',
  'presetForm.model': '模型名',
  'presetForm.modelPlaceholder': '如：glm-4.6',
  'presetForm.smallFast': '小模型 ANTHROPIC_SMALL_FAST_MODEL（可选）',
  'presetForm.smallFastPlaceholder': '如：glm-4.6-air',
  'presetForm.metadataSectionTitle': '高级：模型目录条目（可选，仅 Codex 第三方模型需要）',
  'presetForm.metadataHint':
    '粘贴厂商提供的单条条目，或整份 models.json 文件（原样保存，切换后同族模型都出现在 Codex 选单）。Codex 依靠它获取上下文窗口等模型元数据；留空则回落内置目录。需包含与模型名一致的条目（slug 缺失时保存自动补齐）。',
  'presetForm.metadataLabel': '模型元数据 JSON',
  'presetForm.draftKeyNotice':
    '已从本机配置读取 API Key，保存后将写入 ~/.aiswitch/presets.json（仅当前用户可读）。',
  'presetForm.duplicateKeyNotice':
    '已复制原预设的 API Key，保存后将写入 ~/.aiswitch/presets.json（仅当前用户可读）。',
  'presetForm.updated': '预设已更新',
  'presetForm.created': '预设已创建',

  // 组合切换
  'bundle.title': '组合切换',
  'bundle.title.create': '新建组合',
  'bundle.title.edit': '编辑组合',
  'bundle.create': '新建组合',
  'bundle.empty': '暂无组合预设。创建组合后可一键切换 Claude Code 与 Codex CLI',
  'bundle.name': '组合名称',
  'bundle.namePlaceholder': '如：全家 GLM 省钱方案',
  'bundle.noSwitch': '不切换',
  'bundle.apply': '应用',
  'bundle.switching': '切换中…',
  'bundle.atLeastOne': '请至少选择一个工具的预设',
  'bundle.confirmDelete': '确认删除该组合?',
  'bundle.deleted': '组合已删除',
  'bundle.created': '组合已创建',
  'bundle.updated': '组合已更新',
  'bundle.switchedAll': '已切换 {name}（{count} 个工具）',
  'bundle.switchFailed': '{tool} 切换失败，请查看详情',

  // 表单校验（Zod）
  'validation.urlInvalid': '请输入合法 URL 或留空',
  'validation.urlScheme': '仅支持 https 地址；http 仅允许本机回环（localhost / 127.0.0.1 / [::1]）',
  'validation.nameRequired': '请填写预设名称',
  'validation.providerRequired': '请填写供应商名称',
  'validation.apiKeyRequired': '请填写 API Key',
  'validation.modelRequired': '请填写模型名',
  'validation.maxLength': '最多 100 字符',

  // 模型元数据解析
  'metadata.notJson': '不是合法 JSON',
  'metadata.notObject': '须为 JSON 对象(单条条目或整份 models.json 文件)',
  'metadata.noMatch': '按整份文件解析,但未找到与模型名「{model}」匹配的条目',
  'metadata.slugMismatch':
    '条目 slug「{slug}」须与模型名「{model}」一致(或删除 slug 字段,保存时自动补齐)',

  // 托盘 / 桌面通知
  'tray.presetFallback': '预设',
  'tray.switchedTo': '已切换到 {name}',
  'tray.switchFailed': '切换失败：{message}',
  'tray.showMain': '显示主窗口',
  'tray.quit': '退出',
  'tray.noPresets': '暂无预设',
  'tray.tooltip': 'AISwitch · 点击菜单快捷切换模型',
} as const

export type TranslationKey = keyof typeof zhCN
