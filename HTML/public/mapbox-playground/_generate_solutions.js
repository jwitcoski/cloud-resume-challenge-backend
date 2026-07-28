/**
 * Generate Mapbox playground solution packs (solutions / NoAgent / Improved).
 * Run: node HTML/public/mapbox-playground/_generate_solutions.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname);
const packs = {
  solutions: { skillUsed: true, agentLabel: "Cursor + mapbox-agent-skills", notes: "first skill run (intentional gaps)" },
  ImprovedAgentSolutions: {
    skillUsed: true,
    agentLabel: "Cursor Improved Skill",
    notes: "post-coaching improved pack (gold)",
  },
  NoAgentSolutions: { skillUsed: false, agentLabel: "Cursor (no Mapbox skill)", notes: "baseline without skills" },
};

const HEAD = (title) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
  <script src="../admin-boundaries/js/config.js"></script>
  <style>
    html, body { margin: 0; height: 100%; }
    #map { position: absolute; inset: 0; width: 100%; height: 100%; }
    .panel {
      position: absolute; z-index: 2; top: 12px; left: 12px;
      background: rgba(10,16,32,.92); color: #eef2ff; padding: 12px 14px;
      border-radius: 12px; max-width: min(360px, 92vw); font: 14px/1.4 system-ui, sans-serif;
      border: 1px solid rgba(255,255,255,.12);
    }
    .panel input, .panel button, .panel select {
      font: inherit; margin: 4px 0; width: 100%; box-sizing: border-box;
      border-radius: 8px; border: 1px solid #445; padding: 8px; background: #0f172a; color: #eef2ff;
    }
    .panel button { cursor: pointer; background: #2563eb; border-color: #3b82f6; }
    #list { list-style: none; padding: 0; margin: 8px 0 0; max-height: 240px; overflow: auto; }
    #list li { padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,.08); cursor: pointer; }
    #list li:hover { background: rgba(37,99,235,.25); }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    td, th { border-bottom: 1px solid rgba(255,255,255,.1); padding: 4px; text-align: left; }
  </style>
</head>
<body>
`;

const FOOT = `</body>\n</html>\n`;

function tokenBoot(extra = "") {
  return `
  const token = window.MAPBOX_ACCESS_TOKEN;
  if (!token || token === "YOUR_MAPBOX_ACCESS_TOKEN") {
    throw new Error("Missing MAPBOX_ACCESS_TOKEN — set it in admin-boundaries/js/config.js");
  }
  mapboxgl.accessToken = token;
  ${extra}`;
}

const solutions = {};

solutions.C1 = () =>
  HEAD("C1 Hello Map") +
  `<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [14.4178, 50.1167],
    zoom: 12
  });
  window.__MAP__ = map;
  map.on("load", () => parent.postMessage({ type: "mapbox-ready", facts: { challenge: "C1" } }, "*"));
</script>
` +
  FOOT;

solutions.C2 = () =>
  HEAD("C2 Fog and Lights") +
  `<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [-122.42, 37.78],
    zoom: 14,
    pitch: 45
  });
  map.on("style.load", () => {
    map.setFog({
      color: "rgb(186, 210, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.02,
      "space-color": "rgb(11, 11, 25)",
      "star-intensity": 0.6
    });
    map.setConfigProperty("basemap", "lightPreset", "dusk");
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C3 = () =>
  HEAD("C3 Terrain Fly") +
  `<div id="map"></div>
<script>
${tokenBoot()}
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
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    map.flyTo({ center: [8.6, 46.5], zoom: 12, pitch: 65, duration: 4000 });
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C4 = () =>
  HEAD("C4 Style Switcher") +
  `<div class="panel">
  <strong>Style switcher</strong>
  <button type="button" data-style="mapbox://styles/mapbox/standard">Standard</button>
  <button type="button" data-style="mapbox://styles/mapbox/outdoors-v12">Outdoors</button>
  <button type="button" data-style="mapbox://styles/mapbox/satellite-streets-v12">Satellite Streets</button>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [-73.9857, 40.7484],
    zoom: 12
  });
  function onStyleReady() {
    map.addControl(new mapboxgl.NavigationControl());
  }
  map.on("style.load", onStyleReady);
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => {
      map.setStyle(btn.getAttribute("data-style"));
    });
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C5 = () =>
  HEAD("C5 Geocode Roundtrip") +
  `<div class="panel">
  <label>Search</label>
  <input id="q" placeholder="Address or place" />
  <div id="out">Type to geocode. Click map to reverse.</div>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-77.0369, 38.9072],
    zoom: 11
  });
  const out = document.getElementById("out");
  let timer = null;
  async function forward(query) {
    try {
      const url = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(query)}.json?access_token=\${token}&limit=1\`;
      const res = await fetch(url);
      const data = await res.json();
      const f = data.features && data.features[0];
      if (!f) { out.textContent = "No results"; return; }
      out.textContent = "Forward: " + f.place_name;
      map.flyTo({ center: f.center, zoom: 13 });
      new mapboxgl.Marker().setLngLat(f.center).addTo(map);
    } catch (err) {
      out.textContent = "Geocode error: " + err.message;
    }
  }
  document.getElementById("q").addEventListener("input", (e) => {
    clearTimeout(timer);
    const v = e.target.value.trim();
    if (v.length < 3) return;
    timer = setTimeout(() => forward(v), 350);
  });
  map.on("click", async (e) => {
    try {
      const { lng, lat } = e.lngLat;
      const url = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${lng},\${lat}.json?access_token=\${token}&limit=1\`;
      const res = await fetch(url);
      const data = await res.json();
      const f = data.features && data.features[0];
      out.textContent = "Reverse: " + (f ? f.place_name : lng.toFixed(4) + ", " + lat.toFixed(4));
    } catch (err) {
      out.textContent = "Reverse error: " + err.message;
    }
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C6 = () =>
  HEAD("C6 Directions Line") +
  `<div class="panel"><div id="status">Loading route…</div></div>
<div id="map"></div>
<script>
${tokenBoot()}
  const origin = [-77.0369, 38.9072];
  const dest = [-77.050, 38.8895];
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: origin,
    zoom: 12
  });
  const status = document.getElementById("status");
  map.on("load", async () => {
    try {
      const url = \`https://api.mapbox.com/directions/v5/mapbox/driving/\${origin.join(",")};\${dest.join(",")}?geometries=geojson&overview=full&access_token=\${token}\`;
      const res = await fetch(url);
      const data = await res.json();
      const route = data.routes && data.routes[0];
      if (!route) throw new Error("No route");
      map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry } });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: { "line-color": "#3b82f6", "line-width": 5 }
      });
      status.textContent = \`Route: \${(route.distance/1000).toFixed(1)} km · \${Math.round(route.duration/60)} min\`;
    } catch (err) {
      status.textContent = "Directions error: " + err.message;
    }
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C7 = () =>
  HEAD("C7 3D Buildings") +
  `<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-74.0066, 40.7135],
    zoom: 15.5,
    pitch: 60,
    bearing: -17
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
    map.addLayer(
      {
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.7
        }
      },
      labelLayerId
    );
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.C8 = () =>
  HEAD("C8 Clustered Points") +
  `<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-103.5917, 40.6699],
    zoom: 3
  });
  const features = [];
  for (let i = 0; i < 5000; i++) {
    features.push({
      type: "Feature",
      properties: { id: i },
      geometry: {
        type: "Point",
        coordinates: [-103.5 + Math.random() * 20 - 10, 40.5 + Math.random() * 10 - 5]
      }
    });
  }
  map.on("load", () => {
    map.addSource("points", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "points",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#51bbd6",
        "circle-radius": ["step", ["get", "point_count"], 15, 100, 20, 750, 30]
      }
    });
    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "points",
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": "#11b4da", "circle-radius": 4 }
    });
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X1 = () =>
  HEAD("X1 Store Locator") +
  `<div class="panel">
  <strong>Store locator</strong>
  <input id="q" placeholder="Search near…" />
  <ul id="list"></ul>
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const stores = {
    type: "FeatureCollection",
    features: [
      { type:"Feature", properties:{ name:"Capitol Hill", address:"123 Mass Ave" }, geometry:{ type:"Point", coordinates:[-77.021,38.890] } },
      { type:"Feature", properties:{ name:"Dupont", address:"45 Dupont Cir" }, geometry:{ type:"Point", coordinates:[-77.043,38.910] } },
      { type:"Feature", properties:{ name:"Georgetown", address:"M St NW" }, geometry:{ type:"Point", coordinates:[-77.065,38.905] } },
      { type:"Feature", properties:{ name:"Navy Yard", address:"Half St SE" }, geometry:{ type:"Point", coordinates:[-77.005,38.876] } },
      { type:"Feature", properties:{ name:"Adams Morgan", address:"18th St NW" }, geometry:{ type:"Point", coordinates:[-77.042,38.921] } },
      { type:"Feature", properties:{ name:"U Street", address:"U St NW" }, geometry:{ type:"Point", coordinates:[-77.028,38.917] } },
      { type:"Feature", properties:{ name:"H Street", address:"H St NE" }, geometry:{ type:"Point", coordinates:[-76.995,38.900] } },
      { type:"Feature", properties:{ name:"Foggy Bottom", address:"GW Campus" }, geometry:{ type:"Point", coordinates:[-77.050,38.899] } }
    ]
  };
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-77.0369, 38.9072],
    zoom: 12
  });
  const list = document.getElementById("list");
  const out = document.getElementById("out");
  const markers = [];
  function renderList() {
    list.innerHTML = "";
    stores.features.forEach((f, i) => {
      const li = document.createElement("li");
      li.textContent = f.properties.name + " — " + f.properties.address;
      li.addEventListener("click", () => {
        map.flyTo({ center: f.geometry.coordinates, zoom: 14 });
        markers[i].togglePopup();
      });
      list.appendChild(li);
    });
  }
  map.on("load", () => {
    stores.features.forEach((f) => {
      const popup = new mapboxgl.Popup().setHTML("<strong>" + f.properties.name + "</strong><br>" + f.properties.address);
      markers.push(new mapboxgl.Marker().setLngLat(f.geometry.coordinates).setPopup(popup).addTo(map));
    });
    renderList();
  });
  let timer = null;
  document.getElementById("q").addEventListener("input", (e) => {
    clearTimeout(timer);
    const v = e.target.value.trim();
    if (v.length < 3) return;
    timer = setTimeout(async () => {
      try {
        const url = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(v)}.json?access_token=\${token}&proximity=-77.0369,38.9072&limit=1\`;
        const res = await fetch(url);
        const data = await res.json();
        const f = data.features && data.features[0];
        if (f) {
          out.textContent = "Near: " + f.place_name;
          map.flyTo({ center: f.center, zoom: 13 });
        }
      } catch (err) {
        out.textContent = err.message;
      }
    }, 300);
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X2 = () =>
  HEAD("X2 Search to Route") +
  `<div class="panel">
  <strong>Search → route</strong>
  <input id="origin" placeholder="Origin" value="Washington Monument, Washington, DC" />
  <input id="dest" placeholder="Destination" value="Lincoln Memorial, Washington, DC" />
  <button type="button" id="go">Route</button>
  <div id="stats"></div>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-77.0369, 38.9072],
    zoom: 12
  });
  const stats = document.getElementById("stats");
  async function geocode(q) {
    // proximity + DC bbox keep ambiguous names (Lincoln Memorial) local — not Illinois / Milwaukee
    const url = \`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(q)}.json?access_token=\${token}&proximity=-77.0369,38.9072&bbox=-77.15,38.79,-76.90,38.99&limit=1\`;
    const res = await fetch(url);
    const data = await res.json();
    const f = data.features && data.features[0];
    if (!f) throw new Error("No geocode for " + q);
    return f.center;
  }
  async function route() {
    try {
      const a = await geocode(document.getElementById("origin").value);
      const b = await geocode(document.getElementById("dest").value);
      const url = \`https://api.mapbox.com/directions/v5/mapbox/driving/\${a.join(",")};\${b.join(",")}?geometries=geojson&overview=full&access_token=\${token}\`;
      const res = await fetch(url);
      const data = await res.json();
      const r = data.routes && data.routes[0];
      if (!r) throw new Error("No route");
      if (map.getSource("route")) {
        map.getSource("route").setData({ type: "Feature", geometry: r.geometry });
      } else {
        map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: r.geometry } });
        map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#22c55e", "line-width": 5 } });
      }
      stats.textContent = "Distance " + (r.distance/1000).toFixed(2) + " km · Duration " + Math.round(r.duration/60) + " min";
      const bnds = new mapboxgl.LngLatBounds(a, a);
      bnds.extend(b);
      map.fitBounds(bnds, { padding: 60 });
    } catch (err) {
      stats.textContent = "Error: " + err.message;
    }
  }
  document.getElementById("go").addEventListener("click", route);
  map.on("load", route);
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X3 = () =>
  HEAD("X3 Matrix ETAs") +
  `<div class="panel">
  <strong>Matrix ETAs</strong>
  <div id="out">Loading…</div>
  <table id="eta"><thead><tr><th>Place</th><th>ETA</th></tr></thead><tbody></tbody></table>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const origin = [-77.0369, 38.9072];
  const dests = [
    { name: "Capitol", c: [-77.0091, 38.8899] },
    { name: "White House", c: [-77.0365, 38.8977] },
    { name: "National Zoo", c: [-77.049, 38.931] },
    { name: "Reagan Airport", c: [-77.0402, 38.8512] },
    { name: "Union Station", c: [-77.006, 38.8977] },
    { name: "Arlington Cemetery", c: [-77.072, 38.876] }
  ];
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: origin,
    zoom: 11
  });
  map.on("load", async () => {
    new mapboxgl.Marker({ color: "#2563eb" }).setLngLat(origin).addTo(map);
    dests.forEach((d) => new mapboxgl.Marker({ color: "#f59e0b" }).setLngLat(d.c).addTo(map));
    try {
      const coords = [origin].concat(dests.map((d) => d.c)).map((c) => c.join(",")).join(";");
      const url = \`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/\${coords}?sources=0&annotations=duration,distance&access_token=\${token}\`;
      const res = await fetch(url);
      const data = await res.json();
      const durations = (data.durations && data.durations[0]) || [];
      const tbody = document.querySelector("#eta tbody");
      tbody.innerHTML = "";
      dests.forEach((d, i) => {
        const sec = durations[i + 1];
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + d.name + "</td><td>" + (sec == null ? "—" : Math.round(sec/60) + " min") + "</td>";
        tbody.appendChild(tr);
      });
      document.getElementById("out").textContent = "Matrix driving ETAs from origin";
    } catch (err) {
      document.getElementById("out").textContent = "Matrix error: " + err.message;
    }
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X4 = () =>
  HEAD("X4 Isochrone Polygons") +
  `<div class="panel">
  <strong>Isochrones</strong>
  <div>Click map to set origin (15 / 30 / 60 min driving).</div>
  <div id="out"></div>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-77.0369, 38.9072],
    zoom: 10
  });
  const colors = { 15: "#22c55e", 30: "#eab308", 60: "#ef4444" };
  async function loadIsochrone(lng, lat) {
    try {
      const url = \`https://api.mapbox.com/isochrone/v1/mapbox/driving/\${lng},\${lat}?contours_minutes=15,30,60&polygons=true&access_token=\${token}\`;
      const res = await fetch(url);
      const data = await res.json();
      if (map.getSource("iso")) {
        map.getSource("iso").setData(data);
      } else {
        map.addSource("iso", { type: "geojson", data });
        map.addLayer({
          id: "iso-fill",
          type: "fill",
          source: "iso",
          paint: {
            "fill-color": ["match", ["get", "contour"], 15, colors[15], 30, colors[30], 60, colors[60], "#888"],
            "fill-opacity": 0.35
          }
        });
        map.addLayer({
          id: "iso-line",
          type: "line",
          source: "iso",
          paint: { "line-color": "#fff", "line-width": 1 }
        });
      }
      document.getElementById("out").textContent = "Isochrones at " + lng.toFixed(4) + ", " + lat.toFixed(4);
    } catch (err) {
      document.getElementById("out").textContent = "Isochrone error: " + err.message;
    }
  }
  map.on("load", () => loadIsochrone(-77.0369, 38.9072));
  map.on("click", (e) => loadIsochrone(e.lngLat.lng, e.lngLat.lat));
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X5 = () =>
  HEAD("X5 Perf Checklist") +
  `<div class="panel">
  <strong>Performance checklist</strong>
  <ul>
    <li>circle/symbol layers (not HTML Marker) for large sets</li>
    <li>cluster:true on GeoJSON</li>
    <li>debounce moveend with clearTimeout</li>
    <li>map.remove() on teardown</li>
  </ul>
  <div id="out">moves: 0</div>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-98, 39],
    zoom: 3
  });
  const features = [];
  for (let i = 0; i < 2000; i++) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-120 + Math.random()*40, 30 + Math.random()*15] }
    });
  }
  let moveTimer = null;
  let moves = 0;
  map.on("load", () => {
    map.addSource("pts", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      cluster: true,
      clusterRadius: 40
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "pts",
      filter: ["has", "point_count"],
      paint: { "circle-color": "#3b82f6", "circle-radius": 16 }
    });
    map.addLayer({
      id: "unclustered",
      type: "circle",
      source: "pts",
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-color": "#93c5fd", "circle-radius": 3 }
    });
  });
  map.on("moveend", () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      moves++;
      document.getElementById("out").textContent = "moves (debounced): " + moves;
    }, 200);
  });
  window.addEventListener("beforeunload", () => {
    map.remove();
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.X6 = () =>
  HEAD("X6 MapLibre Migration Honesty") +
  `<div class="panel" style="max-width:420px">
  <strong>Mapbox ↔ MapLibre migration</strong>
  <p><b>Access token:</b> Mapbox requires <code>mapboxgl.accessToken</code>. MapLibre typically needs <em>no</em> Mapbox token when using open styles.</p>
  <p><b>Style URL:</b> Mapbox uses <code>mapbox://styles/...</code>. MapLibre uses a public <code>style.json</code> (OSM/MapTiler/demotiles) — not mapbox://.</p>
  <p><b>Package:</b> <code>mapbox-gl</code> → <code>maplibre-gl</code>; global often <code>maplibregl</code>.</p>
  <p>Live map below is still Mapbox GL JS (token from config).</p>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [0, 20],
    zoom: 1.5
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

// ——— Insane ———
solutions.I1 = () => `import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Mapbox GL JS v3.9.x — React integration (mapbox-web-integration-patterns).
 * Full-viewport map, env token, error handler, and teardown on unmount.
 * Use with Vite (VITE_MAPBOX_ACCESS_TOKEN) or Next (NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN).
 */
