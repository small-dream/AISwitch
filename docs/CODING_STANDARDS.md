# AISwitch · 编码规范与防腐化指南（CODING_STANDARDS）

| 项目     | 内容                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 文档版本 | v0.1（Phase 1 基线，已评审确认）                                                       |
| 维护角色 | Tech Lead                                                                              |
| 适用范围 | `src/`、`src-tauri/src/`、`tests/` —— **人类与 AI 代理一律受约束**（AI 协作条款见 §9） |

---

## 1. 铁律总览（红线）

| #   | 红线                         | 阈值                             | 执行手段                               |
| --- | ---------------------------- | -------------------------------- | -------------------------------------- |
| R1  | 单文件 ≤ **300 行**          | skipBlankLines / skipComments    | ESLint `max-lines` error               |
| R2  | 单函数/组件 ≤ **50 行**      | 同上                             | ESLint `max-lines-per-function` error  |
| R3  | 圈复杂度 ≤ **10**            | —                                | ESLint `complexity` error              |
| R4  | **禁止 `any`**（显式与隐式） | —                                | strict + `no-explicit-any` error       |
| R5  | **禁止裸 try-catch / 吞错**  | —                                | Code Review + §6 规则                  |
| R6  | **核心逻辑改动必须同步测试** | domain/rules、services、adapters | §7 强制条款                            |
| R7  | 单一职责：一个文件只做一件事 | —                                | 目录结构物理隔离（见 ARCHITECTURE §3） |

## 2. TypeScript 规范

1. `strict` 全开；`verbatimModuleSyntax` 下类型导入一律 `import type`；
2. 外部输入（文件/IPC/用户输入）一律 `unknown` + Zod 收窄，禁止直接断言；
3. 禁止非空断言 `!`，用显式收窄（`if (!x) throw ...`）；
4. 多态场景用**判别联合**（如 `tool: 'claude-code' | 'codex'`）替代布尔标志位；
5. 魔法字符串一律进 `constants/`（错误码、配置键、路径）；
6. **一律命名导出**；唯一例外是应用入口 `main.tsx`；
7. 禁止 `export default`、禁止 side-effect import（全局样式除外）。

## 3. 命名与文件组织

| 对象          | 约定                        | 示例                     |
| ------------- | --------------------------- | ------------------------ |
| 文件          | kebab-case                  | `target-registry.ts`     |
| React 组件    | PascalCase，文件名 = 组件名 | `PresetCard.tsx`         |
| 自定义 Hook   | `use` 前缀，文件同名        | `useSwitchPreset.ts`     |
| 常量          | SCREAMING_SNAKE             | `ERROR_CODES`            |
| 类型/接口     | 名词，无 `I` 前缀           | `Preset`、`ConfigTarget` |
| Zod Schema    | 小驼峰 + `Schema` 后缀      | `presetSchema`           |
| 布尔变量/属性 | `is/has/should` 前缀        | `isLoading`              |

import 顺序：`node:` 内置 → 框架/三方库 → `@/` 别名 → 相对路径 → 样式；每组之间空一行。

## 4. React 组件规范与拆分公式

**拆分公式**：任何超过 100 行的组件必须拆为——

```text
features/switch-panel/
├── SwitchPanelView.tsx      # 只管渲染（JSX + 样式）
├── useSwitchPanel.ts        # 状态与副作用（可独立测试）
├── switch-panel.utils.ts    # 纯函数（输入输出明确）
└── switch-panel.schema.ts   # Zod 校验
```

**拆分时机三信号**（满足其一立即拆）：

1. 一个文件出现第 2 个 `useState` 主题域；
2. import 数量超过 15 个；
3. 函数内出现第 2 层抽象（回调里再套回调）。

其他规则：

- 函数组件唯一（`ErrorBoundary` 类组件为官方唯一例外）；
- props 显式 interface 且与组件同文件相邻定义；
- 组件内**禁止直接调用 adapter / Tauri API / fetch**，一律经 hooks → services；
- 列表渲染 key 禁止用 index；表单一律受控 + RHF。

## 5. 状态管理规范

| 状态类别                        | 归属地                          | 禁止事项                    |
| ------------------------------- | ------------------------------- | --------------------------- |
| 磁盘/环境数据（预设、探测结果） | TanStack Query + Service        | ❌ 复制进全局 store（双源） |
| 全局 UI 状态（当前 Tab、主题）  | Zustand（按域切片，每片一文件） | ❌ store 里放业务函数       |
| 局部交互/表单状态               | 组件 useState / RHF             | ❌ 局部状态全局化           |

