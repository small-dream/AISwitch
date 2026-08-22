# Changelog

All notable changes are documented here. Every release must add a version section before its tag is pushed.

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
