/**
 * Interactive country + admin-1 region exclusion tool.
 * Uses Natural Earth boundaries and polygon-clipping for geometry ops.
 */

const NE_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const NE_COUNTRIES_URL = `${NE_BASE}/ne_50m_admin_0_countries.geojson`;
const NE_REGIONS_URL = `${NE_BASE}/ne_50m_admin_1_states_provinces.geojson`;

const SOURCE_COUNTRY = "result-country";
const SOURCE_REGION = "result-region";
const SOURCE_BORDER = "result-border";
const LAYER_COUNTRY = "result-country-fill";
const LAYER_REGION = "result-region-fill";
const LAYER_BORDER = "result-border-line";

let map;
let countriesFc = null;
let regionsFc = null;
let regionsByCountry = new Map();
let lastResult = null;

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
}

function updateDiagramLabels() {
  const countrySel = $("country-select");
  const regionSel = $("region-select");
  const lblCountry = $("lbl-country");
  const lblRegion = $("lbl-region");
  const lblRegionLayer = $("lbl-region-layer");
  if (!lblCountry || !countrySel) return;

  const countryText =
    countrySel.selectedOptions[0]?.textContent?.replace(/\s*\([A-Z]{3}\)$/, "") ||
    "Country";
  const regionText = regionSel?.value || "Region";

  lblCountry.textContent = countryText;
  lblRegion.textContent = regionText;
  if (lblRegionLayer) lblRegionLayer.textContent = `Excluded: ${regionText}`;
}

