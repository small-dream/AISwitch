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

## 功能特性

- 🔍 **自动探测** —— 启动即读取 Claude Code / Codex 的全局配置，展示各自当前生效的供应商与模型（不依赖终端 CLI 是否在 `PATH` 上，VS Code 插件形态使用同样正确）。
- 🗂 **预设管理** —— 保存可复用的供应商档案（Base URL + API Key + 模型名）。Key 默认遮蔽显示；删除需二次确认；同一工具内预设名唯一。
- ⚡ **一键切换** —— 临时文件 + 原子替换写入配置，写后回读校验生效，全程通常 ≤ 1 秒。
- 🔙 **自动备份与回滚** —— 每次写入前自动备份；写入失败自动回滚并提示错误详情；可一键恢复最近一份备份。
- 🧩 **Codex models.json 托管** —— 支持粘贴单条条目或整份 models.json，文件原样保存、同族模型都进选单；`display_name` 缺失时自动补齐。
- 🖥 **托盘菜单** —— 在系统托盘直接切换预设，当前生效的预设带勾选标识。

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