export default function MapboxMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token =
      import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error("Missing MAPBOX_ACCESS_TOKEN in env");
    }
    mapboxgl.accessToken = token;
    if (!ref.current) return;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-77.0369, 38.9072],
      zoom: 11,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.resize();
    });
    map.on("error", (e) => {
      console.error("Mapbox error", e && e.error ? e.error : e);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minHeight: "100vh" }}
      aria-label="Mapbox map"
    />
  );
}
`;

solutions.I4 = () => `import SwiftUI
import MapboxMaps
import CoreLocation

/// Mapbox Maps SDK for iOS — SwiftUI (mapbox-ios-patterns)
/// Token: set MBXAccessToken in Info.plist / .xcconfig — never commit pk. literals.
/// Style: mapbox://styles/mapbox/streets-v12 via MapStyle.streets (or Standard).
struct ContentView: View {
  private let downtown = CLLocationCoordinate2D(latitude: 38.9072, longitude: -77.0369)
  private let lincoln = CLLocationCoordinate2D(latitude: 38.8893, longitude: -77.0502)

  var body: some View {
    Map(initialViewport: .camera(center: downtown, zoom: 11, bearing: 0, pitch: 0)) {
      MapViewAnnotation(coordinate: lincoln) {
        Text("Lincoln Memorial")
          .padding(6)
          .background(.blue.opacity(0.85))
          .foregroundStyle(.white)
          .clipShape(RoundedRectangle(cornerRadius: 6))
      }
      Puck2D(bearing: .heading)
    }
    .mapStyle(.streets) // mapbox://styles/mapbox/streets-v12
    .ignoresSafeArea()
  }
}

