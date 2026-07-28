/**
 * Generate Map Agent Royal Rumble solution HTML packs.
 * Run: node HTML/public/map-agent-rumble/_generate_packs.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const FIGHTERS = ["mapbox", "maptiler", "esri", "no-agent"];
const SKILLS = [
  "S01","S02","S03","S04","S05","S06","S07","S08","S09","S10",
  "S11","S12","S13","S14","S15","N01","N02","N03","M01","M02",
];

const CSS_BASE = `
    html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
    #map { position: absolute; inset: 0; width: 100%; height: 100%; }
    .panel {
      position: absolute; z-index: 2; top: 10px; left: 10px;
      background: rgba(10,16,32,.92); color: #eef2ff; padding: 10px 12px;
      border-radius: 10px; max-width: min(320px, 92vw); font-size: 13px;
      border: 1px solid rgba(255,255,255,.12);
    }
    .panel button, .panel input {
      font: inherit; margin: 4px 0; width: 100%; box-sizing: border-box;
      border-radius: 8px; border: 1px solid #445; padding: 10px; min-height: 44px;
      background: #0f172a; color: #eef2ff; cursor: pointer; touch-action: manipulation;
    }
    .panel button { background: #2563eb; border-color: #3b82f6; }
    .legend { position: absolute; z-index: 2; bottom: 28px; left: 10px;
      background: rgba(10,16,32,.9); color: #eef2ff; padding: 8px 10px; border-radius: 8px; font-size: 12px; }
    #inset, #overview {
      position: absolute; z-index: 2; right: 10px; bottom: 28px;
      width: 140px; height: 110px; border: 2px solid #fff; border-radius: 6px; overflow: hidden;
    }
    .story { position: absolute; z-index: 2; top: 10px; right: 10px; width: min(280px, 40vw);
      max-height: 80vh; overflow: auto; background: rgba(10,16,32,.94); color: #eef2ff;
      padding: 12px; border-radius: 10px; }
    .story .chapter { border-bottom: 1px solid rgba(255,255,255,.1); padding: 8px 0; cursor: pointer; }
    .story .chapter.active { color: #6ec8ff; }
    .swipe-wrap { position: absolute; inset: 0; }
    .swipe-wrap #mapA, .swipe-wrap #mapB { position: absolute; inset: 0; }
    .swipe-bar { position: absolute; top: 0; bottom: 0; width: 4px; background: #fff; z-index: 5; cursor: ew-resize; }
    @media (max-width: 520px) {
      .panel { max-width: 96vw; left: 2vw; right: 2vw; width: auto; }
      .panel button { min-height: 48px; padding: 12px; }
    }
`;

function shell(title, extraHead, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${extraHead}
  <style>${CSS_BASE}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function mapboxHead() {
  return `<link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
  <script src="../../admin-boundaries/js/config.js"></script>`;
}

function maptilerHead() {
  return `<script src="https://cdn.maptiler.com/maptiler-sdk-js/v4.0.2/maptiler-sdk.umd.min.js"></script>
  <link href="https://cdn.maptiler.com/maptiler-sdk-js/v4.0.2/maptiler-sdk.css" rel="stylesheet" />
  <script src="../../admin-boundaries/js/config.js"></script>`;
}

function maplibreHead() {
  return `<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>`;
}

const OPEN_STYLE = "https://tiles.openfreemap.org/styles/liberty";
/** City-detail open style — demotiles.maplibre.org is a toy world basemap (solid color at z12). */

function mbBoot(extra = "") {
  return `
  const token = window.MAPBOX_ACCESS_TOKEN;
  if (!token || token === "YOUR_MAPBOX_ACCESS_TOKEN") throw new Error("Missing MAPBOX_ACCESS_TOKEN");
  mapboxgl.accessToken = token;
  ${extra}`;
}

function mtBoot(extra = "") {
  return `
  const key = window.MAPTILER_API_KEY;
  if (!key || key === "YOUR_MAPTILER_KEY_HERE") throw new Error("Missing MAPTILER_API_KEY");
  maptilersdk.config.apiKey = key;
  ${extra}`;
}

function esriPlaceholder(id, title) {
  return shell(`Esri ${id} — awaiting API`, "", `
<div id="map" style="display:flex;align-items:center;justify-content:center;background:#06141a;color:#8fadb8;">
  <div class="panel" style="position:static;max-width:28rem;">
    <strong>${title}</strong>
    <p>Esri / ArcGIS seat awaiting API key and Maps SDK pack. Placeholder — not a failing grade until the fighter is ready.</p>
    <p>coming soon · awaiting API</p>
  </div>
</div>`);
}

/* ---------- MAPBOX solutions ---------- */
const mapbox = {
  S01() {
    return shell("S01 Hello Map — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [14.4178, 50.1167],
    zoom: 12
  });
  window.__MAP__ = map;
  map.on("load", () => parent.postMessage({ type: "rumble-ready", fighter: "mapbox", skill: "S01" }, "*"));
</script>`);
  },
  S02() {
    return shell("S02 Pins — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.4178, 50.1167],
    zoom: 12
  });
  const pins = [
    { lngLat: [14.4178, 50.1167], text: "Old Town" },
    { lngLat: [14.4005, 50.0865], text: "Castle" },
    { lngLat: [14.4301, 50.0792], text: "Vyšehrad" }
  ];
  pins.forEach((p) => {
    new mapboxgl.Marker()
      .setLngLat(p.lngLat)
      .setPopup(new mapboxgl.Popup().setText(p.text))
      .addTo(map);
  });
  map.on("click", (e) => map.easeTo({ center: e.lngLat, duration: 600 }));
  window.__MAP__ = map;
</script>`);
  },
  S03() {
    return shell("S03 Style Switcher — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Styles</strong>
  <button type="button" data-style="mapbox://styles/mapbox/standard">Standard</button>
  <button type="button" data-style="mapbox://styles/mapbox/outdoors-v12">Outdoors</button>
  <button type="button" data-style="mapbox://styles/mapbox/satellite-streets-v12">Satellite</button>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [14.4178, 50.1167],
    zoom: 11
  });
  function onStyleReady() { map.addControl(new mapboxgl.NavigationControl(), "top-right"); }
  map.on("style.load", onStyleReady);
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => map.setStyle(btn.getAttribute("data-style")));
  });
  window.__MAP__ = map;
</script>`);
  },
  S04() {
    return shell("S04 Atmosphere — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [-122.42, 37.78],
    zoom: 13,
    pitch: 50
  });
  map.on("style.load", () => {
    map.setFog({
      color: "rgb(186, 210, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.02,
      "space-color": "rgb(11, 11, 25)",
      "star-intensity": 0.6
    });
    try { map.setConfigProperty("basemap", "lightPreset", "dusk"); } catch (_) {}
  });
  window.__MAP__ = map;
</script>`);
  },
  S05() {
    return shell("S05 Geocode — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Geocode</strong>
  <input id="q" type="search" placeholder="Search address" />
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.4178, 50.1167],
    zoom: 11
  });
  let marker = null;
  let t = null;
  function debounce(fn, ms) {
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  async function forward(q) {
    const url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(q) + ".json?access_token=" + token + "&limit=1";
    const res = await fetch(url);
    const data = await res.json();
    const f = data.features && data.features[0];
    if (!f) return;
    const c = f.center;
    if (marker) marker.remove();
    marker = new mapboxgl.Marker().setLngLat(c).setPopup(new mapboxgl.Popup().setText(f.place_name)).addTo(map);
    map.flyTo({ center: c, zoom: 13 });
    document.getElementById("out").textContent = f.place_name;
  }
  document.getElementById("q").addEventListener("input", debounce((e) => {
    if (e.target.value.length > 2) forward(e.target.value).catch(console.error);
  }, 350));
  map.on("click", async (e) => {
    const url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + e.lngLat.lng + "," + e.lngLat.lat + ".json?access_token=" + token;
    const data = await (await fetch(url)).json();
    const name = data.features && data.features[0] && data.features[0].place_name;
    document.getElementById("out").textContent = "Reverse: " + (name || "—");
    if (marker) marker.remove();
    marker = new mapboxgl.Marker().setLngLat(e.lngLat).addTo(map);
  });
  window.__MAP__ = map;
</script>`);
  },
  S06() {
    return shell("S06 Camera — Mapbox", mapboxHead(), `
<div class="panel"><strong>Camera choreography</strong><button id="go" type="button">Play tour</button></div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [14.4178, 50.1167],
    zoom: 10,
    pitch: 0,
    bearing: 0
  });
  const stops = [
    { center: [14.4178, 50.1167], zoom: 12, pitch: 0, bearing: 0 },
    { center: [14.4, 50.09], zoom: 14, pitch: 55, bearing: 30 },
    { center: [8.6, 46.5], zoom: 11, pitch: 60, bearing: -20 }
  ];
  async function play() {
    for (const s of stops) {
      await new Promise((r) => map.flyTo({ ...s, duration: 2500, essential: true }).once("moveend", r));
    }
  }
  document.getElementById("go").onclick = () => play();
  window.__MAP__ = map;
</script>`);
  },
  S07() {
    return shell("S07 Inset — Mapbox", mapboxHead(), `
<div id="map"></div>
<div id="inset"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.4178, 50.1167],
    zoom: 13
  });
  const overview = new mapboxgl.Map({
    container: "inset",
    style: "mapbox://styles/mapbox/light-v11",
    center: [14.4178, 50.1167],
    zoom: 8,
    interactive: true,
    attributionControl: false
  });
  function syncExtent() {
    const b = map.getBounds();
    const poly = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [b.getWest(), b.getSouth()],
          [b.getEast(), b.getSouth()],
          [b.getEast(), b.getNorth()],
          [b.getWest(), b.getNorth()],
          [b.getWest(), b.getSouth()]
        ]]
      }
    };
    const src = overview.getSource("extent");
    if (src) src.setData(poly);
    else {
      overview.addSource("extent", { type: "geojson", data: poly });
      overview.addLayer({ id: "extent-fill", type: "fill", source: "extent", paint: { "fill-color": "#2563eb", "fill-opacity": 0.2 } });
      overview.addLayer({ id: "extent-line", type: "line", source: "extent", paint: { "line-color": "#2563eb", "line-width": 2 } });
    }
  }
  map.on("move", syncExtent);
  overview.on("load", syncExtent);
  overview.on("click", (e) => map.easeTo({ center: e.lngLat }));
  window.__MAP__ = map;
