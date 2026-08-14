# JakeAITools

> 跨平台（Windows / macOS / Linux）桌面工具：一键切换 Claude Code 与 Codex CLI 的全局模型/供应商配置，告别手工编辑配置文件。

## 文档（三文档驱动）

- [docs/PRD.md](docs/PRD.md) —— 产品需求
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 架构与选型
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) —— 编码规范与防腐化红线

## 技术栈

Tauri 2（Rust 薄壳）· React 19 · TypeScript(strict) · Vite · Tailwind CSS v4 · Zustand · TanStack Query · Zod · Vitest

## 环境要求

| 项   | 要求                             |
| ---- | -------------------------------- |
| Node | ≥ 20（推荐 24 LTS）              |
| Rust | ≥ 1.82（Windows 需 MSVC 工具链） |

## 常用命令

```bash
pnpm install      # 安装依赖（包管理器：pnpm）
pnpm desktop:run  # 桌面应用开发模式（跨平台）
pnpm desktop:build # 编译桌面 Release 二进制（不打包安装器，速度快）
pnpm desktop:bundle # 打包各平台安装器（msi/nsis · dmg/app · deb/appimage）
pnpm dev          # 纯前端开发调试（浏览器）
pnpm test         # 单元测试
pnpm lint         # ESLint（含 300 行 / 50 行红线）
pnpm typecheck    # TypeScript 严格检查
pnpm icon         # 重新生成应用图标（scripts/app-icon.png → src-tauri/icons）
```

## 目录导览

详见 [docs/ARCHITECTURE.md §3](docs/ARCHITECTURE.md)。核心分层：
`src/ui`（渲染）→ `src/hooks`（交互）→ `src/services`（用例）→ `src/domain`（纯逻辑）+ `src/adapters`（基础设施，策略模式按工具解耦）。
