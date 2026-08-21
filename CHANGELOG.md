# Changelog

All notable changes to IkaEasy V4 by RandGor are documented in this file.

The project follows its existing four-part version format. Dates use `YYYY-MM-DD`.

## [Unreleased]

### Added

- Nothing yet.

## [4.0.0.2] - 2026-08-22

### Changed

- Localized the extension description shown by Chromium in English and Russian.
- Limited GitHub update notifications to manually installed builds and published GitHub Releases; Chrome Web Store installations now rely exclusively on Chrome's automatic update channel.

### Fixed

- Fixed missing building icons in packaged releases by using the included WebP sprite through one canonical Empire Buildings style.

## [4.0.0.1] - 2026-08-19

### Security

- Removed arbitrary JavaScript string execution from the game-page bridge.
- Replaced the generic evaluation channel with an allowlisted structured command dispatcher, validated payloads, same-origin URL checks, and same-window message validation.

### Changed

- Converted transport and deployment template actions from executable strings to declarative action attributes.
- Excluded building-sprite source artwork and logo concept files from packaged releases while keeping them in the repository for future development.
- Replaced the packaged building sprite with a quality-85 WebP version and excluded development-only source maps and icon variants from releases.

## [4.0.0.0] - 2026-08-19

IkaEasy V4 is the first major release under RandGor's independently maintained fork identity. It consolidates the modernization and feature work completed since November 9, 2023.

### Added

- Migrated the extension to Manifest V3 and a modular architecture suitable for current Chromium browsers and Ikariam.
- Added GitHub-based update checks, in-game release notifications, repository links, and GitHub issue reporting.
- Added the Empire Military overview for armies and fleets across all cities.
- Added a complete Empire Espionage overview with per-city spy availability, assignments, targets, and quick access to spy missions.
- Added drag-and-drop army and fleet deployment between cities.
- Added drag-and-drop resource transport between cities in the Empire Resources tab.
- Added a persistent floating Cinema player with muted playback across game navigation.
- Added Barbarian Village cargo calculation and automatic ship selection using independent Workshop cargo upgrades.
- Added quick diplomacy treaty handling.
- Added optional Anti-Captcha support for Pirate Fortress actions.
- Added support for the Dockyard, Shrine of Olympus, and Chronos's Forge.
- Added high-resolution building artwork and a reproducible sprite-generation script.

### Changed

- Refreshed transport handling and removed obsolete premium transport and Academy behavior.
- Reworked Empire synchronization to prevent overlapping refreshes across tabs and browser windows.
- Empire tables now update their DOM incrementally instead of replacing the complete view every few seconds.
- Improved building artwork alignment and clarity in the Empire Buildings tab.
- Branded the maintained fork as IkaEasy V4 by RandGor and documented the official source and release process.

### Fixed

- Fixed quick building upgrades failing after tooltip content updates.
- Fixed building upgrade costs after Ikariam interface changes.
- Fixed programmatic cargo input updates so Ikariam applies calculated ship counts immediately.
- Fixed failed or partial Empire refreshes being marked as successful.
- Fixed malformed IkaLogs responses causing repeated JSON errors in the extension background worker.
- Fixed diplomacy requests using a hard-coded game world instead of the player's current server.

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

[Unreleased]: https://github.com/RandGor/IkaEasy/compare/4.0.0.2...HEAD
[4.0.0.2]: https://github.com/RandGor/IkaEasy/compare/4.0.0.1...4.0.0.2
[4.0.0.1]: https://github.com/RandGor/IkaEasy/compare/4.0.0.0...4.0.0.1
[4.0.0.0]: https://github.com/RandGor/IkaEasy/compare/3.1.0.29...4.0.0.0
[3.1.0.29]: https://github.com/RandGor/IkaEasy/compare/3.1.0.28...3.1.0.29
[3.1.0.28]: https://github.com/RandGor/IkaEasy/compare/3.1.0.27...3.1.0.28
[3.1.0.27]: https://github.com/RandGor/IkaEasy/releases/tag/3.1.0.27
