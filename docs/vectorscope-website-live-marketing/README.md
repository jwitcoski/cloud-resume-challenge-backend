# Vector Ledger live marketing — vectorscope-website patch

This Cloud Agent could not push to `jwitcoski/vectorscope-website` (403).
The commit is ready locally and packaged here for apply.

## Apply to vectorscope-website

```bash
git clone https://github.com/jwitcoski/vectorscope-website.git
cd vectorscope-website
git checkout -b cursor/ledger-live-architecture-f520
git am path/to/0001-Present-Vector-Ledger-as-live-on-AWS-not-a-planned-A.patch
# or:
git fetch ../ledger-live-architecture-f520.bundle cursor/ledger-live-architecture-f520:cursor/ledger-live-architecture-f520
git checkout cursor/ledger-live-architecture-f520
git push -u origin cursor/ledger-live-architecture-f520
```

## What changed

- Vector Ledger framed as **built and live** (not TBD / ArcGIS+Iceberg target)
- As-built AWS architecture diagram + homepage Architecture section
- Primary CTAs → `https://app.vectorscopeai.com` (playground embed kept on `/public?embed=1`)
- Pitch deck, Esri one-pager, README, redesign spec updated
