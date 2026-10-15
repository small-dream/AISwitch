# Changelog

All notable changes are documented here. Every release must add a version section before its tag is pushed.

## [0.1.22] - 2026-10-15

### Fixed

- The subscription login popover is no longer covered by the preset row below it: the row entrance animation used `animation-fill-mode: both`, so its final `translateY(0)` stayed on every row and turned each `<li>` into a stacking context. A later row then painted over the earlier row's `z-20` popover, and since the active row's background is translucent the covered text looked like it bled through. The fill mode is gone, so rows fall back to `transform: none` once the animation ends, with no change to how the animation looks.

## [0.1.21] - 2026-10-15

### Changed

- The whole repository is now Prettier-clean and CI enforces it (`pnpm format:check`, also part of the definition of done). Prettier wrapping pushed six functions past the 50-line rule, so they were factored to fit again with no behavior change: `ProjectConfigService.remove` splits into per-tool methods, `ProjectDirectoryPicker` and `ProjectToolConfigSection` each extract a sub-component, and three test files were split.
- The subscription login guide is no longer an always-on notice above the preset list: it now hangs off the login-state badge in the built-in subscription row (`SubscriptionStatusBadge` + `SubscriptionLoginPopover`) and expands on hover or keyboard focus, so an idle panel shows one small badge instead of a block of commands and docs. Clicking "copy command" no longer collapses it.

## [0.1.20] - 2026-10-15

### Changed

- The official subscription is now a built-in entry in the preset list (one per tool, no fields, cannot be deleted, not stored on disk) instead of a preset users had to create and fill in. One click hands the tool back to its CLI.
- Subscriptions switch through a new `ConfigTarget.clearManaged()` path rather than a preset apply: it strips every managed key with the same backup and read-back verification as a switch, and writes nothing when there is nothing to strip, so a tool is never handed a config file just to say "no override".
- Subscriptions no longer write a model: Claude Code drops `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL` and the `ANTHROPIC_DEFAULT_*_MODEL` slot keys, and Codex drops `model` and `model_provider`. Model choice belongs to the CLI (`/model`), so a subscription account is never pinned to one model.
- The preset form no longer offers an auth-mode selector (`AuthModeField` and the auth-mode constants are gone), and the login notice is always shown because the subscription is now a built-in capability.
- Importing a config that has neither a base URL nor a key is rejected with a pointer to the built-in entry instead of creating a subscription draft.
- Codex `model_catalog_json` is only removed when it points at the managed `~/.codex/models.json`; a path the user maintains is left untouched.

### Removed

- The `authMode` preset field and `domain/rules/auth-mode.ts`: the built-in entry is now the only way to express "use the CLI login state", so the merge rules no longer branch on it. A legacy `authMode` in `~/.aiswitch/presets.json` is ignored on load and those presets are read as ordinary ones.
- The connectivity-probe shortcut for subscription presets (`unsupported`): the built-in entry has no probe button.
- The official provider templates (`claude-official`, `gpt-official`): official endpoints are handled by the built-in "official subscription" entry, and a template that only pre-filled a model name would fight the CLI's own `/model` choice, so it had nothing left to say.

## [0.1.19] - 2026-10-15

### Removed

- The bundle switch feature (US-17): the bundle model, the `~/.aiswitch/bundles.json` store, `BundleService` / `BundleRepository` / `BundlePanel`, and their tests. Setting both Claude Code and Codex CLI at once is already covered by project-level config in the project tab, so the bundle dimension had no distinct use case. Any existing `bundles.json` is left untouched and simply ignored.

## [0.1.18] - 2026-10-15

### Added

- Official subscription auth mode for presets (`authMode = "subscription"`): switching writes no key and no base URL, so Claude Code and Codex CLI fall back to their own official login state instead of being billed through an API key. Claude Code keeps writing the model, small-fast and slot keys; Codex returns to the `openai` provider and keeps its ChatGPT tokens.
- Read-only subscription login detection: Claude Code's credentials file with a `~/.claude.json` account fallback (macOS keeps credentials in the system keychain), and Codex `auth.json` tokens. The switch panel shows the detected plan/account, the terminal login command (`claude` with `/login`, `codex login`) with one-click copy, and the official login docs.

### Changed

- `ConfigTarget` gains `authStatus()`; subscription presets set it without touching tokens or any credential file.
- Presets stored without an `authMode` field are read as API key mode, and imported configs with neither base URL nor key start as subscription drafts.

### Fixed