- 数据流向固定单向：`UI → hooks → services → domain/adapters → invalidate Query → UI`；
- 写操作成功后必须 `invalidateQueries` 让服务端状态重新拉取，**禁止手动同步副本**。

## 6. 错误处理规范

统一错误类型（定义于 `src/domain/errors.ts`）：

```ts
new AppError('E_CONFIG_WRITE', '写入 Claude 配置失败', { tool: 'claude-code', path })
```

**错误码分域**（与 `src/constants/error-codes.ts` 保持一致）：

| 前缀                           | 域             | 示例                                                    |
| ------------------------------ | -------------- | ------------------------------------------------------- |
| `E_FS_*`                       | 文件系统       | `E_FS_READ` / `E_FS_WRITE`                              |
| `E_CONFIG_*`                   | 配置解析与写入 | `E_CONFIG_PARSE` / `E_CONFIG_WRITE` / `E_CONFIG_VERIFY` |
| `E_PRESET_*`                   | 预设库         | `E_PRESET_NOT_FOUND` / `E_PRESET_DUPLICATE_NAME`        |
| `E_BACKUP_*` / `E_ROLLBACK_*`  | 备份回滚       | `E_BACKUP_FAILED` / `E_ROLLBACK_FAILED`                 |
| `E_BASELINE_*` / `E_RESTORE_*` | 基线与一键还原 | `E_BASELINE_FAILED` / `E_RESTORE_FAILED`                |
| `E_TARGET_*`                   | 目标工具       | `E_TARGET_NOT_SUPPORTED`                                |
| `E_NETWORK_*`                  | 连通性测试     | `E_NETWORK_TEST_FAILED`                                 |
| `E_VALIDATION_*` / `E_UNKNOWN` | 校验 / 兜底    | `E_VALIDATION_FAILED`                                   |

分层职责：**Adapter 抛**（携带上下文）→ **Service 包装**（决定流程：回滚/中止）→ **UI 统一拦截**（ErrorBoundary + Toast）。组件与 hooks 内禁止裸 `try-catch` 后什么都不做；异步调用必须有失败分支处理。

## 7. 测试规范

- 目录 `tests/` 镜像 `src/` 结构；命名 `<unit>.test.ts(x)`；
- 结构 AAA（Arrange / Act / Assert），`describe` = 被测单元，`it` = 一句中文行为描述；
- 纯函数零 mock；adapter 经 `FileSystemPort` 注入内存替身；
- 覆盖率要求：`domain/rules` 与 `services` ≥ 90%；adapters 用 `tests/fixtures/` golden-file 快照全覆盖；
- **AI 协作强制条款**：任何对核心逻辑（rules / services / adapters）的修改，必须同步新增或更新测试；`pnpm test` 不通过视为任务未完成。

## 8. Git 与提交规范

- Conventional Commits：`feat | fix | docs | refactor | test | chore`，subject、body 和 breaking-change footer 一律使用英文；
  - Examples: `feat(adapters): add Claude config reader`, `fix(services): roll back failed switches correctly`
- 小步提交：一个提交只做一件事；禁止「顺手」混入无关改动。

## 9. AI 协作工作流（Definition of Done）

任何 AI 代理在本仓库实施改动，必须按以下顺序：

1. **先读文档**：改动涉及功能 → 读 `docs/PRD.md`；涉及结构 → 读 `docs/ARCHITECTURE.md`；
2. **新功能优先新增文件**（OCP）：新增 adapter / schema / 组件文件，而非堆砌既有文件；
3. **类型先行**：先定义 Zod Schema / interface，再写实现；
4. **实现最小化**：遵守红线 R1–R7；
5. **测试同步**（R6）；
6. **全绿验证**：`pnpm lint && pnpm typecheck && pnpm test` 全部通过；
7. **文档同步**：功能或结构变化必须回写三文档；
8. **规范提交**（§8）。

## 10. 工具链配置索引

| 工具       | 配置文件                                | 说明                                           |
| ---------- | --------------------------------------- | ---------------------------------------------- |
| TypeScript | `tsconfig.json`（引用 app/node 两工程） | strict 全开、`@/*` 路径别名                    |
| Vite       | `vite.config.ts`                        | 端口 1420（Tauri 约定）、Vitest 配置内联       |
| ESLint     | `eslint.config.js`（flat）              | typescript-eslint strictTypeChecked + 红线规则 |
| Prettier   | `.prettierrc`                           | 无分号、单引号、行宽 100                       |
| Vitest     | `vite.config.ts` 内 `test` 字段         | jsdom 环境、`tests/` 收集                      |