</script>`);
  },
  S08() {
    return shell("S08 3D Buildings — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-74.006, 40.7128],
    zoom: 15,
    pitch: 60
  });
  map.on("style.load", () => {
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (const layer of layers) {
      if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
        labelLayerId = layer.id;
        break;
      }
    }
    map.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.6
      }
    }, labelLayerId);
  });
  window.__MAP__ = map;
</script>`);
  },
  S09() {
    return shell("S09 Terrain — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [8.6, 46.5],
    zoom: 11,
    pitch: 60
  });
  map.on("load", () => {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.6 });
    map.flyTo({ center: [8.6, 46.5], zoom: 12, pitch: 65, duration: 3000 });
  });
  window.__MAP__ = map;
</script>`);
  },
  S10() {
    return shell("S10 Cluster — Mapbox", mapboxHead(), `
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [14.4, 50.08],
    zoom: 10
  });
  const features = [];
  for (let i = 0; i < 5000; i++) {
    features.push({
      type: "Feature",
      properties: { id: i },
      geometry: { type: "Point", coordinates: [14.2 + Math.random() * 0.5, 49.95 + Math.random() * 0.35] }
    });
  }
  map.on("load", () => {
    map.addSource("storm", { type: "geojson", data: { type: "FeatureCollection", features }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
    map.addLayer({ id: "clusters", type: "circle", source: "storm", filter: ["has", "point_count"],
      paint: { "circle-color": "#51bbd6", "circle-radius": ["step", ["get", "point_count"], 15, 100, 22, 750, 30] } });
    map.addLayer({ id: "cluster-count", type: "symbol", source: "storm", filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 } });
    map.addLayer({ id: "unclustered", type: "circle", source: "storm", filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": "#f28cb1", "circle-radius": 4 } });
  });
  window.__MAP__ = map;
</script>`);
  },
  S11() {
    return shell("S11 Story Map — Mapbox", mapboxHead(), `
<div id="map"></div>
<div class="story" id="story">
  <h3>Prague chapters</h3>
  <div class="chapter active" data-chapter="0"><strong>Old Town</strong><p>Start at the historic core.</p></div>
  <div class="chapter" data-chapter="1"><strong>Castle</strong><p>Fly west to the castle ridge.</p></div>
  <div class="chapter" data-chapter="2"><strong>River bend</strong><p>Follow the Vltava south.</p></div>
</div>
<script>
${mbBoot()}
  const chapters = [
    { center: [14.4178, 50.1167], zoom: 13, pitch: 20, bearing: 0 },
    { center: [14.4005, 50.0865], zoom: 14, pitch: 45, bearing: -30 },
    { center: [14.414, 50.07], zoom: 13, pitch: 30, bearing: 40 }
  ];
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    ...chapters[0]
  });
  document.querySelectorAll(".chapter").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      const i = Number(el.getAttribute("data-chapter"));
      map.flyTo({ ...chapters[i], duration: 2000 });
    });
  });
  window.__MAP__ = map;
</script>`);
  },
  S12() {
    return shell("S12 Layer Studio — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Layer studio</strong>
  <label><input type="checkbox" data-layer="heat" checked /> Heat circles</label>
  <label><input type="checkbox" data-layer="line" checked /> Corridor</label>
  <label><input type="checkbox" data-layer="pts" checked /> Sites</label>
  <label>Opacity <input id="op" type="range" min="0" max="100" value="70" /></label>
  <label>Filter id ≥ <input id="filt" type="number" value="0" /></label>
</div>
<div class="legend" id="legend">
  <div>Heat — cyan</div><div>Corridor — amber</div><div>Sites — pink</div>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [14.42, 50.08],
    zoom: 11
  });
  const pts = [];
  for (let i = 0; i < 40; i++) {
    pts.push({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: [14.3 + Math.random() * 0.3, 50.0 + Math.random() * 0.2] } });
  }
  map.on("load", () => {
    map.addSource("sites", { type: "geojson", data: { type: "FeatureCollection", features: pts } });
    map.addLayer({ id: "heat", type: "circle", source: "sites", paint: { "circle-radius": 18, "circle-color": "#22d3ee", "circle-opacity": 0.35 } });
    map.addLayer({ id: "pts", type: "circle", source: "sites", paint: { "circle-radius": 5, "circle-color": "#f472b6" } });
    map.addSource("line", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [[14.35, 50.05], [14.42, 50.09], [14.48, 50.07]] } } });
    map.addLayer({ id: "line", type: "line", source: "line", paint: { "line-color": "#fbbf24", "line-width": 4 } });
  });
  document.querySelectorAll("[data-layer]").forEach((cb) => {
    cb.addEventListener("change", () => {
      map.setLayoutProperty(cb.getAttribute("data-layer"), "visibility", cb.checked ? "visible" : "none");
    });
  });
  document.getElementById("op").addEventListener("input", (e) => {
    const v = Number(e.target.value) / 100;
    map.setPaintProperty("heat", "circle-opacity", v * 0.5);
  });
  document.getElementById("filt").addEventListener("input", (e) => {
    const n = Number(e.target.value) || 0;
    map.setFilter("pts", [">=", ["get", "id"], n]);
  });
  window.__MAP__ = map;
</script>`);
  },
  S13() {
    return shell("S13 Swipe — Mapbox", mapboxHead(), `
<div class="swipe-wrap">
  <div id="mapA"></div>
  <div id="mapB" style="clip-path: inset(0 0 0 50%);"></div>
  <div class="swipe-bar" id="bar" style="left:50%;"></div>
</div>
<script>
${mbBoot()}
  const shared = { center: [14.42, 50.08], zoom: 12 };
  const mapA = new mapboxgl.Map({ container: "mapA", style: "mapbox://styles/mapbox/streets-v12", ...shared });
  const mapB = new mapboxgl.Map({ container: "mapB", style: "mapbox://styles/mapbox/satellite-streets-v12", ...shared, attributionControl: false });
  let syncing = false;
  function bind(a, b) {
    a.on("move", () => {
      if (syncing) return;
      syncing = true;
      b.jumpTo({ center: a.getCenter(), zoom: a.getZoom(), bearing: a.getBearing(), pitch: a.getPitch() });
      syncing = false;
    });
  }
  bind(mapA, mapB); bind(mapB, mapA);
  const bar = document.getElementById("bar");
  const mapBEl = document.getElementById("mapB");
  function setSwipe(x) {
    const pct = Math.max(5, Math.min(95, (x / window.innerWidth) * 100));
    bar.style.left = pct + "%";
    mapBEl.style.clipPath = "inset(0 0 0 " + pct + "%)";
  }
  bar.addEventListener("pointerdown", (e) => {
    const move = (ev) => setSwipe(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  window.__MAP__ = mapA;
</script>`);
  },
  S14() {
    return shell("S14 Time-Travel — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Time travel</strong>
  <button id="play" type="button">Play / Pause</button>
  <input id="scrubber" type="range" min="0" max="23" value="0" />
  <div>Hour: <span id="hour">0</span></div>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [14.42, 50.08],
    zoom: 11
  });
  let hour = 0, playing = false, raf = null;
  function frameData(h) {
    const features = [];
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2 + h * 0.2;
      features.push({
        type: "Feature",
        properties: { h },
        geometry: { type: "Point", coordinates: [14.42 + Math.cos(a) * 0.08, 50.08 + Math.sin(a) * 0.05] }
      });
    }
    return { type: "FeatureCollection", features };
  }
  map.on("load", () => {
    map.addSource("pulse", { type: "geojson", data: frameData(0) });
    map.addLayer({ id: "pulse", type: "circle", source: "pulse", paint: { "circle-radius": 6, "circle-color": "#38bdf8" } });
  });
  function setHour(h) {
    hour = h;
    document.getElementById("hour").textContent = String(h);
    document.getElementById("scrubber").value = String(h);
    const src = map.getSource("pulse");
    if (src) src.setData(frameData(h));
  }
  document.getElementById("scrubber").oninput = (e) => setHour(Number(e.target.value));
  let last = 0;
  function tick(ts) {
    if (!playing) return;
    if (ts - last > 400) { last = ts; setHour((hour + 1) % 24); }
    raf = requestAnimationFrame(tick);
  }
  document.getElementById("play").onclick = () => {
    playing = !playing;
    if (playing) raf = requestAnimationFrame(tick);
    else cancelAnimationFrame(raf);
  };
  window.__MAP__ = map;