function setLoading(on) {
  $("apply-btn").disabled = on;
  $("download-btn").disabled = on || !lastResult;
  $("loading").hidden = !on;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function countryIso(props) {
  const iso = props.ISO_A3 || props.ADM0_A3 || props.BRK_A3;
  return iso && iso !== "-99" ? iso : null;
}

function countryLabel(props) {
  return props.ADMIN || props.NAME || props.NAME_LONG || countryIso(props) || "Unknown";
}

function sortByName(a, b) {
  return a.label.localeCompare(b.label);
}

function geomToPcInput(geom) {
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  throw new Error(`Unsupported geometry type: ${geom.type}`);
}

function pcOutputToGeom(output) {
  if (!output || output.length === 0) {
    throw new Error("Exclusion produced an empty geometry");
  }
  if (output.length === 1) {
    return { type: "Polygon", coordinates: output[0] };
  }
  return { type: "MultiPolygon", coordinates: output };
}

function regionBorderFeatureCollection(regionGeom) {
  const polygons =
    regionGeom.type === "Polygon"
      ? [regionGeom.coordinates]
      : regionGeom.coordinates;

  return {
    type: "FeatureCollection",
    features: polygons.map((coords) => ({
      type: "Feature",
      properties: { border: "excluded" },
      geometry: { type: "LineString", coordinates: coords[0] },
    })),
  };
}

function subtractRegion(countryGeom, regionGeom) {
  const countryInput = geomToPcInput(countryGeom);
  const regionInput = geomToPcInput(regionGeom);
  const result = polygonClipping.difference(countryInput, regionInput);
  return pcOutputToGeom(result);
}

function findCountry(isoOrName) {
  const q = normalize(isoOrName);
  for (const f of countriesFc.features) {
    const p = f.properties;
    const candidates = [
      p.ISO_A3,
      p.ADM0_A3,
      p.BRK_A3,
      p.ISO_A2,
      p.ADMIN,
      p.NAME,
      p.NAME_LONG,
    ].map(normalize);
    if (candidates.includes(q)) return f;
  }
  throw new Error(`Country not found: ${isoOrName}`);
}

function findRegion(iso, regionName) {
  const list = regionsByCountry.get(iso) || [];
  const q = normalize(regionName);
  let match = list.find((r) => normalize(r.name) === q);
  if (match) return match.feature;

  const partial = list.filter((r) => normalize(r.name).includes(q));
  if (partial.length === 1) return partial[0].feature;
  if (partial.length > 1) {
    throw new Error(
      `Ambiguous region "${regionName}". Try: ${partial.map((r) => r.name).join(", ")}`
    );
  }
  throw new Error(`Region not found in ${iso}: ${regionName}`);
}

function indexRegions() {
  regionsByCountry.clear();
  for (const f of regionsFc.features) {
    const iso = f.properties.adm0_a3;
    if (!iso) continue;
    if (!regionsByCountry.has(iso)) regionsByCountry.set(iso, []);
    regionsByCountry.get(iso).push({
      name: f.properties.name,
      feature: f,
    });
  }
  for (const list of regionsByCountry.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function populateCountries() {
  const select = $("country-select");
  select.innerHTML = "";

  const options = countriesFc.features
    .map((f) => {
      const iso = countryIso(f.properties);
      if (!iso) return null;
      return { iso, label: countryLabel(f.properties), feature: f };
    })
    .filter(Boolean)
    .sort(sortByName);

  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.iso;
    el.textContent = `${opt.label} (${opt.iso})`;
    select.appendChild(el);
  }
}

function populateRegions(iso) {
  const select = $("region-select");
  select.innerHTML = "";
  const list = regionsByCountry.get(iso) || [];

  if (list.length === 0) {
    const el = document.createElement("option");
    el.value = "";
    el.textContent = "No regions available";
    select.appendChild(el);
    select.disabled = true;
    return;
  }

  select.disabled = false;
  for (const r of list) {
    const el = document.createElement("option");
    el.value = r.name;
    el.textContent = r.name;
    select.appendChild(el);
  }
}

function emptyResult() {
  const empty = { type: "FeatureCollection", features: [] };
  map.getSource(SOURCE_COUNTRY)?.setData(empty);
  map.getSource(SOURCE_REGION)?.setData(empty);
  map.getSource(SOURCE_BORDER)?.setData(empty);
  lastResult = null;
  $("download-btn").disabled = true;
}

function boundsFromFeature(feature) {
  const coords = [];
  const geom = feature.geometry;
  const addRing = (ring) => ring.forEach((c) => coords.push(c));
  if (geom.type === "Polygon") geom.coordinates.forEach(addRing);
  else if (geom.type === "MultiPolygon")
    geom.coordinates.forEach((poly) => poly.forEach(addRing));
  else if (geom.type === "GeometryCollection")
    geom.geometries.forEach((g) => {
      if (g.type === "Polygon") g.coordinates.forEach(addRing);
      if (g.type === "MultiPolygon") g.coordinates.forEach((p) => p.forEach(addRing));
    });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function applyExclusion() {
  const iso = $("country-select").value;
  const regionName = $("region-select").value;
  if (!iso || !regionName) return;

  setLoading(true);
  setStatus("Computing exclusion…");

  try {
    const countryFeature = countriesFc.features.find(
      (f) => countryIso(f.properties) === iso
    );
    const regionFeature = findRegion(iso, regionName);
    const countryName = countryLabel(countryFeature.properties);
    const resultGeom = subtractRegion(countryFeature.geometry, regionFeature.geometry);

    const countryResult = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: `${countryName} (${regionName} excluded)`,
            country: countryName,
            country_iso: iso,
            excluded_region: regionName,
          },
          geometry: resultGeom,
        },
      ],
    };
    const regionResult = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: regionName,
            country: countryName,
            country_iso: iso,
            status: "excluded",
          },
          geometry: regionFeature.geometry,
        },
      ],
    };
    const borderResult = regionBorderFeatureCollection(regionFeature.geometry);

    map.getSource(SOURCE_COUNTRY).setData(countryResult);
    map.getSource(SOURCE_REGION).setData(regionResult);
    map.getSource(SOURCE_BORDER).setData(borderResult);

    lastResult = {
      country: countryResult,
      region: regionResult,
      border: borderResult,
      filename: `${iso.toLowerCase()}_minus_${regionName.toLowerCase().replace(/\s+/g, "_")}`,
    };
    $("download-btn").disabled = false;

    const bbox = boundsFromFeature(countryResult.features[0]);
    map.fitBounds(bbox, { padding: 80, duration: 900 });

    setStatus(`Removed ${regionName} from ${countryName}.`);
  } catch (err) {
    emptyResult();
    setStatus(err.message, true);
  } finally {
    setLoading(false);
  }
}

