<div align="center">

# AISwitch

**一键切换 [Claude Code](https://claude.com/claude-code) 与 [Codex CLI](https://github.com/openai/codex) 的全局模型 / 供应商配置。**

从此告别手工编辑 `~/.claude/settings.json` 和 `~/.codex/config.toml`。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#开发)

[English](./README.md) | 简体中文

</div>

---

## 为什么需要它

如果你在用 Claude Code / Codex CLI 写代码，并且经常在官方 API 与第三方供应商（GLM、DeepSeek、Kimi、各类中转站……）之间来回切，大概率每天都得：

1. 打开 `~/.claude/settings.json` / `~/.codex/config.toml` + `auth.json`
2. 粘贴长长的 API Key、改 Base URL、找模型名
3. 祈祷没把 JSON / TOML 改坏

AISwitch 把这一切变成一次点击——自带校验、备份与秒级回滚。

## 核心亮点

- 🔒 **隐私优先** —— 100% 本地运行。无账号、无云端、无遥测、无统计。你的 API Key 只保存在自己磁盘的 `~/.aiswitch/` 里，除你明确配置的供应商端点外不会发往任何地方。
- 🛡 **安全加固** —— 严格 CSP、移除未使用的 shell / dialog 插件、所有含 Key 文件仅限所有者访问（0600/0700）、连通性探测仅允许 HTTPS（明文 HTTP 仅限回环地址）、Key 在界面上始终遮蔽显示。
- 🎯 **功能专一** —— AISwitch 只做一件事：读写 Claude Code 与 Codex CLI 的配置文件。不做代理、不记录请求、不在你和供应商之间增加任何中间层。卸载后你的 CLI 恢复原样——这本身就是一项功能，见[一键还原](#功能特性)。

## 功能特性

- 🔍 **自动探测** —— 启动即读取 Claude Code / Codex 的全局配置，展示各自当前生效的供应商与模型（不依赖终端 CLI 是否在 `PATH` 上，VS Code 插件形态使用同样正确）。
- 🗂 **预设管理** —— 保存可复用的供应商档案（Base URL + API Key + 模型名）。Key 默认遮蔽显示；删除需二次确认；同一工具内预设名唯一。
- ⚡ **一键切换** —— 临时文件 + 原子替换写入配置，写后回读校验生效，全程通常 ≤ 1 秒。
- 🔙 **自动备份与回滚** —— 每次写入前自动备份；写入失败自动回滚并提示错误详情；任意一份备份都可一键恢复。
- ♻️ **一键还原到安装前状态** —— 首次切换前自动捕获配置基线；三步对话框（预览 → 确认 → 逐文件结果报告）把每个文件精确还原到安装前，或干净地删除 AISwitch 创建的内容。绝不触碰用户自有文件与预设数据。
- 🧪 **连通性测试** —— 切换前即可探测预设端点是否可用（强制 HTTPS；明文 HTTP 仅限 `localhost` / `127.0.0.1` / `[::1]`，Key 永远不会以明文形式出网）。
- 🧩 **Codex models.json 托管** —— 支持粘贴单条条目或整份 models.json，文件原样保存、同族模型都进选单；`display_name` 缺失时自动补齐。
- 🖥 **托盘菜单** —— 在系统托盘直接切换预设，当前生效的预设带勾选标识。
- 🌐 **中英双语界面** —— 默认跟随系统语言，顶栏一键切换。
- 🌗 **明暗双主题** —— 语义化 token 主题，一键切换。

## 隐私与安全

AISwitch 经手你的 API Key，因此对自己要求更严：

| 层面 | 承诺 |
| ---- | ---- |
| 数据 | 一切都在你的机器上（`~/.aiswitch/`）。无账号、无同步、无遥测——没有可被钓鱼或拖库的数据。 |
| 文件系统 | 含 Key 的文件（`presets.json`、备份、基线）全部限制为仅所有者可读（0600/0700）；原子写入的临时文件在重命名**之前**就先行限权，崩溃残留也不会泄露密钥；读取时还会顺手收紧历史遗留的宽松权限。 |
| 网络 | 唯一的外发请求是你主动触发的连通性探测，且只允许 `https://`（或回环地址上的明文 HTTP）——保存与探测共用同一条校验规则。无代理、无请求拦截。 |
| 应用 | 严格 CSP（`script-src 'self'` + nonce、`object-src 'none'`、`connect-src` 仅限 IPC）；移除了未使用的 shell / dialog 插件以缩小攻击面。 |
| 界面 | Key 始终遮蔽显示——即使是短 Key 也完全隐藏，绝不部分露出。 |

## 技术栈

Tauri 2（Rust 薄壳）· React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Zustand · TanStack Query · Zod · Vitest

## 开发

### 环境要求

| 项   | 要求                             |
| ---- | -------------------------------- |
| Node | ≥ 20（推荐 24 LTS）              |
| Rust | ≥ 1.82（Windows 需 MSVC 工具链） |

### 常用命令

```bash
pnpm install        # 安装依赖（包管理器：pnpm）
pnpm desktop:run    # 桌面应用开发模式
pnpm desktop:build  # 编译 Release 二进制（不打包安装器，速度快）
pnpm desktop:bundle # 打包各平台安装器（msi/nsis · dmg/app · deb/appimage）
pnpm dev            # 纯前端开发调试（浏览器）
pnpm test           # 单元测试
pnpm lint           # ESLint（含 300 行 / 50 行红线）
pnpm typecheck      # TypeScript 严格检查
pnpm icon           # 重新生成应用图标（scripts/app-icon.png → src-tauri/icons）
```

### 发布（GitHub Actions）

1. 同步更新 `package.json` 与 `src-tauri/tauri.conf.json` 的 `version`
2. 提交后打标签并推送：`git tag vX.Y.Z && git push origin vX.Y.Z`
3. [Release workflow](.github/workflows/release.yml) 自动构建全平台安装包（macOS 双架构 · Windows msi/nsis · Linux deb/appimage）并上传到**草稿** GitHub Release——核对无误后手动发布

每次 push / PR 还会跑 [CI workflow](.github/workflows/ci.yml)：lint / 类型检查 / 测试，外加 macOS、Windows、Linux 三平台的 `cargo check` 矩阵（平台条件代码无法在单一开发机上完全验证）。安装包当前未签名——首次启动可能遇到 Gatekeeper / SmartScreen 提示。

## 目录结构

为可测试性而分层——UI 永远不直接碰文件系统：

```text
src/ui        → 渲染（React 组件）
src/hooks     → 交互
src/services  → 用例
src/domain    → 纯逻辑（100% 单测覆盖）
src/adapters  → 基础设施（策略模式，每个目标 CLI 一个适配器）
```

完整导览见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 文档

- [docs/PRD.md](docs/PRD.md) —— 产品需求
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 架构与选型
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) —— 编码规范与防腐化红线

## 参与贡献

欢迎 Issue 与 PR。非小幅改动请先开 Issue 讨论；提 PR 前请确保 `pnpm lint && pnpm typecheck && pnpm test` 通过。

## 许可证

[MIT](./LICENSE) © small-dream