#Preview {
  ContentView()
}
`;

solutions.I5 = () => `package com.example.mapboxlab

import android.Manifest
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.mapbox.geojson.Point
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.mapbox.maps.extension.compose.style.MapStyle

/**
 * Jetpack Compose Mapbox (mapbox-android-patterns)
 * Token: BuildConfig.MAPBOX_ACCESS_TOKEN / local.properties — never hardcode pk.
 *
 * AndroidManifest.xml:
 * <uses-permission android:name="android.permission.INTERNET" />
 *
 * Coordinate order is longitude, latitude via Point.fromLngLat(lng, lat).
 */
@Composable
fun MapScreen(modifier: Modifier = Modifier) {
  val viewport = rememberMapViewportState {
    setCameraOptions {
      center(Point.fromLngLat(-77.0369, 38.9072)) // lng, lat — not lat,lng
      zoom(11.0)
      pitch(0.0)
    }
  }
  MapboxMap(
    modifier = modifier.fillMaxSize(),
    mapViewportState = viewport
  ) {
    MapStyle(style = "mapbox://styles/mapbox/streets-v12")
  }
}
`;

solutions.I6 = () => `import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';

/// Flutter Mapbox Maps (mapbox-flutter-patterns)
/// Pass token: flutter run --dart-define=ACCESS_TOKEN=pk...
/// Never commit a pk. literal into source control.
class MapPage extends StatelessWidget {
  const MapPage({super.key});