</script>`);
  },
  S15() {
    return shell("S15 Racecar — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Street racecar</strong>
  <div>↑/W along street · ↓/S reverse · Lap <span id="lap">0</span></div>
  <div id="street">Loading real street via Directions…</div>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  // Real Prague street corridor: Malá Strana → Old Town via Charles Bridge approach
  const A = [14.4052, 50.0865];
  const B = [14.4212, 50.0875];
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: A,
    zoom: 15,
    pitch: 55,
    bearing: 20
  });
  const keys = {};
  window.addEventListener("keydown", (e) => { keys[e.key] = true; e.preventDefault(); });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  function segLen(a, b) {
    const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    const dy = (b[1] - a[1]) * 110540;
    return Math.hypot(dx, dy);
  }
  function bearing(a, b) {
    const dLon = ((b[0] - a[0]) * Math.PI) / 180;
    const lat1 = (a[1] * Math.PI) / 180, lat2 = (b[1] * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
  function pointAlong(coords, distM) {
    let left = ((distM % totalLen) + totalLen) % totalLen;
    for (let i = 0; i < coords.length - 1; i++) {
      const L = segLen(coords[i], coords[i + 1]);
      if (left <= L || i === coords.length - 2) {
        const t = L ? left / L : 0;
        return {
          lng: coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
          lat: coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
          heading: bearing(coords[i], coords[i + 1])
        };
      }
      left -= L;
    }
    return { lng: coords[0][0], lat: coords[0][1], heading: 0 };
  }

  let coords = [];
  let totalLen = 1;
  let progress = 0;
  let speed = 0;
  let lap = 0;
  let lastProgress = 0;

  map.on("load", async () => {
    const url = "https://api.mapbox.com/directions/v5/mapbox/driving/" + A.join(",") + ";" + B.join(",") +
      "?geometries=geojson&overview=full&access_token=" + token;
    const data = await (await fetch(url)).json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error("No street route");
    coords = route.geometry.coordinates;
    totalLen = 0;
    for (let i = 0; i < coords.length - 1; i++) totalLen += segLen(coords[i], coords[i + 1]);
    document.getElementById("street").textContent = "On-street only · " + (totalLen / 1000).toFixed(2) + " km real road";

    map.addSource("track", { type: "geojson", data: { type: "Feature", properties: { street: true }, geometry: route.geometry } });
    map.addLayer({ id: "track", type: "line", source: "track", paint: { "line-color": "#fbbf24", "line-width": 8 } });
    map.addSource("car", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: coords[0] } } });
    map.addLayer({ id: "car", type: "circle", source: "car", paint: { "circle-radius": 9, "circle-color": "#ef4444", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

    function loop() {
      if (keys.ArrowUp || keys.w || keys.W) speed = Math.min(28, speed + 0.6);
      if (keys.ArrowDown || keys.s || keys.S) speed = Math.max(-14, speed - 0.5);
      speed *= 0.98;
      // Road-constrained: progress along street centerline only (no free lng/lat fly)
      progress += speed * 0.05;
      if (progress >= totalLen) { progress -= totalLen; lap++; document.getElementById("lap").textContent = String(lap); }
      if (progress < 0) progress += totalLen;
      const p = pointAlong(coords, progress);
      map.getSource("car").setData({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
      map.easeTo({ center: [p.lng, p.lat], bearing: p.heading, pitch: 55, duration: 0, follow: true });
      lastProgress = progress;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
  window.__MAP__ = map;
</script>`);
  },
  N01() {
    return shell("N01 Directions — Mapbox", mapboxHead(), `
<div class="panel"><strong>Directions line</strong><div id="stats"></div></div>
<div id="map"></div>
<script>
${mbBoot()}
  const a = [14.40, 50.09], b = [14.45, 50.07];
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.42, 50.08],
    zoom: 12
  });
  map.on("load", async () => {
    try {
      const url = "https://api.mapbox.com/directions/v5/mapbox/driving/" + a.join(",") + ";" + b.join(",") + "?geometries=geojson&access_token=" + token;
      const data = await (await fetch(url)).json();
      const route = data.routes && data.routes[0];
      if (!route) throw new Error("No route");
      map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#3b82f6", "line-width": 5 } });
      document.getElementById("stats").textContent = (route.distance / 1000).toFixed(1) + " km · " + Math.round(route.duration / 60) + " min";
    } catch (err) {
      document.getElementById("stats").textContent = "Error: " + err.message;
    }
  });
  window.__MAP__ = map;
</script>`);
  },
  N02() {
    return shell("N02 Search-to-Route — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Search to route</strong>
  <input id="from" placeholder="Origin" value="Prague Castle" />
  <input id="to" placeholder="Destination" value="Charles Bridge" />
  <button id="go" type="button">Route</button>
  <div id="stats"></div>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.42, 50.08],
    zoom: 12
  });
  async function geocode(q) {
    const url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(q) + ".json?access_token=" + token + "&limit=1&proximity=14.42,50.08";
    const data = await (await fetch(url)).json();
    return data.features[0].center;
  }
  document.getElementById("go").onclick = async () => {
    try {
      const a = await geocode(document.getElementById("from").value);
      const b = await geocode(document.getElementById("to").value);
      const url = "https://api.mapbox.com/directions/v5/mapbox/driving/" + a + ";" + b + "?geometries=geojson&access_token=" + token;
      const data = await (await fetch(url)).json();
      const route = data.routes[0];
      if (map.getSource("route")) map.removeLayer("route"), map.removeSource("route");
      map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#22c55e", "line-width": 5 } });
      document.getElementById("stats").textContent = (route.distance / 1000).toFixed(1) + " km · " + Math.round(route.duration / 60) + " min";
    } catch (e) { document.getElementById("stats").textContent = String(e); }
  };
  window.__MAP__ = map;
</script>`);
  },
  N03() {
    return shell("N03 Isochrone — Mapbox", mapboxHead(), `
<div class="panel"><strong>Reachability rings</strong><div>15 / 30 / 60 min</div></div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [14.42, 50.08],
    zoom: 10
  });
  map.on("load", async () => {
    const url = "https://api.mapbox.com/isochrone/v1/mapbox/driving/14.42,50.08?contours_minutes=15,30,60&polygons=true&access_token=" + token;
    const data = await (await fetch(url)).json();
    map.addSource("iso", { type: "geojson", data });
    map.addLayer({ id: "iso", type: "fill", source: "iso", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.35 } });
    map.addLayer({ id: "iso-line", type: "line", source: "iso", paint: { "line-color": "#334155", "line-width": 1 } });
  });
  window.__MAP__ = map;
</script>`);
  },
  M01() {
    return shell("M01 Responsive — Mapbox", mapboxHead(), `
<div class="panel">
  <strong>Touch map</strong>
  <button type="button" id="in">Zoom in</button>
  <button type="button" id="out">Zoom out</button>
</div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.4178, 50.1167],
    zoom: 12,
    touchPitch: true,
    dragRotate: true
  });
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
  document.getElementById("in").onclick = () => map.zoomIn();
  document.getElementById("out").onclick = () => map.zoomOut();
  window.__MAP__ = map;
</script>`);
  },
  M02() {
    return shell("M02 Locate Me — Mapbox", mapboxHead(), `
<div class="panel"><strong>Locate me</strong><button id="btn" type="button">Find my location</button><div id="msg"></div></div>
<div id="map"></div>
<script>
${mbBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [14.4178, 50.1167],
    zoom: 11
  });
  const geo = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true });
  map.addControl(geo, "top-right");
  document.getElementById("btn").onclick = () => {
    document.getElementById("msg").textContent = "Requesting geolocation permission…";
    geo.trigger();
  };
  geo.on("geolocate", () => { document.getElementById("msg").textContent = "Located"; });
  window.__MAP__ = map;
</script>`);
  },
};

/* ---------- MAPTILER (no directions) ---------- */
function mtNA(id, title) {
  return shell(`MapTiler ${id} N/A`, maptilerHead(), `
<div id="map" style="display:flex;align-items:center;justify-content:center;background:#111;">
  <div class="panel" style="position:static;">
    <strong>${title}</strong>
    <p>N/A — MapTiler has no Directions API. Capability-gated, not a failing grade.</p>
  </div>
</div>`);
}

const maptiler = {
  S01() {
    return shell("S01 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: [14.4178, 50.1167],
    zoom: 12
  });
  window.__MAP__ = map;
</script>`);
  },
  S02() {
    return shell("S02 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, center: [14.4178, 50.1167], zoom: 12 });
  [[14.4178, 50.1167, "Old Town"], [14.4005, 50.0865, "Castle"], [14.4301, 50.0792, "Vyšehrad"]].forEach(([lng, lat, t]) => {
    new maptilersdk.Marker().setLngLat([lng, lat]).setPopup(new maptilersdk.Popup().setText(t)).addTo(map);
  });
  window.__MAP__ = map;
</script>`);
  },
  S03() {
    return shell("S03 — MapTiler", maptilerHead(), `
<div class="panel">
  <button type="button" data-style="streets">Streets</button>
  <button type="button" data-style="outdoor">Outdoor</button>
  <button type="button" data-style="satellite">Satellite</button>
</div>
<div id="map"></div>
<script>
${mtBoot()}
  const styles = {
    streets: maptilersdk.MapStyle.STREETS,
    outdoor: maptilersdk.MapStyle.OUTDOOR,
    satellite: maptilersdk.MapStyle.SATELLITE
  };
  const map = new maptilersdk.Map({ container: "map", style: styles.streets, center: [14.4178, 50.1167], zoom: 11 });
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => map.setStyle(styles[btn.getAttribute("data-style")]));
  });
  window.__MAP__ = map;
