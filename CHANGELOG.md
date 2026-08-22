# Changelog

All notable changes are documented here. Every release must add a version section before its tag is pushed.

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