  static const String accessToken = String.fromEnvironment("ACCESS_TOKEN");
  static const String mapboxAccessToken = String.fromEnvironment("MAPBOX_ACCESS_TOKEN");

  @override
  Widget build(BuildContext context) {
    final token = accessToken.isNotEmpty ? accessToken : mapboxAccessToken;
    assert(token.isNotEmpty, "Missing ACCESS_TOKEN / MAPBOX_ACCESS_TOKEN");
    MapboxOptions.setAccessToken(token);
    return Scaffold(
      body: MapWidget(
        key: const ValueKey("mapWidget"),
        cameraOptions: CameraOptions(
          center: Point(coordinates: Position(-77.0369, 38.9072)),
          zoom: 11.0,
          bearing: 0,
          pitch: 0,
        ),
        styleUri: MapboxStyles.STREETS, // mapbox://styles/mapbox/streets-v12
        onMapCreated: (MapboxMap mapboxMap) async {
          // Ready for annotations / style tweaks
        },
      ),
    );
  }
}
`;

solutions.I7 = () => `import React, { useEffect } from "react";
import Mapbox, { MapView, Camera, PointAnnotation } from "@rnmapbox/maps";
import { View, StyleSheet, Text } from "react-native";
import Config from "react-native-config";

/**
 * React Native Mapbox (@rnmapbox/maps)
 * Token from react-native-config / env — never hardcode pk. in the bundle.
 */