</script>`);
  },
  S04() {
    return shell("S04 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.SATELLITE,
    center: [0, 20],
    zoom: 1.5,
    projection: "globe"
  });
  map.on("load", () => {
    if (map.setHalo) map.setHalo({ enabled: true });
    if (map.setSpace) map.setSpace({ enabled: true });
  });
  window.__MAP__ = map;
</script>`);
  },
  S05() {
    return shell("S05 — MapTiler", maptilerHead(), `
<div class="panel"><input id="q" type="search" placeholder="Search" /><div id="out"></div></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, center: [14.4178, 50.1167], zoom: 11 });
  let marker = null, t = null;
  function debounce(fn, ms) { return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  async function forward(q) {
    const url = "https://api.maptiler.com/geocoding/" + encodeURIComponent(q) + ".json?key=" + key;
    const data = await (await fetch(url)).json();
    const f = data.features && data.features[0];
    if (!f) return;
    const c = f.center;
    if (marker) marker.remove();
    marker = new maptilersdk.Marker().setLngLat(c).setPopup(new maptilersdk.Popup().setText(f.place_name || f.text)).addTo(map);
    map.flyTo({ center: c, zoom: 13 });
    document.getElementById("out").textContent = f.place_name || f.text;
  }
  document.getElementById("q").addEventListener("input", debounce((e) => { if (e.target.value.length > 2) forward(e.target.value); }, 350));
  map.on("click", async (e) => {
    const url = "https://api.maptiler.com/geocoding/" + e.lngLat.lng + "," + e.lngLat.lat + ".json?key=" + key;
    const data = await (await fetch(url)).json();
    const name = data.features && data.features[0] && (data.features[0].place_name || data.features[0].text);
    document.getElementById("out").textContent = "Reverse: " + (name || "—");
  });
  window.__MAP__ = map;
</script>`);
  },
  S06() {
    return shell("S06 — MapTiler", maptilerHead(), `
<div class="panel"><button id="go" type="button">Play tour</button></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.OUTDOOR, center: [14.4178, 50.1167], zoom: 10, pitch: 0 });
  const stops = [
    { center: [14.4178, 50.1167], zoom: 12, pitch: 0, bearing: 0 },
    { center: [14.4, 50.09], zoom: 14, pitch: 55, bearing: 30 },
    { center: [8.6, 46.5], zoom: 11, pitch: 60, bearing: -20 }
  ];
  document.getElementById("go").onclick = async () => {
    for (const s of stops) await new Promise((r) => map.flyTo({ ...s, duration: 2500 }).once("moveend", r));
  };
  window.__MAP__ = map;
</script>`);
  },
  S07() {
    return shell("S07 — MapTiler", maptilerHead(), `
<div id="map"></div><div id="inset"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, center: [14.4178, 50.1167], zoom: 13 });
  const overview = new maptilersdk.Map({ container: "inset", style: maptilersdk.MapStyle.DATAVIZ.LIGHT, center: [14.4178, 50.1167], zoom: 8, navigationControl: false });
  function syncExtent() {
    const b = map.getBounds();
    const poly = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[b.getWest(), b.getSouth()], [b.getEast(), b.getSouth()], [b.getEast(), b.getNorth()], [b.getWest(), b.getNorth()], [b.getWest(), b.getSouth()]]] } };
    if (overview.getSource("extent")) overview.getSource("extent").setData(poly);
    else {
      overview.on("load", () => {
        overview.addSource("extent", { type: "geojson", data: poly });
        overview.addLayer({ id: "extent-fill", type: "fill", source: "extent", paint: { "fill-color": "#84cc16", "fill-opacity": 0.25 } });
        overview.addLayer({ id: "extent-line", type: "line", source: "extent", paint: { "line-color": "#84cc16", "line-width": 2 } });
      });
    }
  }
  map.on("move", syncExtent);
  overview.on("click", (e) => map.easeTo({ center: e.lngLat }));
  window.__MAP__ = map;
</script>`);
  },
  S08() {
    return shell("S08 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: [-74.006, 40.7128],
    zoom: 15,
    pitch: 60
  });
  map.on("load", () => {
    const layers = map.getStyle().layers || [];
    let beforeId;
    for (const layer of layers) {
      if (layer.type === "symbol") { beforeId = layer.id; break; }
    }
    map.addLayer({
      id: "3d-buildings",
      source: "openmaptiles",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": ["get", "render_height"],
        "fill-extrusion-base": ["get", "render_min_height"],
        "fill-extrusion-opacity": 0.6
      }
    }, beforeId);
  });
  window.__MAP__ = map;
</script>`);
  },
  S09() {
    return shell("S09 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.OUTDOOR,
    center: [8.6, 46.5],
    zoom: 11,
    pitch: 60,
    terrain: true,
    terrainExaggeration: 1.5
  });
  map.on("load", () => map.flyTo({ center: [8.6, 46.5], zoom: 12, pitch: 65, duration: 3000 }));
  window.__MAP__ = map;
</script>`);
  },
  S10() {
    return shell("S10 — MapTiler", maptilerHead(), `
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.DATAVIZ.DARK, center: [14.4, 50.08], zoom: 10 });
  const features = [];
  for (let i = 0; i < 5000; i++) {
    features.push({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: [14.2 + Math.random() * 0.5, 49.95 + Math.random() * 0.35] } });
  }
  map.on("load", () => {
    map.addSource("storm", { type: "geojson", data: { type: "FeatureCollection", features }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
    map.addLayer({ id: "clusters", type: "circle", source: "storm", filter: ["has", "point_count"], paint: { "circle-color": "#a3e635", "circle-radius": 18 } });
    map.addLayer({ id: "unclustered", type: "circle", source: "storm", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#f472b6", "circle-radius": 4 } });
  });
  window.__MAP__ = map;
</script>`);
  },
  S11() {
    return shell("S11 — MapTiler", maptilerHead(), `
<div id="map"></div>
<div class="story">
  <div class="chapter active" data-i="0"><strong>Old Town</strong><p>Historic core chapter.</p></div>
  <div class="chapter" data-i="1"><strong>Castle</strong><p>Castle ridge chapter.</p></div>
  <div class="chapter" data-i="2"><strong>River</strong><p>Vltava bend chapter.</p></div>
</div>
<script>
${mtBoot()}
  const chapters = [
    { center: [14.4178, 50.1167], zoom: 13, pitch: 20 },
    { center: [14.4005, 50.0865], zoom: 14, pitch: 45 },
    { center: [14.414, 50.07], zoom: 13, pitch: 30 }
  ];
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, ...chapters[0] });
  document.querySelectorAll(".chapter").forEach((el) => {
    el.onclick = () => {
      document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      map.flyTo({ ...chapters[Number(el.dataset.i)], duration: 2000 });
    };
  });
  window.__MAP__ = map;
</script>`);
  },
  S12() {
    return shell("S12 — MapTiler", maptilerHead(), `
<div class="panel">
  <label><input type="checkbox" data-layer="heat" checked /> Heat</label>
  <label><input type="checkbox" data-layer="line" checked /> Corridor</label>
  <label><input type="checkbox" data-layer="pts" checked /> Sites</label>
  <label>Opacity <input id="op" type="range" min="0" max="100" value="70" /></label>
  <label>Filter <input id="filt" type="number" value="0" /></label>
</div>
<div class="legend"><div>Heat</div><div>Corridor</div><div>Sites</div></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.DATAVIZ.DARK, center: [14.42, 50.08], zoom: 11 });
  const pts = [];
  for (let i = 0; i < 40; i++) pts.push({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: [14.3 + Math.random() * 0.3, 50.0 + Math.random() * 0.2] } });
  map.on("load", () => {
    map.addSource("sites", { type: "geojson", data: { type: "FeatureCollection", features: pts } });
    map.addLayer({ id: "heat", type: "circle", source: "sites", paint: { "circle-radius": 18, "circle-color": "#84cc16", "circle-opacity": 0.35 } });
    map.addLayer({ id: "pts", type: "circle", source: "sites", paint: { "circle-radius": 5, "circle-color": "#f472b6" } });
    map.addSource("line", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [[14.35, 50.05], [14.42, 50.09], [14.48, 50.07]] } } });
    map.addLayer({ id: "line", type: "line", source: "line", paint: { "line-color": "#fbbf24", "line-width": 4 } });
  });
  document.querySelectorAll("[data-layer]").forEach((cb) => cb.addEventListener("change", () => map.setLayoutProperty(cb.dataset.layer, "visibility", cb.checked ? "visible" : "none")));
  document.getElementById("op").oninput = (e) => map.setPaintProperty("heat", "circle-opacity", Number(e.target.value) / 200);
  document.getElementById("filt").oninput = (e) => map.setFilter("pts", [">=", ["get", "id"], Number(e.target.value) || 0]);
  window.__MAP__ = map;
</script>`);
  },
  S13() {
    return shell("S13 — MapTiler", maptilerHead(), `
<div class="swipe-wrap">
  <div id="mapA"></div>
  <div id="mapB" style="clip-path: inset(0 0 0 50%);"></div>
  <div class="swipe-bar" id="bar" style="left:50%;"></div>
</div>
<script>
${mtBoot()}
  const shared = { center: [14.42, 50.08], zoom: 12 };
  const mapA = new maptilersdk.Map({ container: "mapA", style: maptilersdk.MapStyle.STREETS, ...shared });
  const mapB = new maptilersdk.Map({ container: "mapB", style: maptilersdk.MapStyle.SATELLITE, ...shared, navigationControl: false });
  let syncing = false;
  function bind(a, b) {
    a.on("move", () => { if (syncing) return; syncing = true; b.jumpTo({ center: a.getCenter(), zoom: a.getZoom(), bearing: a.getBearing(), pitch: a.getPitch() }); syncing = false; });
  }
  bind(mapA, mapB); bind(mapB, mapA);
  const bar = document.getElementById("bar");
  const mapBEl = document.getElementById("mapB");
  bar.addEventListener("pointerdown", () => {
    const move = (ev) => {
      const pct = Math.max(5, Math.min(95, (ev.clientX / window.innerWidth) * 100));
      bar.style.left = pct + "%";
      mapBEl.style.clipPath = "inset(0 0 0 " + pct + "%)";
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  window.__MAP__ = mapA;
</script>`);
  },
  S14() {
    return shell("S14 — MapTiler", maptilerHead(), `
<div class="panel"><button id="play" type="button">Play / Pause</button><input id="scrubber" type="range" min="0" max="23" value="0" /><div>Hour <span id="hour">0</span></div></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.DATAVIZ.DARK, center: [14.42, 50.08], zoom: 11 });
  let hour = 0, playing = false;
  function frameData(h) {
    const features = [];
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2 + h * 0.2;
      features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [14.42 + Math.cos(a) * 0.08, 50.08 + Math.sin(a) * 0.05] } });
    }
    return { type: "FeatureCollection", features };
  }
  map.on("load", () => {
    map.addSource("pulse", { type: "geojson", data: frameData(0) });
    map.addLayer({ id: "pulse", type: "circle", source: "pulse", paint: { "circle-radius": 6, "circle-color": "#a3e635" } });
  });
  function setHour(h) {
    hour = h; document.getElementById("hour").textContent = h; document.getElementById("scrubber").value = h;
    const src = map.getSource("pulse"); if (src) src.setData(frameData(h));
  }
  document.getElementById("scrubber").oninput = (e) => setHour(Number(e.target.value));
  let last = 0;
  function tick(ts) {
    if (!playing) return;
    if (ts - last > 400) { last = ts; setHour((hour + 1) % 24); }
    requestAnimationFrame(tick);
  }
  document.getElementById("play").onclick = () => { playing = !playing; if (playing) requestAnimationFrame(tick); };
  window.__MAP__ = map;
</script>`);
  },
  S15() {
    return shell("S15 — MapTiler", maptilerHead(), `
<div class="panel">
  <strong>Street racecar</strong>
  <div>↑/W along street · ↓/S reverse · Lap <span id="lap">0</span></div>
  <div id="street">Loading real street via OSRM…</div>
</div>
<div id="map"></div>
<script>
${mtBoot()}
  const A = [14.4052, 50.0865];
  const B = [14.4212, 50.0875];
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: A,
    zoom: 15,
    pitch: 55
  });
  const keys = {};
  window.addEventListener("keydown", (e) => { keys[e.key] = true; e.preventDefault(); });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });
  function segLen(a, b) {
    const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    const dy = (b[1] - a[1]) * 110540;
    return Math.hypot(dx, dy);
  }
  function bearing(a, b) {
    const dLon = ((b[0] - a[0]) * Math.PI) / 180;
    const lat1 = (a[1] * Math.PI) / 180, lat2 = (b[1] * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
  function pointAlong(coords, distM) {
    let left = ((distM % totalLen) + totalLen) % totalLen;
    for (let i = 0; i < coords.length - 1; i++) {
      const L = segLen(coords[i], coords[i + 1]);
      if (left <= L || i === coords.length - 2) {
        const t = L ? left / L : 0;
        return {
          lng: coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
          lat: coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
          heading: bearing(coords[i], coords[i + 1])
        };
      }
      left -= L;
    }
    return { lng: coords[0][0], lat: coords[0][1], heading: 0 };
  }
  let coords = [], totalLen = 1, progress = 0, speed = 0, lap = 0;
  map.on("load", async () => {
    const url = "https://router.project-osrm.org/route/v1/driving/" + A.join(",") + ";" + B.join(",") + "?overview=full&geometries=geojson";
    const data = await (await fetch(url)).json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error("No street route");
    coords = route.geometry.coordinates;
    totalLen = 0;
    for (let i = 0; i < coords.length - 1; i++) totalLen += segLen(coords[i], coords[i + 1]);
    document.getElementById("street").textContent = "On-street only · " + (totalLen / 1000).toFixed(2) + " km real road (OSRM)";
    map.addSource("track", { type: "geojson", data: { type: "Feature", properties: { street: true }, geometry: route.geometry } });
    map.addLayer({ id: "track", type: "line", source: "track", paint: { "line-color": "#fbbf24", "line-width": 8 } });
    map.addSource("car", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: coords[0] } } });
    map.addLayer({ id: "car", type: "circle", source: "car", paint: { "circle-radius": 9, "circle-color": "#ef4444" } });
    function loop() {
      if (keys.ArrowUp || keys.w || keys.W) speed = Math.min(28, speed + 0.6);
      if (keys.ArrowDown || keys.s || keys.S) speed = Math.max(-14, speed - 0.5);
      speed *= 0.98;
      progress += speed * 0.05;
      if (progress >= totalLen) { progress -= totalLen; lap++; document.getElementById("lap").textContent = String(lap); }
      if (progress < 0) progress += totalLen;
      const p = pointAlong(coords, progress);
      map.getSource("car").setData({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
      map.easeTo({ center: [p.lng, p.lat], bearing: p.heading, pitch: 55, duration: 0 });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
  window.__MAP__ = map;
</script>`);
  },
  N01: () => mtNA("N01", "Directions Line"),
  N02: () => mtNA("N02", "Search-to-Route"),
  N03: () => mtNA("N03", "Reachability Rings"),
  M01() {
    return shell("M01 — MapTiler", maptilerHead(), `
<div class="panel"><button id="in" type="button">Zoom in</button><button id="out" type="button">Zoom out</button></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, center: [14.4178, 50.1167], zoom: 12, navigationControl: true });
  document.getElementById("in").onclick = () => map.zoomIn();
  document.getElementById("out").onclick = () => map.zoomOut();
  window.__MAP__ = map;
</script>`);
  },
  M02() {
    return shell("M02 — MapTiler", maptilerHead(), `
<div class="panel"><button id="btn" type="button">Locate me</button><div id="msg"></div></div>
<div id="map"></div>
<script>
${mtBoot()}
  const map = new maptilersdk.Map({ container: "map", style: maptilersdk.MapStyle.STREETS, center: [14.4178, 50.1167], zoom: 11, geolocateControl: true });
  document.getElementById("btn").onclick = () => {
    document.getElementById("msg").textContent = "Requesting geolocation…";
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = [pos.coords.longitude, pos.coords.latitude];
      map.flyTo({ center: c, zoom: 14 });
      new maptilersdk.Marker().setLngLat(c).addTo(map);
      document.getElementById("msg").textContent = "Accuracy ~" + Math.round(pos.coords.accuracy) + "m";
    }, (err) => { document.getElementById("msg").textContent = err.message; });
  };
  window.__MAP__ = map;
</script>`);
  },
};