function downloadGeoJSON() {
  if (!lastResult) return;
  const bundle = {
    type: "FeatureCollection",
    name: lastResult.filename,
    features: [
      ...lastResult.country.features,
      ...lastResult.region.features,
    ],
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/geo+json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${lastResult.filename}.geojson`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function addResultLayers() {
  const empty = { type: "FeatureCollection", features: [] };
  map.addSource(SOURCE_COUNTRY, { type: "geojson", data: empty });
  map.addSource(SOURCE_REGION, { type: "geojson", data: empty });
  map.addSource(SOURCE_BORDER, { type: "geojson", data: empty });

  map.addLayer({
    id: LAYER_COUNTRY,
    type: "fill",
    source: SOURCE_COUNTRY,
    paint: {
      "fill-color": "#4dabf7",
      "fill-opacity": 0.35,
    },
  });

  map.addLayer({
    id: LAYER_REGION,
    type: "fill",
    source: SOURCE_REGION,
    paint: {
      "fill-color": "#2a2a2a",
      "fill-opacity": 0.75,
      "fill-outline-color": "#666",
    },
  });

  map.addLayer({
    id: LAYER_BORDER,
    type: "line",
    source: SOURCE_BORDER,
    paint: {
      "line-color": "#ff6b6b",
      "line-dasharray": [4, 3],
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 10, 3],
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

async function loadBoundaries() {
  setLoading(true);
  setStatus("Loading Natural Earth boundaries…");
  const [countries, regions] = await Promise.all([
    fetch(NE_COUNTRIES_URL).then((r) => {
      if (!r.ok) throw new Error("Failed to load countries");
      return r.json();
    }),
    fetch(NE_REGIONS_URL).then((r) => {
      if (!r.ok) throw new Error("Failed to load regions");
      return r.json();
    }),
  ]);
  countriesFc = countries;
  regionsFc = regions;
  indexRegions();
  populateCountries();
  populateRegions($("country-select").value);
  updateDiagramLabels();
  setStatus("Select a country and region, then click Remove region.");
  setLoading(false);
}

function initMap() {
  if (typeof maptilersdk === "undefined") {
    setStatus("MapTiler SDK failed to load.", true);
    return;
  }
  if (typeof polygonClipping === "undefined") {
    setStatus("polygon-clipping library failed to load.", true);
    return;
  }

  maptilersdk.config.apiKey = window.MAPTILER_API_KEY;

  map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.DATAVIZ.DARK,
    center: [0, 20],
    zoom: 2,
  });

  map.on("load", () => {
    addResultLayers();
    loadBoundaries().catch((err) => setStatus(err.message, true));
  });

  map.on("error", (e) => {
    setStatus("Map error: " + (e.error?.message || e.error || "unknown"), true);
  });
}

function initUI() {
  $("country-select").addEventListener("change", (e) => {
    populateRegions(e.target.value);
    updateDiagramLabels();
    emptyResult();
    setStatus("Region list updated. Click Remove region.");
  });

  $("region-select").addEventListener("change", () => {
    updateDiagramLabels();
    emptyResult();
  });

  $("apply-btn").addEventListener("click", applyExclusion);
  $("download-btn").addEventListener("click", downloadGeoJSON);
}

document.addEventListener("DOMContentLoaded", () => {
  initUI();
  initMap();
});