const token = Config.MAPBOX_ACCESS_TOKEN;
if (!token) {
  throw new Error("Missing MAPBOX_ACCESS_TOKEN");
}
Mapbox.setAccessToken(token);

export default function MapScreen() {
  useEffect(() => {
    return () => {
      /* optional native teardown */
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} compassEnabled>
        <Camera zoomLevel={11} centerCoordinate={[-77.0369, 38.9072]} animationMode="flyTo" />
        <PointAnnotation id="dc" coordinate={[-77.0369, 38.9072]} title="Downtown DC">
          <View style={styles.dot}>
            <Text style={styles.dotLabel}>DC</Text>
          </View>
        </PointAnnotation>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  dotLabel: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
`;

solutions.I2 = () =>
  HEAD("I2 deck.gl on Mapbox") +
  `<div id="map"></div>
<script src="https://unpkg.com/deck.gl@9.1.14/dist.min.js"></script>
<script>
  // UMD build avoids broken jsDelivr +esm / loaders.gl named-export mismatches
  const { MapboxOverlay, ScatterplotLayer } = deck;
  ${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-122.4, 37.8],
    zoom: 11
  });
  map.on("error", (e) => console.error(e.error || e));
  const points = [];
  for (let i = 0; i < 80; i++) {
    points.push({ position: [-122.4 + (Math.random() - 0.5) * 0.2, 37.8 + (Math.random() - 0.5) * 0.2], r: 40 + Math.random() * 40 });
  }
  const overlay = new MapboxOverlay({
    interleaved: false,
    layers: [
      new ScatterplotLayer({
        id: "scatter",
        data: points,
        getPosition: (d) => d.position,
        getRadius: (d) => d.r,
        getFillColor: [34, 197, 94, 180],
        radiusUnits: "meters"
      })
    ]
  });
  map.addControl(overlay);
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.I3 = () =>
  HEAD("I3 Mapbox GL Draw") +
  `<link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js"></script>
<div class="panel"><strong>Draw</strong><div id="out">Draw a polygon or line</div></div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-77.0369, 38.9072],
    zoom: 12
  });
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, line_string: true, trash: true }
  });
  map.addControl(draw);
  const out = document.getElementById("out");
  map.on("draw.create", () => {
    const data = draw.getAll();
    out.textContent = "Features: " + data.features.length + " · GeoJSON ready";
  });
  map.on("draw.delete", () => {
    out.textContent = "Features: " + draw.getAll().features.length;
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

solutions.I8 = () =>
  HEAD("I8 Google Maps Migration") +
  `<div class="panel" style="max-width:440px;max-height:70vh;overflow:auto">
  <strong>Google Maps → Mapbox</strong>
  <p><b>Map:</b> <code>google.maps.Map</code> → <code>mapboxgl.Map</code></p>
  <p><b>LatLng trap:</b> Google often uses <code>lat, lng</code> / <code>LatLng(lat, lng)</code>. Mapbox GL uses <code>[lng, lat]</code>.</p>
  <p><b>Directions:</b> <code>DirectionsService</code> → Mapbox Directions API <code>directions/v5</code></p>
  <p><b>Places / Geocoder:</b> Google Places → Mapbox Search Box / Geocoding v5</p>
  <p>Live Mapbox map (not a Google embed):</p>
</div>
<div id="map"></div>
<script>
${tokenBoot()}
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-77.0369, 38.9072], // [lng, lat] — not LatLng(lat,lng)
    zoom: 12
  });
  window.__MAP__ = map;