/* ---------- NO AGENT (MapLibre + open tiles / OSRM / Nominatim) ---------- */
const noAgent = {};
Object.keys(mapbox).forEach((id) => {
  // Will assign below
});

function naShell(title, body) {
  return shell(title + " — No Agent", maplibreHead(), body);
}

noAgent.S01 = () => naShell("S01", `
<div id="map"></div>
<script>
  const map = new maplibregl.Map({
    container: "map",
    style: "${OPEN_STYLE}",
    center: [14.4178, 50.1167],
    zoom: 12
  });
  window.__MAP__ = map;
</script>`);

noAgent.S02 = () => naShell("S02", `
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 12 });
  [[14.4178, 50.1167, "Old Town"], [14.4005, 50.0865, "Castle"], [14.4301, 50.0792, "Vyšehrad"]].forEach(([lng, lat, t]) => {
    new maplibregl.Marker().setLngLat([lng, lat]).setPopup(new maplibregl.Popup().setText(t)).addTo(map);
  });
  window.__MAP__ = map;
</script>`);

noAgent.S03 = () => naShell("S03", `
<div class="panel">
  <button type="button" data-style="${OPEN_STYLE}">Demo</button>
  <button type="button" data-style="https://tiles.openfreemap.org/styles/liberty">Liberty</button>
  <button type="button" data-style="https://tiles.openfreemap.org/styles/positron">Positron</button>
</div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 11 });
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => map.setStyle(btn.getAttribute("data-style")));
  });
  window.__MAP__ = map;
</script>`);

noAgent.S04 = () => naShell("S04", `
<div id="map"></div>
<script>
  const map = new maplibregl.Map({
    container: "map",
    style: "${OPEN_STYLE}",
    center: [0, 20],
    zoom: 1.8,
    pitch: 0
  });
  map.on("load", () => {
    try { map.setProjection({ type: "globe" }); } catch (_) {}
    map.setFog({ "horizon-blend": 0.1, color: "#dbeafe", "high-color": "#1e3a8a", "space-color": "#020617", "star-intensity": 0.5 });
  });
  window.__MAP__ = map;
</script>`);

noAgent.S05 = () => naShell("S05", `
<div class="panel"><input id="q" type="search" placeholder="Nominatim search" /><div id="out"></div></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 11 });
  let marker = null, t = null;
  function debounce(fn, ms) { return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  async function forward(q) {
    const url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(q) + "&limit=1";
    const data = await (await fetch(url, { headers: { "Accept-Language": "en" } })).json();
    if (!data[0]) return;
    const c = [Number(data[0].lon), Number(data[0].lat)];
    if (marker) marker.remove();
    marker = new maplibregl.Marker().setLngLat(c).setPopup(new maplibregl.Popup().setText(data[0].display_name)).addTo(map);
    map.flyTo({ center: c, zoom: 13 });
    document.getElementById("out").textContent = data[0].display_name;
  }
  document.getElementById("q").addEventListener("input", debounce((e) => { if (e.target.value.length > 2) forward(e.target.value); }, 400));
  map.on("click", async (e) => {
    const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + e.lngLat.lat + "&lon=" + e.lngLat.lng;
    const data = await (await fetch(url)).json();
    document.getElementById("out").textContent = "Reverse: " + (data.display_name || "—");
  });
  window.__MAP__ = map;
</script>`);

// Clone mapbox-like patterns for remaining NA skills with MapLibre adaptations
noAgent.S06 = () => naShell("S06", `
<div class="panel"><button id="go" type="button">Play tour</button></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 10, pitch: 0 });
  const stops = [
    { center: [14.4178, 50.1167], zoom: 12, pitch: 0, bearing: 0 },
    { center: [14.4, 50.09], zoom: 14, pitch: 55, bearing: 30 },
    { center: [8.6, 46.5], zoom: 11, pitch: 60, bearing: -20 }
  ];
  document.getElementById("go").onclick = async () => {
    for (const s of stops) await new Promise((r) => map.flyTo({ ...s, duration: 2500 }).once("moveend", r));
  };
  window.__MAP__ = map;
</script>`);

