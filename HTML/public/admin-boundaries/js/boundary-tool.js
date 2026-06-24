/**
 * Interactive country + admin region exclusion tool.
 * Countries: Natural Earth. Regions: geoBoundaries (global ADM1 + ADM2).
 */

const NE_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const NE_COUNTRIES_URL = `${NE_BASE}/ne_50m_admin_0_countries.geojson`;
const NE_ADM1_URL = `${NE_BASE}/ne_50m_admin_1_states_provinces.geojson`;
/** Natural Earth 50m admin-1 exists for only these countries (includes disputed RUS regions). */
const NE_ADM1_COUNTRIES = new Set(["RUS", "USA", "IND", "IDN", "CHN", "BRA", "CAN", "AUS", "ZAF"]);
const GEOBOUNDARIES_API = "https://www.geoboundaries.org/api/current/gbOpen";

const SOURCE_COUNTRY = "result-country";
const SOURCE_REGION = "result-region";
const SOURCE_BORDER = "result-border";
const SOURCE_PICK = "pick-regions";
const LAYER_COUNTRY = "result-country-fill";
const LAYER_REGION = "result-region-fill";
const LAYER_BORDER = "result-border-line";
const LAYER_PICK_FILL = "pick-regions-fill";
const LAYER_PICK_LINE = "pick-regions-line";
const LAYER_PICK_SELECTED = "pick-regions-selected";

const ADMIN_LEVEL_LABELS = {
  1: { region: "State / province", hint: "ADM1 — states, provinces, oblasts" },
  2: { region: "Municipio / county / district", hint: "ADM2 — municipios, counties, districts" },
};

let map;
let countriesFc = null;
let neAdm1Fc = null;
/** @type {Map<string, {name: string, feature: object}[]>} */
const regionCache = new Map();
let lastResult = null;
let regionsRequestId = 0;
let pickHoverId = null;
let mapPickHandlersBound = false;

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
}

async function fetchJson(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${label} (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err.message === "Failed to fetch") {
      throw new Error(
        `Network error loading ${label}. Check your connection, ad blockers, or try DevTools → Network.`
      );
    }
    throw err;
  }
}

/** geoBoundaries metadata links to github.com/.../raw/... which breaks browser CORS. */
function normalizeGeoBoundaryDownloadUrl(url) {
  const match = url.match(
    /^https:\/\/github\.com\/wmgeolab\/geoBoundaries\/raw\/([^/]+)\/(.+)$/i
  );
  if (match) {
    return `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${match[1]}/${match[2]}`;
  }
  return url;
}

async function validateMapTilerKey() {
  const key = window.MAPTILER_API_KEY;
  if (!key || key === "YOUR_MAPTILER_KEY_HERE") {
    throw new Error(
      "Missing MapTiler API key — copy js/config.example.js to js/config.js and add your key."
    );
  }
  const url = `https://api.maptiler.com/maps/dataviz-v4-dark/style.json?key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (res.ok) return;
  if (res.status === 403) {
    const host = location.hostname;
    throw new Error(
      `MapTiler key blocked for ${location.origin}. In cloud.maptiler.com → Keys → Allowed HTTP origins, add http://localhost:8080 and http://127.0.0.1:8080 (you opened ${host}).`
    );
  }
  throw new Error(`MapTiler style request failed (${res.status}). Check your API key.`);
}

function getAdminLevel() {
  return Number($("admin-level-select")?.value || 1);
}

function regionCacheKey(iso, level = getAdminLevel()) {
  return `${iso}-ADM${level}`;
}

function regionNameFromProps(props) {
  return props.shapeName || props.name || props.NAME || props.name_en || "";
}