</script>
` +
  FOOT;

const EXT = {
  I1: ".tsx",
  I2: ".html",
  I3: ".html",
  I4: ".swift",
  I5: ".kt",
  I6: ".dart",
  I7: ".tsx",
  I8: ".html",
};

/**
 * Skill-agent pack: mostly correct but misses coaching items (not a free 100%).
 * Improved pack keeps the full solutions[] output.
 */
function degradeSkill(id, html) {
  let h = html;
  // Drop missing-token guards (common first-pass miss). Comments must NOT echo check keywords.
  h = h.replace(
    /if \(!token \|\| token === "YOUR_MAPBOX_ACCESS_TOKEN"\) \{\s*throw new Error\([^)]+\);\s*\}/m,
    "/* omitted */"
  );
  if (id === "C4") {
    h = h.replace(/map\.on\("style\.load", onStyleReady\);/, "/* omitted */");
  }
  if (id === "C5") {
    h = h.replaceAll("clearTimeout(timer);", "/* omitted */");
    h = h.replace(/timer = setTimeout/g, "setTimeout"); // leave dangling assignment noise
  }
  if (id === "C7") {
    h = h.replace('"fill-extrusion-height": ["get", "height"]', '"fill-extrusion-height": 40');
  }
  if (id === "X4") {
    h = h.replace("contours_minutes=15,30,60", "contours_minutes=15,30");
  }
  if (id === "X5") {
    h = h.replace(/window\.addEventListener\("beforeunload", \(\) => \{\s*map\.remove\(\);\s*\}\);/m, "/* omitted */");
    h = h.replace(/<li>map\.remove\(\) on teardown<\/li>/, "");
    h = h.replaceAll("clearTimeout(moveTimer);", "/* omitted */");
  }
  if (id === "X6") {
    h = h.replace(
      /<p><b>Style URL:<\/b>[\s\S]*?<\/p>/,
      "<p><b>Style:</b> uses mapbox:// only in this draft</p>"
    );
  }
  if (id === "X2") {
    // First skill pass: no proximity/bbox + ambiguous defaults + fake stats (screenshot failure mode)
    h = h.replace(/&proximity=-77\.0369,38\.9072&bbox=-77\.15,38\.79,-76\.90,38\.99/, "");
    h = h.replace(
      'value="Washington Monument, Washington, DC"',
      'value="Washington Monument"'
    );
    h = h.replace(
      'value="Lincoln Memorial, Washington, DC"',
      'value="Lincoln Memorial"'
    );
    h = h.replace("Distance ", "Len ");
    h = h.replace("Duration ", "Time ");
    h = h.replace(/r\.distance/g, "r.legs && r.legs[0] && 1");
    h = h.replace(/r\.duration/g, "120");
  }
  if (id === "C8") {
    // First skill pass often under-samples
    h = h.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 800; i++)");
  }
  // Insane skill gaps
  if (id === "I1") {
    h = h.replace(/return \(\) => \{\s*map\.remove\(\);[\s\S]*?\};/m, "return () => {};");
  }
  if (id === "I2") {
    h = h.replace(/map\.on\("error"[\s\S]*?\);/, "/* omitted */");
    // First skill pass: jsDelivr +esm — runtime makeBatchFromTable crash (deck_stable_cdn fail)
    h = h.replace(
      /<script src="https:\/\/unpkg\.com\/deck\.gl@9\.1\.14\/dist\.min\.js"><\/script>\s*<script>\s*\/\/[^\n]*\n\s*const \{ MapboxOverlay, ScatterplotLayer \} = deck;/,
      `<script type="module">
  import { MapboxOverlay } from "https://cdn.jsdelivr.net/npm/@deck.gl/mapbox@9.0.0/+esm";
  import { ScatterplotLayer } from "https://cdn.jsdelivr.net/npm/@deck.gl/layers@9.0.0/+esm";`
    );
  }
  if (id === "I3") {
    // Must match the full handler — naive /[\s\S]*?\);/ stops at draw.getAll(); and leaves a dangling });
    // Comment must NOT contain "draw.create" (static check matches that substring).
    h = h.replace(
      /map\.on\("draw\.create", \(\) => \{\s*const data = draw\.getAll\(\);\s*out\.textContent = "Features: " \+ data\.features\.length \+ " · GeoJSON ready";\s*\}\);/,
      "/* skill gap: missing create handler */"
    );
  }
  if (id === "I4") {
    h = h.replace(/MapViewAnnotation[\s\S]*?\}\s*\}/m, "/* omitted annotation */");
  }
  if (id === "I5") {
    h = h.replace(/<uses-permission android:name="android.permission.INTERNET" \/>/, "");
  }
  if (id === "I7") {
    h = h.replace(/Mapbox\.setAccessToken\(token\);/, "/* omitted setAccessToken */");
  }
  if (id === "I8") {
    h = h.replace(/LatLng trap[\s\S]*?<\/p>/, "<p>coords differ</p>");
  }
  return h;
}

/** No-skill baseline: wrong pins, missing APIs, thin patterns */
function degradeNoAgent(id, html) {
  let h = html;
  h = h.replace(
    /if \(!token \|\| token === "YOUR_MAPBOX_ACCESS_TOKEN"\) \{\s*throw new Error\([^)]+\);\s*\}/m,
    "/* omitted */"
  );
  h = h.replaceAll("mapbox-gl-js/v3.9.0", "mapbox-gl-js/v2.15.0");
  // Drop Standard / fog / terrain honesty often missing without skill docs
  if (id === "C1") {
    h = h.replace("mapbox://styles/mapbox/standard", "mapbox://styles/mapbox/streets-v11");
  }
  if (id === "C2") {
    h = h.replace(/map\.setFog\([\s\S]*?\);/, "/* omitted fog */");
    h = h.replace(/map\.setConfigProperty\([\s\S]*?\);/, "/* omitted lights */");
  }
  if (id === "C3") {
    h = h.replace(/map\.setTerrain\([\s\S]*?\);/, "/* omitted */");
    h = h.replace(/map\.addSource\("mapbox-dem"[\s\S]*?\);/, "/* omitted dem */");
  }
  if (id === "C8" || id === "X5") {
    h = h.replace("for (let i = 0; i < 5000; i++)", "for (let i = 0; i < 200; i++)");
    h = h.replace("for (let i = 0; i < 2000; i++)", "for (let i = 0; i < 100; i++)");
    h = h.replace(/cluster:\s*true/, "cluster: false");
    h = h.replace(/cluster:true on GeoJSON/g, "points on the map");
    h = h.replace(/<li>map\.remove\(\) on teardown<\/li>/, "");
    h = h.replace(/window\.addEventListener\("beforeunload", \(\) => \{\s*map\.remove\(\);\s*\}\);/m, "/* omitted */");
    h = h.replaceAll("clearTimeout(moveTimer);", "/* omitted */");
  }
  if (id === "X4") {
    h = h.replace("contours_minutes=15,30,60", "contours_minutes=30");
    h = h.replace("isochrone/v1", "directions/v5"); // wrong API family
  }
  if (id === "C5" || id === "X1") {
    h = h.replaceAll("clearTimeout(timer);", "/* omitted */");
  }
  if (id === "X3") {
    h = h.replace("directions-matrix/v1/mapbox/driving/", "directions/v5/mapbox/driving/");
  }
  if (id === "X6") {
    h = h.replace(
      /<p><b>Access token:<\/b>[\s\S]*?<\/p>\s*<p><b>Style URL:<\/b>[\s\S]*?<\/p>\s*<p><b>Package:<\/b>[\s\S]*?<\/p>/,
      "<p>TODO: notes</p>"
    );
  }
  if (id === "C6" || id === "X2") {
    h = h.replace(/try \{([\s\S]*?)\} catch \(err\) \{[\s\S]*?\}/m, "$1");
  }
  if (id === "X2") {
    h = h.replace(/&proximity=-77\.0369,38\.9072&bbox=-77\.15,38\.79,-76\.90,38\.99/, "");
    h = h.replace(
      'value="Washington Monument, Washington, DC"',
      'value="Washington Monument"'
    );
    h = h.replace(
      'value="Lincoln Memorial, Washington, DC"',
      'value="Lincoln Memorial"'
    );
    // Same fake-stats failure mode as Skill so NoAgent does not outscore Skill on X2
    h = h.replace("Distance ", "Len ");
    h = h.replace("Duration ", "Time ");
    h = h.replace(/r\.distance/g, "r.legs && r.legs[0] && 1");
    h = h.replace(/r\.duration/g, "120");
  }
  if (id === "C4") {
    h = h.replace(/map\.on\("style\.load", onStyleReady\);/, "/* omitted */");
    // Only two styles — fails style_switcher_at_least_3
    h = h.replace(
      /<button type="button" data-style="mapbox:\/\/styles\/mapbox\/satellite-streets-v12">Satellite Streets<\/button>/,
      ""
    );
  }
  if (id === "C7") {
    h = h.replace('"fill-extrusion-height": ["get", "height"]', '"fill-extrusion-height": 40');
  }
  // Insane no-agent
  if (id === "I1") {
    h = h.replace(/import\.meta\.env[\s\S]*?NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;/, 'const token = "pk.eyJfake";');
    h = h.replace(/return \(\) => \{\s*map\.remove\(\);[\s\S]*?\};/m, "return () => {};");
  }
  if (id === "I2") {
    // Broken CDN + wrong control class (no MapboxOverlay)
    h = h.replace(
      /<script src="https:\/\/unpkg\.com\/deck\.gl@9\.1\.14\/dist\.min\.js"><\/script>\s*<script>\s*\/\/[^\n]*\n\s*const \{ MapboxOverlay, ScatterplotLayer \} = deck;/,
      `<script type="module">
  import { Deck } from "https://cdn.jsdelivr.net/npm/@deck.gl/core@9.0.0/+esm";
  import { ScatterplotLayer } from "https://cdn.jsdelivr.net/npm/@deck.gl/layers@9.0.0/+esm";`
    );
    h = h.replace(/new MapboxOverlay\(/g, "new Deck(");
  }
  if (id === "I3") {
    h = h.replace(/MapboxDraw/g, "DrawControl");
    h = h.replace(/mapbox-gl-draw/g, "leaflet-draw");
  }
  if (id === "I4") {
    h = h.replace(/import MapboxMaps/, "import MapKit");
    h = h.replace(/MapboxMaps/g, "MapKit");
  }
  if (id === "I5") {
    h = h.replace(/<uses-permission android:name="android.permission.INTERNET" \/>/, "");
    h = h.replace(/Point\.fromLngLat\(-77\.0369, 38\.9072\)/, "LatLng(38.9072, -77.0369)");
  }
  if (id === "I6") {
    h = h.replace(/mapbox_maps_flutter/g, "google_maps_flutter");
    h = h.replace(/MapWidget/g, "GoogleMap");
  }
  if (id === "I7") {
    h = h.replace(/@rnmapbox\/maps/g, "react-native-maps");
    h = h.replace(/Mapbox\.setAccessToken\(token\);/, "");
  }
  if (id === "I8") {
    h = h.replace(/Google Maps → Mapbox/, "Migration notes");
    h = h.replace(/DirectionsService[\s\S]*?<\/p>/, "");
    h = h.replace(/LatLng trap[\s\S]*?<\/p>/, "");
  }
  return h;
}

function metaFor(id, packKey, packMeta) {
  return {
    agentLabel: packMeta.agentLabel,
    provider: "cursor",
    model: packMeta.skillUsed ? "composer" : "composer-no-skill",
    skillUsed: packMeta.skillUsed,
    skillVersionNote: packMeta.skillUsed ? "mapbox-agent-skills @ .agents/skills" : "none",
    tokens: { input: null, output: null, total: null },
    costUsd: null,
    latencySec: null,
    attempts: packKey === "ImprovedAgentSolutions" ? 2 : 1,
    notes: packMeta.notes + " · " + id,
  };
}

for (const [packKey, packMeta] of Object.entries(packs)) {
  const dir = path.join(root, packKey);
  fs.mkdirSync(dir, { recursive: true });
  for (const id of Object.keys(solutions)) {
    let body = solutions[id]();
    if (packKey === "NoAgentSolutions") body = degradeNoAgent(id, body);
    else if (packKey === "solutions") body = degradeSkill(id, body);
    const ext = EXT[id] || ".html";
    // Remove stale alternate extensions from older runs
    for (const stale of [".html", ".tsx", ".swift", ".kt", ".dart", ".js"]) {
      const p = path.join(dir, id + stale);
      if (stale !== ext && fs.existsSync(p)) fs.unlinkSync(p);
    }
    fs.writeFileSync(path.join(dir, id + ext), body);
    fs.writeFileSync(path.join(dir, id + ".meta.json"), JSON.stringify(metaFor(id, packKey, packMeta), null, 2));
  }
  console.log("wrote", packKey, Object.keys(solutions).length);
}
console.log("done");
