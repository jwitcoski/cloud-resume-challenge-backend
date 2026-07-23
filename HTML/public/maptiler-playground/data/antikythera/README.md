# Antikythera Survey → PMTiles

Vector tiles for the dig-game board, built from the GeoJSON already published at
[jwitcoski.github.io/Antikythera](https://github.com/jwitcoski/jwitcoski.github.io/tree/master/Antikythera).

## Source & license

- **Dataset:** Antikythera Survey Project (Bevan & Conolly)
- **ADS:** [Collection 1115](https://doi.org/10.5284/1012484) · CC BY 3.0
- **Data paper:** [JOAD 10.5334/4f3bcb3f7f21d](https://openarchaeologydata.metajnl.com/articles/10.5334/4f3bcb3f7f21d)
- **Local GeoJSON mirror:** cloned from the GitHub Pages repo above (CRS84 / WGS84)

## Outputs (`pmtiles/`)

| File | Layers | Zooms | Notes |
| --- | --- | --- | --- |
| `antikythera.pmtiles` | tracts, grids, geology, terraces, pottery, lithics, other, structures, counts | 10–16 | Full stack (~6.5 MB) |
| `antikythera-digboard.pmtiles` | tracts, grids, structures, geology | 10–17 | No feature dropping — dig tiles stay complete |
| `antikythera-finds.pmtiles` | pottery, lithics, other, counts, structures | 12–17 | Finds overlay |

Island center ≈ `[23.294, 35.887]` (lng, lat).

### Vector layer IDs (for MapLibre / MapTiler SDK)

`tracts` · `grids` · `geology` · `terraces` · `pottery` · `lithics` · `other` · `structures` · `counts`

## Rebuild

Requires Docker (`indigoag/tippecanoe`, `protomaps/go-pmtiles`).

```powershell
powershell -File .\build_pmtiles.ps1
```

Or re-pull GeoJSON then rebuild:

```powershell
powershell -File .\fetch_geojson.ps1
powershell -File .\build_pmtiles.ps1
```

## Play the dig game

Open in the Next/static playground:

[`/maptiler-playground/antikythera-dig.html`](../../antikythera-dig.html)

Uses:
- GeoJSON `tracts` for clickable fog / feature-state
- `antikythera-digboard.pmtiles` for geology, grids, structures
- `antikythera-finds.pmtiles` for pottery / lithics overlays
- `tract-scores.json` for dig scoring

PMTiles are wired via `pmtiles@3.2.0` + a **named** `maptilersdk.addProtocol` handler
(`pmtiles://digboard/{z}/{x}/{y}`), because MapLibre mangles nested `pmtiles://http://…` URLs
into relative `http/localhost:…` paths.

## Game mapping

| Game idea | Layer |
| --- | --- |
| Fog / dig tiles | GeoJSON `tracts` |
| Expensive deep dig | digboard `grids` |
| Hits (pottery) | finds `pottery` |
| Hits (stone tools) | finds `lithics` |
| Landmarks | digboard `structures` |
| Terrain hints | digboard `geology` |
