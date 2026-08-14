# AGENTS.md — AI 协作守则

> 适用于所有在本仓库工作的 AI 编码代理；人类开发者同样受约束。

## 1. 动手前必读

| 场景           | 必读文档                   |
| -------------- | -------------------------- |
| 涉及功能与需求 | `docs/PRD.md`              |
| 涉及结构与分层 | `docs/ARCHITECTURE.md`     |
| 任何代码改动   | `docs/CODING_STANDARDS.md` |

## 2. 红线摘要（违规即返工）

- 单文件 ≤ 300 行；单函数/组件 ≤ 50 行；圈复杂度 ≤ 10（ESLint 强制）；
- 禁止 `any`（显式/隐式）；类型导入一律 `import type`；一律命名导出；
- 组件内禁止直接调用 Tauri API / adapter / service —— 一律经 hooks → services；
- 新功能 = 新增文件（OCP），禁止向既有文件堆砌逻辑。

## 3. 架构口诀

```
UI → hooks → services → domain(纯函数) / adapters(接口实现)
新目标工具 = adapters/<tool>/ 新目录 + registerTarget() 一行注册，既有代码零修改
```

## 4. 完成定义（DoD）

1. `pnpm lint`、`pnpm typecheck`、`pnpm test` 全部通过；
2. 核心逻辑（domain/rules、services、adapters）改动必须同步测试；
3. 功能/结构变化必须回写三文档；
4. 提交遵循 Conventional Commits（如 `feat(adapters): 新增 claude 配置读取器`）。
