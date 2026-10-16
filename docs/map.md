# The base map

Every place name on EastWire's maps is in English. The pins, clusters, popups and controls are
Leaflet; the base map under them is drawn by MapLibre from vector tiles.

## Why it changed (2026-10-16)

OpenStreetMap's standard raster tiles name places in their local script, so readers saw
"Россия", "Қазақстан" and "پاکستان" around our four countries. Raster tiles cannot be relabelled.

## Provider: OpenFreeMap

| | |
|---|---|
| Styles | `https://tiles.openfreemap.org/styles/positron` (light), `…/styles/dark` (dark) |
| Cost and limits | Free public instance, "no limits on map views or requests", no key, no registration, no cookies |
| Terms | [openfreemap.org/tos](https://openfreemap.org/tos/), updated 2026-10-14, read 2026-10-16: allows integrating the public service into a website; forbids automated bulk collection (we only show tiles in readers' browsers) |
| Credit | "© OpenMapTiles Data from OpenStreetMap" (required); OpenFreeMap named as well. Shown in the map's attribution control. |
| Rejected | CARTO basemaps: an API key (an account) is now required. Stadia, MapTiler: account and key. Wikimedia Maps: Wikimedia projects only. |

## How labels become English

`frontend/src/lib/mapStyle.ts` rewrites the downloaded style before MapLibre sees it: every label
built from a place's name reads `name:en`, then `name_en`, then the Latin transliteration, then
the local name. Road numbers are left alone. Land and water take the page's paper and ink
colours. Unit tested in `mapStyle.test.ts`.

## Loading and fallback

- MapLibre (about 276 KB gzipped, plus a 144 KB worker served from our own origin) is its own
  chunk, loaded only when a map is on screen. Pins and controls draw first; the base map fills in.
- Without WebGL, or when the style has not loaded after 10 seconds, the map falls back to
  OpenStreetMap's raster tiles with EastWire's own English country names on top.
- CSP: `connect-src https://tiles.openfreemap.org` (style, tiles, fonts, sprites),
  `worker-src 'self'`, `img-src blob:`; `tile.openstreetmap.org` stays for the fallback.
