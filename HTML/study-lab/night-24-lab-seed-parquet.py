#!/usr/bin/env python3
"""Night 24 — seed resort snapshot Parquet for Athena / Iceberg lab."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROWS = [
    ("IS-001", "Bláfjöll", "IS", 1),
    ("IS-002", "Akureyri", "IS", 3),
    ("US-001", "Aspen", "US", 12),
    ("US-002", "Vail", "US", 8),
    ("US-003", "Park City", "US", 5),
    ("JP-001", "Niseko", "JP", 7),
    ("FR-001", "Chamonix", "FR", 4),
    ("NO-001", "Trysil", "NO", 2),
]


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: night-24-lab-seed-parquet.py <output.parquet>", file=sys.stderr)
        return 1

    out = Path(sys.argv[1])
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        print("pyarrow required — run: python -m pip install pyarrow", file=sys.stderr)
        return 1

    table = pa.table(
        {
            "resort_id": [r[0] for r in ROWS],
            "resort_name": [r[1] for r in ROWS],
            "country_code": [r[2] for r in ROWS],
            "monthly_runs": [r[3] for r in ROWS],
        }
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(table, out)

    countries: dict[str, int] = {}
    for _, _, cc, _ in ROWS:
        countries[cc] = countries.get(cc, 0) + 1

    print(
        json.dumps(
            {
                "rowCount": len(ROWS),
                "countries": countries,
                "outputPath": str(out.resolve()),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