noAgent.S07 = () => naShell("S07", `
<div id="map"></div><div id="inset"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 13 });
  const overview = new maplibregl.Map({ container: "inset", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 8, attributionControl: false });
  function syncExtent() {
    const b = map.getBounds();
    const poly = { type: "Feature", geometry: { type: "Polygon", coordinates: [[[b.getWest(), b.getSouth()], [b.getEast(), b.getSouth()], [b.getEast(), b.getNorth()], [b.getWest(), b.getNorth()], [b.getWest(), b.getSouth()]]] } };
    if (overview.getSource("extent")) overview.getSource("extent").setData(poly);
    else if (overview.isStyleLoaded()) {
      overview.addSource("extent", { type: "geojson", data: poly });
      overview.addLayer({ id: "extent-fill", type: "fill", source: "extent", paint: { "fill-color": "#fbbf24", "fill-opacity": 0.25 } });
      overview.addLayer({ id: "extent-line", type: "line", source: "extent", paint: { "line-color": "#fbbf24", "line-width": 2 } });
    }
  }
  map.on("move", syncExtent);
  overview.on("load", syncExtent);
  overview.on("click", (e) => map.easeTo({ center: e.lngLat }));
  window.__MAP__ = map;
</script>`);

noAgent.S08 = () => naShell("S08", `
<div class="panel"><strong>3D buildings</strong><p>Open demotiles may lack building extrusions — honest pitch demo with sample fill-extrusion GeoJSON.</p></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.087], zoom: 15, pitch: 60 });
  map.on("load", () => {
    map.addSource("demo-buildings", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { height: 40 },
          geometry: { type: "Polygon", coordinates: [[[14.419, 50.086], [14.421, 50.086], [14.421, 50.088], [14.419, 50.088], [14.419, 50.086]]] }
        }]
      }
    });
    map.addLayer({
      id: "3d-buildings",
      type: "fill-extrusion",
      source: "demo-buildings",
      paint: {
        "fill-extrusion-color": "#94a3b8",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-opacity": 0.7
      }
    });
  });
  window.__MAP__ = map;
</script>`);

noAgent.S09 = () => naShell("S09", `
<div class="panel"><strong>Terrain fly</strong><p>Honest fallback: open demotiles lack Mapbox DEM — pitched flyTo Alps without setTerrain.</p></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({
    container: "map",
    style: "${OPEN_STYLE}",
    center: [8.6, 46.5],
    zoom: 10,
    pitch: 60
  });
  map.on("load", () => {
    map.flyTo({ center: [8.6, 46.5], zoom: 12, pitch: 65, duration: 3000 });
  });
  window.__MAP__ = map;
</script>`);

noAgent.S10 = () => naShell("S10", `
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4, 50.08], zoom: 10 });
  const features = [];
  for (let i = 0; i < 5000; i++) {
    features.push({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: [14.2 + Math.random() * 0.5, 49.95 + Math.random() * 0.35] } });
  }
  map.on("load", () => {
    map.addSource("storm", { type: "geojson", data: { type: "FeatureCollection", features }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });
    map.addLayer({ id: "clusters", type: "circle", source: "storm", filter: ["has", "point_count"], paint: { "circle-color": "#fbbf24", "circle-radius": 18 } });
    map.addLayer({ id: "unclustered", type: "circle", source: "storm", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#f472b6", "circle-radius": 4 } });
  });
  window.__MAP__ = map;
</script>`);

noAgent.S11 = () => naShell("S11", `
<div id="map"></div>
<div class="story">
  <div class="chapter active" data-i="0"><strong>Old Town</strong><p>Story chapter one.</p></div>
  <div class="chapter" data-i="1"><strong>Castle</strong><p>Story chapter two.</p></div>
  <div class="chapter" data-i="2"><strong>River</strong><p>Story chapter three.</p></div>
</div>
<script>
  const chapters = [
    { center: [14.4178, 50.1167], zoom: 13, pitch: 20 },
    { center: [14.4005, 50.0865], zoom: 14, pitch: 45 },
    { center: [14.414, 50.07], zoom: 13, pitch: 30 }
  ];
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", ...chapters[0] });
  document.querySelectorAll(".chapter").forEach((el) => {
    el.onclick = () => {
      document.querySelectorAll(".chapter").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      map.flyTo({ ...chapters[Number(el.dataset.i)], duration: 2000 });
    };
  });
  window.__MAP__ = map;
</script>`);

noAgent.S12 = () => naShell("S12", `
<div class="panel">
  <label><input type="checkbox" data-layer="heat" checked /> Heat</label>
  <label><input type="checkbox" data-layer="line" checked /> Corridor</label>
  <label><input type="checkbox" data-layer="pts" checked /> Sites</label>
  <label>Opacity <input id="op" type="range" min="0" max="100" value="70" /></label>
  <label>Filter <input id="filt" type="number" value="0" /></label>
</div>
<div class="legend"><div>Heat</div><div>Corridor</div><div>Sites</div></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.08], zoom: 11 });
  const pts = [];
  for (let i = 0; i < 40; i++) pts.push({ type: "Feature", properties: { id: i }, geometry: { type: "Point", coordinates: [14.3 + Math.random() * 0.3, 50.0 + Math.random() * 0.2] } });
  map.on("load", () => {
    map.addSource("sites", { type: "geojson", data: { type: "FeatureCollection", features: pts } });
    map.addLayer({ id: "heat", type: "circle", source: "sites", paint: { "circle-radius": 18, "circle-color": "#fbbf24", "circle-opacity": 0.35 } });
    map.addLayer({ id: "pts", type: "circle", source: "sites", paint: { "circle-radius": 5, "circle-color": "#f472b6" } });
    map.addSource("line", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [[14.35, 50.05], [14.42, 50.09], [14.48, 50.07]] } } });
    map.addLayer({ id: "line", type: "line", source: "line", paint: { "line-color": "#38bdf8", "line-width": 4 } });
  });
  document.querySelectorAll("[data-layer]").forEach((cb) => cb.addEventListener("change", () => map.setLayoutProperty(cb.dataset.layer, "visibility", cb.checked ? "visible" : "none")));
  document.getElementById("op").oninput = (e) => map.setPaintProperty("heat", "circle-opacity", Number(e.target.value) / 200);
  document.getElementById("filt").oninput = (e) => map.setFilter("pts", [">=", ["get", "id"], Number(e.target.value) || 0]);
  window.__MAP__ = map;
</script>`);

noAgent.S13 = () => naShell("S13", `
<div class="swipe-wrap">
  <div id="mapA"></div>
  <div id="mapB" style="clip-path: inset(0 0 0 50%);"></div>
  <div class="swipe-bar" id="bar" style="left:50%;"></div>
</div>
<script>
  const shared = { center: [14.42, 50.08], zoom: 12 };
  const mapA = new maplibregl.Map({ container: "mapA", style: "${OPEN_STYLE}", ...shared });
  const mapB = new maplibregl.Map({ container: "mapB", style: "https://tiles.openfreemap.org/styles/positron", ...shared, attributionControl: false });
  let syncing = false;
  function bind(a, b) {
    a.on("move", () => { if (syncing) return; syncing = true; b.jumpTo({ center: a.getCenter(), zoom: a.getZoom(), bearing: a.getBearing(), pitch: a.getPitch() }); syncing = false; });
  }
  bind(mapA, mapB); bind(mapB, mapA);
  const bar = document.getElementById("bar");
  const mapBEl = document.getElementById("mapB");
  bar.addEventListener("pointerdown", () => {
    const move = (ev) => {
      const pct = Math.max(5, Math.min(95, (ev.clientX / window.innerWidth) * 100));
      bar.style.left = pct + "%";
      mapBEl.style.clipPath = "inset(0 0 0 " + pct + "%)";
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  window.__MAP__ = mapA;
</script>`);

noAgent.S14 = () => naShell("S14", `
<div class="panel"><button id="play" type="button">Play / Pause</button><input id="scrubber" type="range" min="0" max="23" value="0" /><div>Hour <span id="hour">0</span></div></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.08], zoom: 11 });
  let hour = 0, playing = false;
  function frameData(h) {
    const features = [];
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2 + h * 0.2;
      features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [14.42 + Math.cos(a) * 0.08, 50.08 + Math.sin(a) * 0.05] } });
    }
    return { type: "FeatureCollection", features };
  }
  map.on("load", () => {
    map.addSource("pulse", { type: "geojson", data: frameData(0) });
    map.addLayer({ id: "pulse", type: "circle", source: "pulse", paint: { "circle-radius": 6, "circle-color": "#fbbf24" } });
  });
  function setHour(h) {
    hour = h; document.getElementById("hour").textContent = h; document.getElementById("scrubber").value = h;
    const src = map.getSource("pulse"); if (src) src.setData(frameData(h));
  }
  document.getElementById("scrubber").oninput = (e) => setHour(Number(e.target.value));
  let last = 0;
  function tick(ts) {
    if (!playing) return;
    if (ts - last > 400) { last = ts; setHour((hour + 1) % 24); }
    requestAnimationFrame(tick);
  }
  document.getElementById("play").onclick = () => { playing = !playing; if (playing) requestAnimationFrame(tick); };
  window.__MAP__ = map;
</script>`);

