# Vector Scope AI Website

[![Deploy Website](https://github.com/jwitcoski/vectorscope-website/actions/workflows/deploy.yml/badge.svg)](https://github.com/jwitcoski/vectorscope-website/actions/workflows/deploy.yml)

Marketing site for **Vector Scope AI** (company) and **Vector Ledger** (product): collaborative GIS editing with approvals and a versioned GeoParquet lake on AWS.

## Live

- Marketing: [vectorscopeai.com](https://vectorscopeai.com)
- App: [app.vectorscopeai.com](https://app.vectorscopeai.com)
- API: [api.vectorscopeai.com](https://api.vectorscopeai.com)
- Public playground embed: [app.vectorscopeai.com/public?embed=1](https://app.vectorscopeai.com/public?embed=1)

**Tagline:** Collaborative editing · approvals · versioned GeoParquet

## Product surfaces

1. **Ledger Setup** — sandbox, shapefile zip → versioned GeoParquet
2. **Ledger Editor** — browser draw/edit proposals
3. **Ledger Dashboard** — approve/reject + QC
4. **Ledger Lake** — GeoParquet + PMTiles/TileJSON for desktop GIS and web maps

## Infrastructure (this repo)

Static marketing site on AWS:

- **S3** static hosting
- **CloudFront** CDN
- **GitHub Actions** deploy on merge to `main`

As-built product architecture diagram: `assets/images/VectorLedger_AWS_Architecture.png` (not the old ArcGIS→Iceberg target diagram).

## Development

```bash
git clone https://github.com/jwitcoski/vectorscope-website.git
cd vectorscope-website
# edit index.html / pitch-deck.html / assets
# open index.html locally, or use a static server
```

Terraform configs in-repo manage site infrastructure. PRs to `main` trigger deploy.

## Contact

Formspree form on the homepage. Issues: [GitHub Issues](https://github.com/jwitcoski/vectorscope-website/issues).

## License

See [LICENSE.txt](LICENSE.txt).
