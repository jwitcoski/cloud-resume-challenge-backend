# Fetch Antikythera GeoJSON from jwitcoski.github.io
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$gj = Join-Path $root "geojson"
New-Item -ItemType Directory -Force -Path $gj | Out-Null

$base = "https://raw.githubusercontent.com/jwitcoski/jwitcoski.github.io/master/Antikythera/data"
$files = @(
  "tracts.geojson",
  "grids.geojson",
  "geology.geojson",
  "terraces.geojson",
  "pottery.geojson",
  "lithics.geojson",
  "other.geojson",
  "standingstructures.geojson",
  "counts.geojson",
  "walkers.csv",
  "Petrography.csv"
)

foreach ($f in $files) {
  $out = Join-Path $gj $f
  Write-Host "Downloading $f ..."
  & curl.exe -sL --retry 3 -o $out "$base/$f"
  if (-not (Test-Path $out) -or (Get-Item $out).Length -lt 100) {
    throw "Failed to download $f"
  }
  Write-Host ("  OK {0:N0} bytes" -f (Get-Item $out).Length)
}

Write-Host "Done -> $gj"
