# Ikariam building image sources

These files are cached source assets for rebuilding IkaEasy's building sprite.
Do not delete them after generating the sprite.

Base URL:

`https://s52-ru.ikariam.gameforge.com/cdn/all/both/img/city/`

The local filenames use IkaEasy's canonical building keys. The CDN filename is
usually `<key>_l.png`, with these exceptions:

- `townHall.png` -> `townhall_l.png`
- `tavern.png` -> `taverne_l.png`
- `branchOffice.png` -> `branchoffice_l.png`
- `marineChartArchive.png` -> `marinechartarchive_l.png`
- `blackMarket.png` -> `blackmarket_l.png`
- `barracks.png` -> `barracks_r.png` (the `_l` variant has no flag)
- `wall.png` -> `wall.png`

The source path list was cross-checked against the current TNT Collection
building definitions and downloaded from the official Ikariam CDN.