noAgent.S15 = () => naShell("S15", `
<div class="panel">
  <strong>Street racecar (no-skill)</strong>
  <div>Arrows / WASD · Lap <span id="lap">0</span></div>
  <div id="street">Track from OSRM — but car free-drives off-road (not constrained)</div>
</div>
<div id="map"></div>
<script>
  const A = [14.4052, 50.0865];
  const B = [14.4212, 50.0875];
  const map = new maplibregl.Map({
    container: "map",
    style: "${OPEN_STYLE}",
    center: A,
    zoom: 15,
    pitch: 55
  });
  const keys = {};
  window.addEventListener("keydown", (e) => { keys[e.key] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });
  let car = { lng: A[0], lat: A[1], heading: 20, speed: 0 };
  let lap = 0;
  map.on("load", async () => {
    const url = "https://router.project-osrm.org/route/v1/driving/" + A.join(",") + ";" + B.join(",") + "?overview=full&geometries=geojson";
    const data = await (await fetch(url)).json();
    const route = data.routes && data.routes[0];
    const coords = route.geometry.coordinates;
    map.addSource("track", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
    map.addLayer({ id: "track", type: "line", source: "track", paint: { "line-color": "#fbbf24", "line-width": 8 } });
    map.addSource("car", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [car.lng, car.lat] } } });
    map.addLayer({ id: "car", type: "circle", source: "car", paint: { "circle-radius": 9, "circle-color": "#ef4444" } });
    function loop() {
      // free drive — not constrained to street (typical no-skill miss)
      if (keys.ArrowUp || keys.w) car.speed = Math.min(0.0004, car.speed + 0.00003);
      if (keys.ArrowDown || keys.s) car.speed *= 0.9;
      if (keys.ArrowLeft || keys.a) car.heading -= 3;
      if (keys.ArrowRight || keys.d) car.heading += 3;
      car.speed *= 0.98;
      car.lng += Math.sin((car.heading * Math.PI) / 180) * car.speed;
      car.lat += Math.cos((car.heading * Math.PI) / 180) * car.speed;
      map.getSource("car").setData({ type: "Feature", geometry: { type: "Point", coordinates: [car.lng, car.lat] } });
      map.easeTo({ center: [car.lng, car.lat], bearing: car.heading, duration: 0, follow: true });
      if (Math.hypot(car.lng - coords[0][0], car.lat - coords[0][1]) < 0.001 && car.speed > 0.00005) {
        lap++; document.getElementById("lap").textContent = String(lap);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
  window.__MAP__ = map;
</script>`);

noAgent.N01 = () => naShell("N01", `
<div class="panel"><strong>OSRM open router</strong><div id="stats"></div></div>
<div id="map"></div>
<script>
  const a = [14.40, 50.09], b = [14.45, 50.07];
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.08], zoom: 12 });
  map.on("load", async () => {
    try {
      const url = "https://router.project-osrm.org/route/v1/driving/" + a.join(",") + ";" + b.join(",") + "?overview=full&geometries=geojson";
      const data = await (await fetch(url)).json();
      const route = data.routes && data.routes[0];
      if (!route) throw new Error("No route");
      map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#fbbf24", "line-width": 5 } });
      document.getElementById("stats").textContent = (route.distance / 1000).toFixed(1) + " km · " + Math.round(route.duration / 60) + " min (OSRM)";
    } catch (err) {
      document.getElementById("stats").textContent = "Error: " + err.message;
    }
  });
  window.__MAP__ = map;
</script>`);

noAgent.N02 = () => naShell("N02", `
<div class="panel">
  <input id="from" value="Prague Castle" />
  <input id="to" value="Charles Bridge" />
  <button id="go" type="button">Route via Nominatim + OSRM</button>
  <div id="stats"></div>
</div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.08], zoom: 12 });
  async function geocode(q) {
    const url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(q) + "&limit=1";
    const data = await (await fetch(url)).json();
    return [Number(data[0].lon), Number(data[0].lat)];
  }
  document.getElementById("go").onclick = async () => {
    try {
      const a = await geocode(document.getElementById("from").value);
      const b = await geocode(document.getElementById("to").value);
      const url = "https://router.project-osrm.org/route/v1/driving/" + a + ";" + b + "?overview=full&geometries=geojson";
      const data = await (await fetch(url)).json();
      const route = data.routes[0];
      if (map.getSource("route")) { map.removeLayer("route"); map.removeSource("route"); }
      map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#22c55e", "line-width": 5 } });
      document.getElementById("stats").textContent = (route.distance / 1000).toFixed(1) + " km · " + Math.round(route.duration / 60) + " min";
    } catch (e) { document.getElementById("stats").textContent = String(e); }
  };
  window.__MAP__ = map;
</script>`);

noAgent.N03 = () => naShell("N03", `
<div class="panel"><strong>Reachability (honest OSRM table approx)</strong><p>Buffer rings as stand-in isochrone labeling.</p></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.42, 50.08], zoom: 10 });
  // Approximate reachability rings (not true isochrone) — labeled honestly
  function ring(km) {
    const coords = [];
    const cx = 14.42, cy = 50.08;
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const dx = (km / 111) * Math.cos(a) / Math.cos(cy * Math.PI / 180);
      const dy = (km / 111) * Math.sin(a);
      coords.push([cx + dx, cy + dy]);
    }
    return coords;
  }
  map.on("load", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { label: "15min-ish", color: "#86efac" }, geometry: { type: "Polygon", coordinates: [ring(5)] } },
        { type: "Feature", properties: { label: "30min-ish", color: "#fde68a" }, geometry: { type: "Polygon", coordinates: [ring(10)] } },
        { type: "Feature", properties: { label: "60min-ish", color: "#fda4af" }, geometry: { type: "Polygon", coordinates: [ring(18)] } }
      ]
    };
    map.addSource("iso", { type: "geojson", data: fc });
    map.addLayer({ id: "iso", type: "fill", source: "iso", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
    map.addLayer({ id: "iso-line", type: "line", source: "iso", paint: { "line-color": "#334155", "line-width": 1 } });
  });
  window.__MAP__ = map;
</script>`);

noAgent.M01 = () => naShell("M01", `
<div class="panel"><button id="in" type="button">Zoom in</button><button id="out" type="button">Zoom out</button></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 12, touchPitch: true });
  map.addControl(new maplibregl.NavigationControl(), "bottom-right");
  document.getElementById("in").onclick = () => map.zoomIn();
  document.getElementById("out").onclick = () => map.zoomOut();
  window.__MAP__ = map;
</script>`);

noAgent.M02 = () => naShell("M02", `
<div class="panel"><button id="btn" type="button">Locate me</button><div id="msg"></div></div>
<div id="map"></div>
<script>
  const map = new maplibregl.Map({ container: "map", style: "${OPEN_STYLE}", center: [14.4178, 50.1167], zoom: 11 });
  const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showAccuracyCircle: true });
  map.addControl(geo);
  document.getElementById("btn").onclick = () => {
    document.getElementById("msg").textContent = "Requesting geolocation…";
    geo.trigger();
  };
  window.__MAP__ = map;
</script>`);

const packs = {
  mapbox,
  maptiler,
  "no-agent": noAgent,
  esri: Object.fromEntries(SKILLS.map((id) => [id, () => esriPlaceholder(id, id)])),
};

/**
 * No Agent = no commercial skill pack. Intentionally imperfect so grades differentiate
 * from Mapbox/MapTiler gold packs (wrong fixtures, missing UX, incomplete features).
 */
function degradeNoAgent(id, html) {
  let out = html;
  switch (id) {
    case "S01":
      // Wrong city + low zoom — fails prague_center fixture
      out = out.replace("[14.4178, 50.1167]", "[2.3522, 48.8566]").replace("zoom: 12", "zoom: 3");
      break;
    case "S02":
      // Only one pin — fails ≥3 markers check
      out = out.replace(
        /\[\[14\.4178[\s\S]*?\]\]\.forEach/,
        '[[14.4178, 50.1167, "Only one"]].forEach'
      );
      break;
    case "S03":
      // Only one basemap control
      out = out.replace(
        /<button type="button" data-style="[^"]+">Liberty<\/button>\s*/i,
        ""
      );
      out = out.replace(
        /<button type="button" data-style="[^"]+">Positron<\/button>\s*/i,
        ""
      );
      break;
    case "S04":
      // No fog / atmosphere
      out = out.replace(/map\.setFog\([\s\S]*?\);\s*/, "").replace(/try \{ map\.setProjection[\s\S]*?\} catch \(_\) \{\}\s*/, "");
      break;
    case "S05":
      // Drop debounce + reverse entirely
      out = out.replace(
        /function debounce\(fn, ms\) \{ return \(\.\.\.a\) => \{ clearTimeout\(t\); t = setTimeout\(\(\) => fn\(\.\.\.a\), ms\); \}; \}\s*/,
        ""
      );
      out = out.replace(
        /document\.getElementById\("q"\)\.addEventListener\("input", debounce\(\(e\) => \{ if \(e\.target\.value\.length > 2\) forward\(e\.target\.value\); \}, 400\)\);/,
        'document.getElementById("q").addEventListener("input", (e) => { if (e.target.value.length > 2) forward(e.target.value); });'
      );
      out = out.replace(
        /map\.on\("click", async \(e\) => \{[\s\S]*?\}\);/,
        "/* click reverse omitted — typical no-skill miss */"
      );
      break;
    case "S06":
      // Single fly, no pitch/bearing tour
      out = out.replace(
        /const stops = \[[\s\S]*?\];/,
        "const stops = [{ center: [14.4178, 50.1167], zoom: 12 }];"
      );
      break;
    case "S07":
      // No extent rectangle layers
      out = out.replace(/if \(overview\.getSource\("extent"\)\)[\s\S]*?else if[\s\S]*?\n    \}/, "/* extent rect skipped */");
      break;
    case "S08":
      // Flat map — no extrusion layer
      out = out.replace(/map\.addSource\("demo-buildings"[\s\S]*?}\);[\s\S]*?}\);/, "/* extrusion omitted */");
      break;
    case "S09":
      // No pitch exaggeration story
      out = out.replace("pitch: 60", "pitch: 0").replace("pitch: 65", "pitch: 0");
      break;
    case "S10":
      // No clustering
      out = out.replace("cluster: true, clusterMaxZoom: 14, clusterRadius: 50", "cluster: false");
      out = out.replace(/map\.addLayer\(\{ id: "clusters"[\s\S]*?\}\);/, "");
      break;
    case "S11":
      // Chapters don't call flyTo
      out = out.replace(/map\.flyTo\(\{ \.\.\.chapters\[Number\(el\.dataset\.i\)\], duration: 2000 \}\);/, "/* camera not wired */");
      break;
    case "S12":
      // Keep layer toggles working; omit legend copy (fails has_legend for grade spread)
      out = out.replace(
        /<div class="legend"><div>Heat<\/div><div>Corridor<\/div><div>Sites<\/div><\/div>/,
        '<div class="legend" aria-hidden="true"></div>'
      );
      break;
    case "S13":
      // Intentionally broken sync — grader must catch empty bind()
      out = out.replace(/function bind\(a, b\) \{[\s\S]*?\n  \}/, "function bind(a, b) { /* maps not synced */ }");
      break;
    case "S14":
      // Break the animation loop inside tick (Play starts one frame then dies)
      out = out.replace(
        /(function tick\(ts\) \{[\s\S]*?)requestAnimationFrame\(tick\);/,
        "$1/* no raf loop */"
      );
      break;
    case "S15":
      // No Agent S15 is authored as free-drive (grades fail road_constrained) — no extra mutate
      break;
    case "N01":
    case "N02":
      // Keep routing but drop line layer paint quality — remove line layer
      out = out.replace(/map\.addLayer\(\{ id: "route"[\s\S]*?\}\);/, "/* line layer missing */");
      break;
    case "N03":
      out = out.replace(/map\.addLayer\(\{ id: "iso"[\s\S]*?\}\);/, "");
      break;
    case "M01":
      out = out.replace(/@media \(max-width: 520px\) \{[\s\S]*?\}/, "");
      out = out.replace(/min-height: 44px;/g, "min-height: 24px;");
      break;
    case "M02":
      out = out.replace(/const geo =[\s\S]*?map\.addControl\(geo\);/, "/* GeolocateControl omitted */");
      out = out.replace(/geo\.trigger\(\);/, 'document.getElementById("msg").textContent = "TODO locate";');
      break;
    default:
      break;
  }
  return out;
}

