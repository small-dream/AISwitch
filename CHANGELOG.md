# Changelog

All notable changes are documented here. Every release must add a version section before its tag is pushed.

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
