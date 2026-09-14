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
- Academy upgrade payback chart with city discounts, additional scientist capacity, and adjustable research and crystal exchange rates.

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

The Academy payback panel opens on the current city's next upgrade and compares the added scientists' research with the crystal spent at the selected experiment exchange rate. Its initial rates use the research, government, corruption, and Optician bonuses known to the extension; world bonuses and temporary boosts can be entered manually. Payback assumes the additional places remain fully staffed and excludes wood, gold upkeep, and construction time. Scientist capacities always come from the verified table, including when the game supplies a live price above the saved cost range.

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

Academy and discount regression checks:

```sh
node --experimental-default-type=module scripts/test-academy-payback.mjs
node scripts/test-academy-browser.cjs
```

The browser checks require Playwright and use a local fixture with the real page controller, templates, and calculation code. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium browser when Playwright has no bundled browser. `IKAEASY_TEST_OUTPUT` optionally selects the screenshot output directory. The extension's template message transport is stubbed; live game verification is still recommended after an Ikariam markup change.

### Refreshing building costs

The building cost database can be regenerated from the current in-game Help tables:

1. sign in to Ikariam and open the browser developer tools on the game tab;
2. run [`scripts/scrape-building-costs.js`](scripts/scrape-building-costs.js) in the console or as a DevTools snippet;
3. wait for all building tables to be logged and for `buildings.js` to download;
4. replace `js/helper/db/buildings.js` with the downloaded file and review the diff.

The same script reads the Academy's **Scientists** column and prints a `MAX_SCIENTISTS` declaration. Merge its values into `js/const.js` to update scientist capacity in the Empire Resources overview, preserving existing higher levels when Help returns a shorter range. The current table covers levels 1–71. Index `0` means no Academy; the remaining entries are the exact Help values for each level. The scraper checks that capacities increase and that at least levels 1–50 are present before printing the declaration.

The scraper validates level order and resource column counts before downloading a file. If Ikariam changes the Help markup or a building's resource types, it stops with an error instead of producing a partial database. Ikariam Help only exposes a 50-level range for buildings with higher caps, so preserve or regenerate the remaining levels when updating the database.

A version tag matching `manifest.json` triggers the release workflow. It validates the version, creates a clean ZIP archive, calculates its SHA-256 checksum, and prepares a draft GitHub Release.

## Disclaimer

IkaEasy V4 is an unofficial community project maintained by RandGor and is not affiliated with Gameforge. It is intended only for Ikariam. Use it at your own risk and follow the rules of your game server.