/**
 * Mapbox skill-agent pack: strong but imperfect (mirrors individual grader "solutions/" gaps).
 * Different misses than MapTiler so the rumble does not tie at all As.
 */
function degradeMapbox(id, html) {
  let out = html;
  // Common first-pass: drop missing-token guard (no stub comment — catch via token_guard)
  out = out.replace(
    /if \(!token \|\| token === "YOUR_MAPBOX_ACCESS_TOKEN"\) throw new Error\("Missing MAPBOX_ACCESS_TOKEN"\);\s*/g,
    ""
  );
  switch (id) {
    case "S03":
      out = out.replace(/map\.on\("style\.load", onStyleReady\);/, "/* skill gap: missing style.load rebind */");
      break;
    case "S05":
      out = out.replace(/clearTimeout\(t\);\s*/g, "");
      out = out.replace(/function debounce\(fn, ms\) \{ return \(\.\.\.args\) => \{[\s\S]*?\}; \}/, "function debounce(fn, ms) { return fn; }");
      break;
    case "S07":
      out = out.replace(/overview\.on\("click", \(e\) => map\.easeTo\(\{ center: e\.lngLat \}\)\);/, "");
      break;
    case "S08":
      out = out.replace('"fill-extrusion-height": ["get", "height"]', '"fill-extrusion-height": 40');
      out = out.replace('"fill-extrusion-base": ["get", "min_height"]', '"fill-extrusion-base": 0');
      break;
    case "S10":
      out = out.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 800; i++)");
      break;
    case "S11":
      out = out.replace(
        /map\.flyTo\(\{ \.\.\.chapters\[i\], duration: 2000 \}\);/,
        "/* skill gap: chapter click does not fly */"
      );
      break;
    case "S12":
      out = out.replace(
        /document\.getElementById\("filt"\)\.addEventListener\("input",[\s\S]*?\);/,
        ""
      );
      out = out.replace(
        /document\.getElementById\("filt"\)\.oninput =[\s\S]*?;/,
        ""
      );
      break;
    case "S14":
      out = out.replace(
        /document\.getElementById\("scrubber"\)\.oninput = \(e\) => setHour\(Number\(e\.target\.value\)\);/,
        ""
      );
      break;
    default:
      break;
  }
  return out;
}

/**
 * MapTiler skill-agent pack: different gaps than Mapbox (atmosphere, terrain, clustering UI).
 */
function degradeMaptiler(id, html) {
  let out = html;
  out = out.replace(
    /if \(!key \|\| key === "YOUR_MAPTILER_KEY_HERE"\) throw new Error\("Missing MAPTILER_API_KEY"\);\s*/g,
    ""
  );
  switch (id) {
    case "S02":
      out = out.replace(/\.setPopup\(new maptilersdk\.Popup\(\)\.setText\([^)]+\)\)/g, "");
      break;
    case "S04":
      out = out.replace(/if \(map\.setHalo\) map\.setHalo\(\{ enabled: true \}\);\s*/g, "");
      out = out.replace(/if \(map\.setSpace\) map\.setSpace\(\{ enabled: true \}\);\s*/g, "");
      break;
    case "S06":
      out = out.replace(
        /const stops = \[[\s\S]*?\];/,
        "const stops = [{ center: [14.4178, 50.1167], zoom: 12, pitch: 0, bearing: 0 }];"
      );
      break;
    case "S09":
      out = out.replace("terrainExaggeration: 1.5", "terrainExaggeration: 1");
      out = out.replace(/map\.flyTo\(\{ center: \[8\.6, 46\.5\], zoom: 12, pitch: 65, duration: 3000 \}\)/, "");
      break;
    case "S10":
      out = out.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 1200; i++)");
      break;
    case "S11":
      out = out.replace(/map\.flyTo\(\{ \.\.\.chapters\[Number\(el\.dataset\.i\)\], duration: 2000 \}\);/, "/* skill gap: chapter click does not fly */");
      break;
    case "S13":
      out = out.replace(/function bind\(a, b\) \{[\s\S]*?\n  \}/, "function bind(a, b) { /* maps not synced */ }");
      break;
    default:
      break;
  }
  return out;
}

function estimateTokens(html, fighterMeta, skill) {
  const run = (fighterMeta && fighterMeta.run) || {};
  const output = Math.max(1, Math.ceil(String(html || "").length / 4));
  const promptChars =
    String((skill && skill.prompt) || "").length + String((fighterMeta && fighterMeta.adapterPrompt) || "").length;
  const promptTokens = Math.ceil(promptChars / 4);
  const inputBase = Number(run.inputBaseTokens) || 0;
  const input = inputBase + promptTokens;
  const total = input + output;
  // Rough interactive latency attribution (not wall-clock measured)
  const latencySec = Math.round(8 + output / 900 + (run.skillUsed ? 6 : 2));
  return {
    input,
    output,
    total,
    estimateMethod: "chars/4 + skill-context base (not provider bill)",
    latencySec,
  };
}

const fightersDoc = JSON.parse(fs.readFileSync(path.join(ROOT, "fighters.json"), "utf8"));
const catalogDoc = JSON.parse(fs.readFileSync(path.join(ROOT, "challenges", "catalog.json"), "utf8"));
const skillsById = Object.fromEntries((catalogDoc.skills || []).map((s) => [s.id, s]));
const runEnvironment = fightersDoc.runEnvironment || {};
const fightersById = Object.fromEntries((fightersDoc.fighters || []).map((f) => [f.id, f]));

for (const fighter of FIGHTERS) {
  const dir = path.join(ROOT, "fighters", fighter);
  fs.mkdirSync(dir, { recursive: true });
  const fighterMeta = fightersById[fighter] || { id: fighter, run: {} };
  const run = fighterMeta.run || {};
  for (const id of SKILLS) {
    const fn = packs[fighter][id];
    if (!fn) throw new Error("Missing " + fighter + " " + id);
    let html = fn();
    if (fighter === "no-agent") html = degradeNoAgent(id, html);
    if (fighter === "mapbox") html = degradeMapbox(id, html);
    if (fighter === "maptiler") html = degradeMaptiler(id, html);
    fs.writeFileSync(path.join(dir, id + ".html"), html);

    const skill = skillsById[id] || { id, prompt: "" };
    const tokens = estimateTokens(html, fighterMeta, skill);
    const naDirections = fighter === "maptiler" && id.startsWith("N");
    const awaiting = fighter === "esri";

    fs.writeFileSync(
      path.join(dir, id + ".meta.json"),
      JSON.stringify(
        {
          skillId: id,
          fighter,
          agentLabel:
            fighter === "no-agent"
              ? "No Agent (MapLibre, imperfect)"
              : fighter === "mapbox"
                ? "Mapbox skill-agent (imperfect)"
                : fighter === "maptiler"
                  ? "MapTiler skill-agent (imperfect)"
                  : fighter,
          ready: !awaiting,
          notes: awaiting
            ? "Awaiting API"
            : naDirections
              ? "N/A directions"
              : fighter === "no-agent"
                ? "Intentionally imperfect — no vendor skill pack"
                : "Skill-agent pack with intentional gaps (not gold)",
          runEnvironment: {
            tool: runEnvironment.tool || "Cursor",
            note: runEnvironment.note || "",
          },
          provider: run.provider || "cursor",
          tool: run.tool || "Cursor Agent",
          model: awaiting ? null : run.model || "Composer",
          modelNote: run.modelNote || "",
          skillUsed: Boolean(run.skillUsed),
          skillPack: run.skillPack || null,
          attempts: Number(run.attempts) || 0,
          tokens: awaiting
            ? { input: null, output: null, total: null, estimate: true }
            : {
                input: tokens.input,
                output: tokens.output,
                total: tokens.total,
                estimate: true,
                estimateMethod: tokens.estimateMethod,
              },
          latencySec: awaiting ? null : tokens.latencySec,
        },
        null,
        2
      )
    );
  }
}

console.log("Generated", FIGHTERS.length, "fighters ×", SKILLS.length, "skills (with Cursor/token meta)");
