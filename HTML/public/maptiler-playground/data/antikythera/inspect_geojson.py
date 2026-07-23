"""Inspect Antikythera GeoJSON layers: CRS, counts, bbox."""
from __future__ import annotations

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent / "geojson"


def walk_coords(coords, xs, ys):
    if isinstance(coords[0], (int, float)):
        xs.append(coords[0])
        ys.append(coords[1])
        return
    for c in coords:
        walk_coords(c, xs, ys)


def main() -> None:
    for path in sorted(BASE.glob("*.geojson")):
        with path.open(encoding="utf-8") as f:
            g = json.load(f)
        feats = g.get("features", [])
        xs: list[float] = []
        ys: list[float] = []
        gtype = None
        props = []
        for feat in feats:
            geom = feat.get("geometry") or {}
            if not gtype and geom.get("type"):
                gtype = geom["type"]
            if not props and feat.get("properties"):
                props = list(feat["properties"].keys())
            if geom.get("coordinates") is not None:
                walk_coords(geom["coordinates"], xs, ys)
        bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else None
        print(f"{path.name}: n={len(feats)} type={gtype} crs={g.get('crs')} bbox={bbox}")
        print(f"  props[{len(props)}]: {props[:12]}")


if __name__ == "__main__":
    main()
