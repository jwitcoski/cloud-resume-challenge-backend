# Build Antikythera PMTiles from local GeoJSON (tippecanoe via Docker)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$gjHost = Join-Path $root "geojson"
$outHost = Join-Path $root "pmtiles"
New-Item -ItemType Directory -Force -Path $outHost | Out-Null

$required = @(
  "tracts.geojson", "grids.geojson", "geology.geojson", "terraces.geojson",
  "pottery.geojson", "lithics.geojson", "other.geojson",
  "standingstructures.geojson", "counts.geojson"
)
foreach ($f in $required) {
  if (-not (Test-Path (Join-Path $gjHost $f))) {
    throw "Missing $f — run fetch_geojson.ps1 first"
  }
}

$data = ($root -replace "\\", "/")
$gj = "/data/geojson"
$tip = "indigoag/tippecanoe"

Write-Host "Building antikythera.pmtiles (full stack)..."
docker run --rm -v "${data}:/data" $tip tippecanoe `
  -o /data/pmtiles/antikythera.pmtiles `
  --force `
  --name="Antikythera Survey Project" `
  --description="ASP intensive survey (Bevan & Conolly). CC-BY 3.0. ADS 10.5284/1012484" `
  --attribution="Bevan & Conolly / ADS Collection 1115 (CC-BY 3.0)" `
  --minimum-zoom=10 `
  --maximum-zoom=16 `
  --drop-densest-as-needed `
  --extend-zooms-if-still-dropping `
  -L tracts:$gj/tracts.geojson `
  -L grids:$gj/grids.geojson `
  -L geology:$gj/geology.geojson `
  -L terraces:$gj/terraces.geojson `
  -L pottery:$gj/pottery.geojson `
  -L lithics:$gj/lithics.geojson `
  -L other:$gj/other.geojson `
  -L structures:$gj/standingstructures.geojson `
  -L counts:$gj/counts.geojson

Write-Host "Building antikythera-digboard.pmtiles..."
docker run --rm -v "${data}:/data" $tip tippecanoe `
  -o /data/pmtiles/antikythera-digboard.pmtiles `
  --force `
  --name="Antikythera Dig Board" `
  --description="Survey tracts + grids + geology + structures. ASP / ADS 10.5284/1012484 CC-BY 3.0" `
  --attribution="Bevan & Conolly / ADS Collection 1115 (CC-BY 3.0)" `
  --minimum-zoom=10 `
  --maximum-zoom=17 `
  --no-feature-limit `
  --no-tile-size-limit `
  --no-tiny-polygon-reduction `
  --full-detail=15 `
  --low-detail=12 `
  -L tracts:$gj/tracts.geojson `
  -L grids:$gj/grids.geojson `
  -L structures:$gj/standingstructures.geojson `
  -L geology:$gj/geology.geojson

Write-Host "Building antikythera-finds.pmtiles..."
docker run --rm -v "${data}:/data" $tip tippecanoe `
  -o /data/pmtiles/antikythera-finds.pmtiles `
  --force `
  --name="Antikythera Finds" `
  --description="Pottery, lithics, other, counts. ASP / ADS 10.5284/1012484 CC-BY 3.0" `
  --attribution="Bevan & Conolly / ADS Collection 1115 (CC-BY 3.0)" `
  --minimum-zoom=11 `
  --maximum-zoom=17 `
  --drop-densest-as-needed `
  --extend-zooms-if-still-dropping `
  -L pottery:$gj/pottery.geojson `
  -L lithics:$gj/lithics.geojson `
  -L other:$gj/other.geojson `
  -L counts:$gj/counts.geojson `
  -L structures:$gj/standingstructures.geojson

Get-ChildItem $outHost | Format-Table Name, @{N = "MB"; E = { [math]::Round($_.Length / 1MB, 2) } } -AutoSize
Write-Host "Done -> $outHost"
