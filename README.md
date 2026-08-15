<div align="center">

# AISwitch

**One-click model & provider switching for [Claude Code](https://claude.com/claude-code) and [Codex CLI](https://github.com/openai/codex).**

No more hand-editing `~/.claude/settings.json` or `~/.codex/config.toml`.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#development)

English | [简体中文](./README.zh-CN.md)

</div>

---

## Why

If you switch between the official API and third-party providers (GLM, DeepSeek, Kimi, relay endpoints, …) while coding with Claude Code or Codex CLI, you probably do this several times a day:

1. Open `~/.claude/settings.json` / `~/.codex/config.toml` + `auth.json`
2. Paste a long API key, fix the base URL, pick the model name
3. Hope you didn't break the JSON/TOML

AISwitch turns that into a single click — with validation, backups, and instant rollback.

## Features

- 🔍 **Auto-detection** — on launch, reads the global config of Claude Code & Codex CLI and shows the currently active provider/model for each (no dependency on CLI being on `PATH`).
- 🗂 **Presets** — save reusable provider profiles (Base URL + API Key + model names). Keys are masked by default; delete requires confirmation; names are unique per tool.
- ⚡ **One-click switch** — writes the target config via temp-file + atomic replace, reads it back to verify, typically under 1 second.
- 🔙 **Automatic backup & rollback** — every write is preceded by a backup; failed writes roll back automatically; restore the latest backup in one click.
- 🧩 **Codex `models.json` hosting** — paste a single entry or a whole `models.json`; the file is stored verbatim and family models all appear in the picker. `display_name` is auto-filled when missing.
- 🖥 **Tray menu** — switch presets straight from the system tray; the active preset is check-marked.

## Tech Stack

Tauri 2 (thin Rust shell) · React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Zustand · TanStack Query · Zod · Vitest

## Development

### Prerequisites

| Item | Requirement                                 |
| ---- | ------------------------------------------- |
| Node | ≥ 20 (24 LTS recommended)                   |
| Rust | ≥ 1.82 (MSVC toolchain required on Windows) |

### Common commands

```bash
pnpm install        # install dependencies (package manager: pnpm)
pnpm desktop:run    # run the desktop app in dev mode
pnpm desktop:build  # compile a Release binary (no installer, fast)
pnpm desktop:bundle # bundle installers (msi/nsis · dmg/app · deb/appimage)
pnpm dev            # frontend-only dev in the browser
pnpm test           # unit tests
pnpm lint           # ESLint (incl. 300-line / 50-line hard limits)
pnpm typecheck      # strict TypeScript check
pnpm icon           # regenerate app icons (scripts/app-icon.png → src-tauri/icons)
```

## Project Structure

Layered for testability — UI never touches the filesystem directly:

```text
src/ui        → rendering (React components)
src/hooks     → interaction
src/services  → use cases
src/domain    → pure logic (fully unit-tested)
src/adapters  → infrastructure (strategy pattern, one adapter per target CLI)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full tour.

## Documentation

- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture & design decisions
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) — coding standards & anti-rot rules

## Contributing

Issues and PRs are welcome. For non-trivial changes, please open an issue first to discuss what you'd like to change, and make sure `pnpm lint && pnpm typecheck && pnpm test` passes.

## License

[MIT](./LICENSE) © small-dream
