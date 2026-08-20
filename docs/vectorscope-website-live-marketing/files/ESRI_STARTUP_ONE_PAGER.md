# Vector Scope AI — Esri Startup Program One-Pager

**Use this for the Esri “Apply to be a Startup Partner” application and partner conversations.**

---

## One-line pitch

**Vector Ledger** — collaborative GIS editing with approvals and a **versioned GeoParquet** lake on AWS. Staff and volunteers edit in the browser; publish for web maps (PMTiles) and desktop GIS (QGIS, ArcGIS Pro, DuckDB).

**Tagline:** Collaborative editing · approvals · versioned GeoParquet

---

## Product: Vector Ledger (live)

- **What it is:** Vector Scope AI’s collaborative GIS editing product. Versioned vector layers in an AWS lake, with approvals, then publish for maps and desktop analytics.
- **Live today:** [vectorscopeai.com](https://vectorscopeai.com) · [app.vectorscopeai.com](https://app.vectorscopeai.com) · [api.vectorscopeai.com](https://api.vectorscopeai.com)
- **Four surfaces:** Ledger Setup · Ledger Editor · Ledger Dashboard · Ledger Lake
- **Workflow:** Sandbox → upload shapefile → convert → edit proposals → approve → batch apply → new lake version → publish GeoParquet/PMTiles
- **Formats (shipped):** GeoParquet (lake / desktop) · PMTiles + TileJSON (browser maps). Not a GeoJSON product line.
- **How it relates to ArcGIS:** Desktop users open published GeoParquet in **ArcGIS Pro** (and QGIS/DuckDB). The editor of record today is the Vector Ledger browser app—not ArcGIS Online/Enterprise edit APIs.

---

## Built on AWS (as shipped)

Cognito-authenticated SPA (CloudFront + S3), API Gateway → Lambda control plane, DynamoDB proposals/changelog, ECS Fargate convert/apply workers, private S3 lake (`vs-ledger-lake-*`) with versioned GeoParquet + PMTiles.

**Future (not shipped):** Iceberg table management and Athena analytics on the same GeoParquet lake.

---

## Why now / market gap

- Agencies still move authoritative boundaries and infrastructure layers by email shapefile or locked geodatabases.
- Lakehouse analytics platforms (CARTO, Wherobots) optimize query—not collaborative edit → approve → publish with a changelog.
- Esri desktop users need portable lake files they can open in Pro without losing the collaboration trail.

---

## Proof point: Global Ski Atlas

- **Live demo:** [globalskiatlas.com](https://globalskiatlas.com)
- Related vertical that proved web editing + versioned geospatial data at scale (3,000+ resorts). Separate from Vector Ledger product surfaces.

---

## Team

**Jonathan Witcoski** — Founder & GIS Architect. 15+ years federal GIS (CDC, Census, ARNG, DHS). Python ETL, AWS serverless, geospatial automation.

---

## Ask

- **Esri Startup Program:** Partner so Vector Ledger sits as a practical collaboration layer next to ArcGIS Pro workflows, with GeoParquet agencies can take with them.
- **Pilot:** Agencies that need sandboxes, proposals, and published lake files for desktop GIS and web maps.

---

## Contact

- **Marketing:** [vectorscopeai.com](https://vectorscopeai.com)
- **App:** [app.vectorscopeai.com](https://app.vectorscopeai.com)
- **Email:** hello@vectorscopeai.com
