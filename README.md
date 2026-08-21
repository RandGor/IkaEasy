<p align="center">
  <img src="icon/256.png" width="180" height="180" alt="IkaEasy V4 logo">
</p>

<h1 align="center">IkaEasy V4 by RandGor</h1>

IkaEasy V4 is an independently maintained browser extension that improves the interface of [Ikariam](https://ikariam.gameforge.com/) and makes common empire-management tasks faster.

This project is **RandGor's actively maintained fork** of the discontinued original IkaEasy extension. The V4 name distinguishes this repository and its releases from abandoned copies of the old project distributed elsewhere.

The official source, issue tracker, and releases for IkaEasy V4 are hosted at [RandGor/IkaEasy](https://github.com/RandGor/IkaEasy).

Read the [IkaEasy V4 Privacy Policy](PRIVACY.md) for details about local game-data processing and optional third-party integrations.

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
- in-game notification for manually installed builds when a newer GitHub Release is available.

Most features can be enabled or disabled in the IkaEasy V4 settings.

## Installation

IkaEasy V4 is available from the Chrome Web Store and as a manual GitHub release.

### Install from the Chrome Web Store

Open the [IkaEasy V4 Chrome Web Store page](https://chromewebstore.google.com/detail/ikaeasy-v4-by-randgor/dkngcffbmbolplchpfbgjieihfdinnaf) and select **Add to Chrome**. Store installations are updated automatically by Chrome.

### Install a release manually

1. Open the [latest GitHub Release](https://github.com/RandGor/IkaEasy/releases/latest).
2. Download `IkaEasy-V4-<version>.zip` from **Assets**.
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

Chrome Web Store installations update automatically. Extensions loaded manually from a folder cannot update themselves, so those builds check published GitHub Releases when the game loads and show an in-game notification once for each newer version.

To update:

1. Download and extract the latest release over the existing extension folder, or run `git pull` in a cloned repository.
2. Open the browser's extension manager.
3. Click **Reload** on the IkaEasy V4 extension card.
4. Reload the Ikariam tab.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and the list of unreleased changes.

## Reporting bugs

Use the [bug report form](https://github.com/RandGor/IkaEasy/issues/new?template=bug_report.yml). Include the affected Ikariam view, reproduction steps, browser version, screenshots, relevant console errors, and network responses when applicable.

## Development

The project has no build step. JavaScript, CSS, language files, and EJS templates are loaded directly from the repository.

After making a change:

1. reload IkaEasy V4 in the browser's extension manager;
2. reload the Ikariam tab;
3. test both the changed view and any related city-switching workflow.

A version tag matching `manifest.json` triggers the release workflow. It validates the version, creates a clean ZIP archive, calculates its SHA-256 checksum, and prepares a draft GitHub Release.

## Disclaimer

IkaEasy V4 is an unofficial community project maintained by RandGor and is not affiliated with Gameforge. It is intended only for Ikariam. Use it at your own risk and follow the rules of your game server.