function updateAdminLevelLabels() {
  const level = getAdminLevel();
  const labels = ADMIN_LEVEL_LABELS[level] || ADMIN_LEVEL_LABELS[1];
  const regionLabel = $("region-label");
  if (regionLabel) regionLabel.textContent = `${labels.region}s to remove`;
  const hint = $("region-field-hint");
  if (hint) hint.textContent = `${labels.hint}. Ctrl/Cmd+click the list, or click the map to toggle.`;
  const diagramHint = $("lbl-region-diagram-hint");
  if (diagramHint) diagramHint.textContent = labels.hint;
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
  const selected = getSelectedRegionNames();
  const regionText =
    selected.length === 0
      ? "Region"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} regions`;

  lblCountry.textContent = countryText;
  lblRegion.textContent = regionText;
  if (lblRegionLayer) lblRegionLayer.textContent = `Excluded: ${regionText}`;
  updateAdminLevelLabels();
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
  return a.name.localeCompare(b.name);
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

function subtractRegions(countryGeom, regionGeoms) {
  if (regionGeoms.length === 0) {
    throw new Error("Select at least one region to remove");
  }
  let acc = geomToPcInput(countryGeom);
  for (const regionGeom of regionGeoms) {
    acc = polygonClipping.difference(acc, geomToPcInput(regionGeom));
  }
  return pcOutputToGeom(acc);
}

function getSelectedRegionNames() {
  const select = $("region-select");
  if (!select || select.disabled) return [];
  return [...select.selectedOptions].map((o) => o.value).filter(Boolean);
}

function setSelectedRegionNames(names) {
  const select = $("region-select");
  if (!select || select.disabled) return;
  const want = new Set(names);
  for (const opt of select.options) {
    opt.selected = want.has(opt.value);
  }
  updatePickSelectionHighlight(names);
  updateDiagramLabels();
  emptyResult();
  updateSelectionStatus();
}

function updateSelectionStatus() {
  const names = getSelectedRegionNames();
  if (names.length === 0) {
    setStatus("Click regions on the map or Ctrl+click in the list to select.");
    return;
  }
  if (names.length === 1) {
    setStatus(
      `Selected ${names[0]}. Click Remove selected regions, or click the map to add more.`
    );
    return;
  }
  const preview = names.slice(0, 4).join(", ");
  setStatus(
    `Selected ${names.length} regions: ${preview}${names.length > 4 ? "…" : ""}.`
  );
}

function slugifyRegionNames(names) {
  return names.map((n) => n.toLowerCase().replace(/\s+/g, "_")).join("_");
}

function findRegion(iso, regionName, adminLevel = getAdminLevel()) {
  const list = regionCache.get(regionCacheKey(iso, adminLevel)) || [];
  const q = normalize(regionName);
  let match = list.find((r) => normalize(r.name) === q);
  if (match) return match.feature;

  const partial = list.filter((r) => normalize(r.name).includes(q));
  if (partial.length === 1) return partial[0].feature;
  if (partial.length > 1) {
    throw new Error(
      `Ambiguous region "${regionName}". Try: ${partial.slice(0, 8).map((r) => r.name).join(", ")}…`
    );
  }
  throw new Error(`Region not found in ${iso}: ${regionName}`);
}

function indexGeoBoundaryFeatures(iso, adminLevel, fc) {
  const list = fc.features
    .map((f) => {
      const name = regionNameFromProps(f.properties || {});
      return name ? { name, feature: f } : null;
    })
    .filter(Boolean)
    .sort(sortByName);
  regionCache.set(regionCacheKey(iso, adminLevel), list);
  return list;
}

async function loadNeAdm1Fc() {
  if (neAdm1Fc) return neAdm1Fc;
  neAdm1Fc = await fetchJson(NE_ADM1_URL, "Natural Earth admin-1");
  return neAdm1Fc;
}

/** geoBoundaries omits some de-facto regions (e.g. Crimea under RUS). NE 50m ADM1 fills gaps. */
function neAdm1RegionsForCountry(iso, fc) {
  return fc.features
    .filter((f) => (f.properties?.adm0_a3 || f.properties?.ADM0_A3) === iso)
    .map((f) => {
      const name = regionNameFromProps(f.properties || {});
      return name ? { name, feature: f } : null;
    })
    .filter(Boolean);
}

function mergeRegionLists(base, extra) {
  const seen = new Set(base.map((r) => normalize(r.name)));
  const merged = [...base];
  for (const r of extra) {
    const key = normalize(r.name);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged.sort(sortByName);
}

async function supplementWithNeAdm1(iso, adminLevel, list) {
  if (adminLevel !== 1 || !NE_ADM1_COUNTRIES.has(iso)) return list;
  const fc = await loadNeAdm1Fc();
  const extra = neAdm1RegionsForCountry(iso, fc);
  if (extra.length === 0) return list;
  const merged = mergeRegionLists(list, extra);
  regionCache.set(regionCacheKey(iso, adminLevel), merged);
  return merged;
}

async function fetchGeoBoundaryRegions(iso, adminLevel) {
  const cacheKey = regionCacheKey(iso, adminLevel);
  if (regionCache.has(cacheKey)) {
    return regionCache.get(cacheKey);
  }

  const metaUrl = `${GEOBOUNDARIES_API}/${iso}/ADM${adminLevel}/`;
  const meta = await fetchJson(metaUrl, `geoBoundaries metadata for ${iso} ADM${adminLevel}`);
  const geoUrl = normalizeGeoBoundaryDownloadUrl(
    meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL
  );
  if (!geoUrl) {
    throw new Error(`geoBoundaries returned no download URL for ${iso} ADM${adminLevel}`);
  }

  const fc = await fetchJson(
    geoUrl,
    `geoBoundaries regions for ${iso} ADM${adminLevel}`
  );
  const list = indexGeoBoundaryFeatures(iso, adminLevel, fc);
  return supplementWithNeAdm1(iso, adminLevel, list);
}

async function loadRegionsForCountry(iso, adminLevel = getAdminLevel()) {
  const requestId = ++regionsRequestId;
  const select = $("region-select");
  select.disabled = true;
  select.innerHTML = `<option>Loading ADM${adminLevel}…</option>`;
  setStatus(`Loading ADM${adminLevel} boundaries for ${iso}…`);

  try {
    const list = await fetchGeoBoundaryRegions(iso, adminLevel);
    if (requestId !== regionsRequestId) return;

    populateRegions(iso, adminLevel);
    updatePickLayer(iso, adminLevel);
    const count = list.length;
    if (count === 0) {
      setStatus(`No ADM${adminLevel} regions found for ${iso}.`, true);
    } else {
      setStatus(
        `Loaded ${count} ADM${adminLevel} regions for ${iso}. Ctrl/Cmd+click the list or click the map to select.`
      );
    }
  } catch (err) {
    if (requestId !== regionsRequestId) return;
    populateRegions(iso, adminLevel);
    updatePickLayer(iso, adminLevel);
    setStatus(err.message, true);
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
    .sort((a, b) => a.label.localeCompare(b.label));

  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.iso;
    el.textContent = `${opt.label} (${opt.iso})`;
    select.appendChild(el);
  }
}

function populateRegions(iso, adminLevel = getAdminLevel()) {
  const select = $("region-select");
  select.innerHTML = "";
  const list = regionCache.get(regionCacheKey(iso, adminLevel)) || [];

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
  setSelectedRegionNames([]);
}

function regionsToFeatureCollection(iso, adminLevel = getAdminLevel()) {
  const list = regionCache.get(regionCacheKey(iso, adminLevel)) || [];
  return {
    type: "FeatureCollection",
    features: list.map((r) => ({
      type: "Feature",
      properties: { regionName: r.name },
      geometry: r.feature.geometry,
    })),
  };
}

function updatePickLayer(iso, adminLevel = getAdminLevel()) {
  if (!map?.getSource?.(SOURCE_PICK)) return;
  const list = regionCache.get(regionCacheKey(iso, adminLevel)) || [];
  const data =
    list.length > 0
      ? regionsToFeatureCollection(iso, adminLevel)
      : { type: "FeatureCollection", features: [] };
  map.getSource(SOURCE_PICK).setData(data);
  pickHoverId = null;

  if (list.length > 0) {
    updatePickSelectionHighlight(getSelectedRegionNames());
    const countryFeature = countriesFc?.features?.find(
      (f) => countryIso(f.properties) === iso
    );
    if (countryFeature) {
      map.fitBounds(boundsFromFeature(countryFeature), { padding: 48, duration: 700 });
    }
  } else {
    updatePickSelectionHighlight([]);
  }
}

function updatePickSelectionHighlight(regionNames) {
  if (!map?.getLayer?.(LAYER_PICK_SELECTED)) return;
  const names = Array.isArray(regionNames)
    ? regionNames
    : regionNames
      ? [regionNames]
      : [];
  if (names.length === 0) {
    map.setFilter(LAYER_PICK_SELECTED, ["==", ["get", "regionName"], ""]);
    return;
  }
  map.setFilter(LAYER_PICK_SELECTED, ["in", ["get", "regionName"], ["literal", names]]);
}

function toggleRegionByName(name) {
  const select = $("region-select");
  if (!name || select.disabled) return;
  if (![...select.options].some((o) => o.value === name)) return;
  const current = new Set(getSelectedRegionNames());
  if (current.has(name)) current.delete(name);
  else current.add(name);
  setSelectedRegionNames([...current]);
}

function setupMapPickHandlers() {
  if (!map || mapPickHandlersBound) return;
  mapPickHandlersBound = true;

  map.on("click", LAYER_PICK_FILL, (e) => {
    const name = e.features?.[0]?.properties?.regionName;
    if (name) toggleRegionByName(name);
  });

  map.on("mousemove", LAYER_PICK_FILL, (e) => {
    if (e.features.length === 0) return;
    const id = e.features[0].properties.regionName;
    if (pickHoverId && pickHoverId !== id) {
      map.setFeatureState({ source: SOURCE_PICK, id: pickHoverId }, { hover: false });
    }
    pickHoverId = id;
    map.setFeatureState({ source: SOURCE_PICK, id }, { hover: true });
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", LAYER_PICK_FILL, () => {
    if (pickHoverId) {
      map.setFeatureState({ source: SOURCE_PICK, id: pickHoverId }, { hover: false });
      pickHoverId = null;
    }
    map.getCanvas().style.cursor = "";
  });
}

function emptyResult() {
  if (!map?.getSource) return;
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
  const regionNames = getSelectedRegionNames();
  const adminLevel = getAdminLevel();
  if (!iso || regionNames.length === 0) {
    setStatus("Select at least one region to remove.", true);
    return;
  }
  if (!map?.getSource?.(SOURCE_COUNTRY)) {
    setStatus("Map is still loading — wait a moment and try again.", true);
    return;
  }

  setLoading(true);
  setStatus("Computing exclusion…");

  try {
    const countryFeature = countriesFc.features.find(
      (f) => countryIso(f.properties) === iso
    );
    const regionFeatures = regionNames.map((name) => findRegion(iso, name, adminLevel));
    const countryName = countryLabel(countryFeature.properties);
    const resultGeom = subtractRegions(
      countryFeature.geometry,
      regionFeatures.map((f) => f.geometry)
    );
    const adminLabel = ADMIN_LEVEL_LABELS[adminLevel]?.region || `ADM${adminLevel}`;
    const excludedLabel =
      regionNames.length === 1 ? regionNames[0] : `${regionNames.length} regions`;

    const countryResult = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: `${countryName} (${excludedLabel} excluded)`,
            country: countryName,
            country_iso: iso,
            excluded_regions: regionNames.join(", "),
            excluded_region_count: regionNames.length,
            admin_level: `ADM${adminLevel}`,
          },
          geometry: resultGeom,
        },
      ],
    };
    const regionResult = {
      type: "FeatureCollection",
      features: regionFeatures.map((regionFeature, i) => ({
        type: "Feature",
        properties: {
          name: regionNames[i],
          country: countryName,
          country_iso: iso,
          admin_level: `ADM${adminLevel}`,
          status: "excluded",
        },
        geometry: regionFeature.geometry,
      })),
    };
    const borderResult = {
      type: "FeatureCollection",
      features: regionFeatures.flatMap((f) =>
        regionBorderFeatureCollection(f.geometry).features
      ),
    };

    map.getSource(SOURCE_COUNTRY).setData(countryResult);
    map.getSource(SOURCE_REGION).setData(regionResult);
    map.getSource(SOURCE_BORDER).setData(borderResult);

    lastResult = {
      country: countryResult,
      region: regionResult,
      border: borderResult,
      filename: `${iso.toLowerCase()}_adm${adminLevel}_minus_${slugifyRegionNames(regionNames)}`,
    };
    $("download-btn").disabled = false;

    const bbox = boundsFromFeature(countryResult.features[0]);
    map.fitBounds(bbox, { padding: 80, duration: 900 });

    setStatus(
      `Removed ${excludedLabel} (${adminLabel}) from ${countryName}.`
    );
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

function addPickLayers() {
  const empty = { type: "FeatureCollection", features: [] };
  map.addSource(SOURCE_PICK, {
    type: "geojson",
    data: empty,
    promoteId: "regionName",
  });

  map.addLayer({
    id: LAYER_PICK_FILL,
    type: "fill",
    source: SOURCE_PICK,
    paint: {
      "fill-color": "#868e96",
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.38,
        0.1,
      ],
    },
  });

  map.addLayer({
    id: LAYER_PICK_LINE,
    type: "line",
    source: SOURCE_PICK,
    paint: {
      "line-color": "#ced4da",
      "line-width": 1,
      "line-opacity": 0.55,
    },
  });

  map.addLayer({
    id: LAYER_PICK_SELECTED,
    type: "fill",
    source: SOURCE_PICK,
    filter: ["==", ["get", "regionName"], ""],
    paint: {
      "fill-color": "#ffd43b",
      "fill-opacity": 0.35,
      "fill-outline-color": "#fab005",
    },
  });
}

function addResultLayers() {
  addPickLayers();
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
  setStatus("Loading countries…");
  try {
    countriesFc = await fetchJson(NE_COUNTRIES_URL, "country boundaries (Natural Earth)");
    populateCountries();
    updateDiagramLabels();
    const iso = $("country-select").value;
    if (iso) {
      await loadRegionsForCountry(iso, getAdminLevel());
    }
  } finally {
    setLoading(false);
  }
}

async function initMap() {
  if (typeof maptilersdk === "undefined") {
    setStatus("MapTiler SDK failed to load.", true);
    return;
  }
  if (typeof polygonClipping === "undefined") {
    setStatus("polygon-clipping library failed to load.", true);
    return;
  }

  try {
    await validateMapTilerKey();
  } catch (err) {
    setStatus(err.message, true);
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
    setupMapPickHandlers();
    const iso = $("country-select")?.value;
    if (iso) updatePickLayer(iso, getAdminLevel());
  });

  map.on("error", (e) => {
    const msg = String(e.error?.message || e.error || "unknown");
    if (msg === "Failed to fetch" || msg.includes("403")) {
      setStatus(
        `Map tiles failed to load. Use http://localhost:8080 (not 127.0.0.1) and allow both origins in your MapTiler key settings.`,
        true
      );
      return;
    }
    setStatus("Map error: " + msg, true);
  });
}

function initUI() {
  $("country-select").addEventListener("change", async (e) => {
    const iso = e.target.value;
    updateDiagramLabels();
    emptyResult();
    await loadRegionsForCountry(iso, getAdminLevel());
  });

  $("admin-level-select").addEventListener("change", async () => {
    updateDiagramLabels();
    emptyResult();
    const iso = $("country-select").value;
    if (iso) await loadRegionsForCountry(iso, getAdminLevel());
  });

  $("region-select").addEventListener("change", () => {
    updatePickSelectionHighlight(getSelectedRegionNames());
    updateDiagramLabels();
    emptyResult();
    updateSelectionStatus();
  });

  $("clear-regions-btn")?.addEventListener("click", () => {
    setSelectedRegionNames([]);
  });

  $("apply-btn").addEventListener("click", applyExclusion);
  $("download-btn").addEventListener("click", downloadGeoJSON);
}

document.addEventListener("DOMContentLoaded", () => {
  initUI();
  initMap();
  loadBoundaries().catch((err) => setStatus(err.message, true));
});
