# IkaEasy

IkaEasy is a browser extension for [Ikariam](https://ikariam.gameforge.com/) that improves the game interface and simplifies common actions.

This repository is a community-maintained fork of the abandoned original extension. Ikariam interface changes may occasionally require compatibility updates.

## Features

- building levels and upgrade information directly in the city view;
- island mine levels and additional city and alliance information;
- world map island search by resource, wonder, and occupancy;
- quick city switching and resource transportation;
- additional army, fleet, and diplomacy controls;
- city resource production and consumption information;
- notifications for completed construction, recruitment, and transport stages;
- Barbarian Village cargo ship calculation that accounts for Workshop cargo-capacity upgrades;
- optional automatic cargo ship selection when opening a Barbarian Village raid.

## Install from GitHub

IkaEasy is currently installed manually as an unpacked extension.

1. On the GitHub repository page, select **Code → Download ZIP**.
2. Extract the archive to a permanent folder. Do not delete or move this folder after installation.
3. Open your browser's extensions page:
   - Chrome: `chrome://extensions/`;
   - Edge: `edge://extensions/`;
   - other Chromium-based browsers: open their equivalent extensions management page.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder that contains `manifest.json`.
6. Open or reload Ikariam.

If you cloned the repository with Git, select the repository root folder instead of an extracted ZIP folder.


## Update

Extensions installed from source do not update automatically.

1. Download the latest repository version and replace the existing files without changing the installation folder, or run `git pull` in a cloned repository.
2. Open the browser's extensions page.
3. Select the reload button on the IkaEasy extension card.
4. Reload the Ikariam tab.

## Development

The project has no build step. JavaScript, CSS, language files, and templates are loaded directly from the repository. After changing files, reload IkaEasy on `chrome://extensions/` and then reload the Ikariam tab.

When reporting a bug, please create a GitHub Issue and include:

- the affected Ikariam view;
- steps to reproduce the problem;
- browser name and version;
- screenshots and relevant developer-console errors, when available.

## Disclaimer

IkaEasy is an unofficial community project and is not affiliated with Gameforge. It is intended only for Ikariam. Use it at your own risk and follow the rules of your game server.