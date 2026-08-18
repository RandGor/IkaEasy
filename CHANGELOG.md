# Changelog

All notable changes to IkaEasy are documented in this file.

The project follows its existing four-part version format. Dates use `YYYY-MM-DD`.

## [Unreleased]

### Added

- Nothing yet.

## [3.1.0.30] - 2026-08-19

### Added

- Added a complete Empire Espionage overview with per-city spy availability, assignments, targets, and quick access to spy missions.
- Added drag-and-drop resource transport between cities in the Empire Resources tab.
- Added support for the Dockyard, Shrine of Olympus, and Chronos's Forge.
- Added high-resolution building artwork and a reproducible sprite-generation script.

### Changed

- Reworked Empire synchronization to prevent overlapping refreshes across tabs and browser windows.
- Empire tables now update their DOM incrementally instead of replacing the complete view every few seconds.
- Improved building artwork alignment and clarity in the Empire Buildings tab.

### Fixed

- Fixed quick building upgrades failing after tooltip content updates.
- Fixed failed or partial Empire refreshes being marked as successful.
- Fixed malformed IkaLogs responses causing repeated JSON errors in the extension background worker.

## [3.1.0.29] - 2026-08-08

### Added

- Added the Empire Military overview for armies and fleets across all cities.
- Added drag-and-drop army and fleet deployment between cities.
- Added the floating Cinema player with muted autoplay and navigation persistence.

## [3.1.0.28] - 2026-08-06

### Fixed

- Fixed building upgrade costs and quick-upgrade behavior after Ikariam interface changes.
- Fixed programmatic cargo input updates so the game applies the selected ship count immediately.

## [3.1.0.27] - 2026-08-06

### Added

- Added GitHub-based update checks and repository links.
- Redirected bug reports to GitHub Issues.

## Older versions

Earlier history is available on the [GitHub tags page](https://github.com/RandGor/IkaEasy/tags).

[Unreleased]: https://github.com/RandGor/IkaEasy/compare/3.1.0.30...HEAD
[3.1.0.30]: https://github.com/RandGor/IkaEasy/compare/3.1.0.29...3.1.0.30
[3.1.0.29]: https://github.com/RandGor/IkaEasy/compare/3.1.0.28...3.1.0.29
[3.1.0.28]: https://github.com/RandGor/IkaEasy/compare/3.1.0.27...3.1.0.28
[3.1.0.27]: https://github.com/RandGor/IkaEasy/releases/tag/3.1.0.27
