# IkaEasy

IkaEasy is a community-maintained browser extension that improves the interface of [Ikariam](https://ikariam.gameforge.com/) and makes common empire-management tasks faster.

This repository is a fork of the abandoned original extension. It is maintained for current Chromium-based browsers and updated as the Ikariam interface changes.

## Highlights

### City management

- building levels displayed directly in the city view;
- quick building upgrade and downgrade controls;
- accurate upgrade costs loaded from the current game interface;
- high-resolution building icons and support for current Ikariam buildings;
- resource production, consumption, capacity, and shortage estimates.

### Empire overview

- resources and building levels across all cities;
- army and navy overview with game unit icons;
- drag-and-drop army and fleet deployment between cities;
- drag-and-drop resource transport between cities;
- espionage overview with available and assigned spies, targets, and quick access to spy missions;
- manual and automatic data synchronization with protection against overlapping refreshes.

### Maps and navigation

- island mine levels;
- city and alliance highlighting;
- world map island search by resource, wonder, and occupancy;
- sailing-time information;
- quick city switching and transport shortcuts.

### Convenience features

- Barbarian Village cargo calculation using Workshop cargo-capacity upgrades;
- optional automatic cargo ship selection for Barbarian Village raids;
- floating, muted Cinema player that remains available while navigating the game;
- alliance and diplomacy shortcuts;
- construction, recruitment, and transport notifications;
- in-game notification when a newer GitHub Release is available.

Most features can be enabled or disabled in the IkaEasy settings.

## Installation

IkaEasy is currently distributed as an unpacked extension.

### Install a release

1. Open the [latest GitHub Release](https://github.com/RandGor/IkaEasy/releases/latest).
2. Download `IkaEasy-<version>.zip` from **Assets**.
3. Extract it to a permanent folder. Do not move or delete that folder after installation.
4. Open your browser's extension manager:
   - Chrome: `chrome://extensions/`;
   - Edge: `edge://extensions/`;
   - Opera: `opera://extensions/`.
5. Enable **Developer mode**.
6. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
7. Open or reload Ikariam.

### Install from source

Clone the repository or use **Code → Download ZIP**, then load the repository root as an unpacked extension. The source version may contain changes that have not been included in a release yet.

## Updating

Extensions loaded from a folder cannot update themselves. IkaEasy checks GitHub Releases when the game loads and shows an in-game notification once for each newer version.

To update:

1. Download and extract the latest release over the existing extension folder, or run `git pull` in a cloned repository.
2. Open the browser's extension manager.
3. Click **Reload** on the IkaEasy extension card.
4. Reload the Ikariam tab.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and the list of unreleased changes.

## Reporting bugs

Use the [bug report form](https://github.com/RandGor/IkaEasy/issues/new?template=bug_report.yml). Include the affected Ikariam view, reproduction steps, browser version, screenshots, relevant console errors, and network responses when applicable.

## Development

The project has no build step. JavaScript, CSS, language files, and EJS templates are loaded directly from the repository.

After making a change:

1. reload IkaEasy in the browser's extension manager;
2. reload the Ikariam tab;
3. test both the changed view and any related city-switching workflow.

A version tag matching `manifest.json` triggers the release workflow. It validates the version, creates a clean ZIP archive, calculates its SHA-256 checksum, and prepares a draft GitHub Release.

## Disclaimer

IkaEasy is an unofficial community project and is not affiliated with Gameforge. It is intended only for Ikariam. Use it at your own risk and follow the rules of your game server.