- Connectivity tests no longer report a misleading invalid-key result for subscription presets; they explain that the CLI login state owns the auth instead.

## [0.1.17] - 2026-09-26

### Added

- Add OpenCode Zen and OpenCode Go provider templates that prefill the base URL, models and small model per tool, so the same plan works in both Claude Code and Codex CLI.
- The model and small-model fields now offer a dropdown of candidate model names: template suggestions matched against the current base URL, plus the provider's own `/models` catalog. Grouped by origin and labelled, with the catalog fetched silently the first time the dropdown opens, so the list is complete without pressing a button first. Any failure degrades to free-text entry.

### Changed

- Provider templates are now tool-aware: the preset form lists only templates that apply to the selected tool, so a template can never fill another tool's base URL.
- Codex-side template suggestions are limited to models the gateway actually serves on its `/responses` route. Verified per model against OpenCode Zen and Go (2026-09): DeepSeek and Grok work, while GLM / Kimi / MiniMax / Qwen / MiMo / LongCat / Hy return `ModelProtocolUnsupported` and are only usable from Claude Code.

### Fixed

- Picking a candidate in the model dropdown now fills the field. The popup is portaled outside the input container, so the click-outside check unmounted it on `mousedown` and the following `click` never landed.
- Reopening the model dropdown after a pick lists every candidate again instead of collapsing to a single row, and the popup flips above the field or caps its height when the window is short, so the last row is no longer clipped.

## [0.1.16] - 2026-09-11

### Fixed

- Rotate the updater public key to match the release signing key, so in-app updates pass signature verification from this version on. Installs of 0.1.14 and 0.1.15 must download this release manually; their embedded public key can never verify new signatures.

## [0.1.15] - 2026-09-11

### Fixed

- Capture the pre-install baseline correctly on the first switch, so one-click restore can perform exact restores instead of silently degrading.
- Write backups atomically and skip foreign files during backup pruning.
- Roll back exactly what a failed switch changed: restore the backup made by that switch, remove newly created config files, leave untouched Codex files alone, and report rollback failures honestly.
- Restore project configuration snapshots when a later file write fails, so projects never keep half-written configs.
- Drop the empty bearer token from the Codex config for local-model presets without an API key.
- Refresh the backup list after every switch and serialize switches per tool across the panel, tray, and global shortcut entry points.
- Reset the bundle dialog form on every open, surface backup deletion failures, localize the project picker error, and load the app version through the adapter layer.

### Changed

- Tightened filesystem permissions to the three managed directories; project directories are granted per session only after an explicit directory pick or a recorded project at startup.
- Services now depend on injected port interfaces instead of concrete adapter implementations.

## [0.1.14] - 2026-08-22

### Added

- Added a manual in-app update check that downloads an available signed update before installation.

### Changed

- The header action now progresses from “Check for updates” to a versioned update action when the download completes.

### Fixed

- Report update check and download failures instead of silently hiding the update action.

## [0.1.13] - 2026-08-22

### Added

- Added top-level Global and Project workspace tabs.
- Added independent Claude Code and Codex CLI project configuration sections that no longer depend on the global tool selection.

### Changed

- Project configuration now selects one directory and configures either tool independently, with records carrying their own tool scope.

## [0.1.12] - 2026-08-22

### Added

- Added project-level configuration for Claude Code and Codex CLI with directory selection, priority display, and persistent project records.
- Added direct removal from the configured-project list without selecting the directory again.

### Changed

- Stabilized project configuration writes by isolating configuration directories from Vite development file watching.
- Shortened the removal action label to “Remove config” and aligned the action button height with the project write button.

## [0.1.11] - 2026-08-22

### Fixed

- Reused the draft release ID when publishing the completed GitHub Release.

## [0.1.10] - 2026-08-22

### Fixed

- Encoded the updater public key in the format expected by the Tauri updater.

## [0.1.9] - 2026-08-22

### Fixed

- Embedded the updater public key in the Tauri configuration so release builds can decode it reliably.

## [0.1.8] - 2026-08-22

### Added

- Added signed in-app updates with background pre-download and a one-click update button.
- Added release note validation and automatic GitHub Release publishing.

### Changed

- Added Tauri updater artifacts and `latest.json` generation to the release workflow.
- Standardized commit messages as English Conventional Commits.

### Fixed

- Prevented users from seeing an update action before the update package is fully downloaded.

## [0.1.7] - 2026-08-22

### Added

- Initial public release of AISwitch.
- One-click Claude Code and Codex CLI preset switching with backups and rollback.

### Fixed

- No known issues at the initial public release.
