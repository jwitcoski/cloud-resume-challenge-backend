import { ns } from '../ns.js';
import {
  TRACTS_URL, SCORES_URL, TRACTS_FALLBACK, DIGBOARD_URL, FINDS_URL, SURVEY_URL,
  CENTER, ISLAND_BOUNDS,
} from '../config.js';
import { MYSTERY } from '../data/mystery.js';
import { GLORY_EMPTY_PENALTY, GLORY_RANKS } from '../data/glory-ranks.js';
import { FIELD_EVENTS } from '../data/field-events.js';
import {
  GEOLOGY_NOTES, GEOLOGY_FALLBACK, TERRACE_NOTES, TERRACE_FALLBACK,
  STRUCTURE_NOTES, STRUCTURE_FALLBACK,
} from '../data/landscape-notes.js';
import { PERIOD_LABELS, PERIOD_WHY, FIND_KIND_WHY, PERIOD_SCORE_KEYS } from '../data/periods.js';
import {
  VESSEL_TYPE, VESSEL_PART, COARSENESS, THICKNESS,
  LITHIC_MATERIAL, LITHIC_BLANK, LITHIC_TOOL,
  POTTERY_ART, LITHIC_TOOL_ART, LITHIC_BLANK_ART,
} from '../data/finds-lexicon.js';
import {
  state, boot, SAVE_KEY, FOLIO_KEY, TUTORIAL_KEY,
  HIRE_COST, MAX_WORKERS, MIN_WORKERS, DIG_COST_PER_TRACT, DAYS_PER_TRACT,
  FIELD_EVENT_CHANCE,
  money, gloryRank, nextGloryRank, cannotAffordDig, emptyPenaltyPerTract,
} from '../game/state.js';

ns.boot = async function boot() {
  if (!window.MAPTILER_API_KEY) {
    throw new Error("Set window.MAPTILER_API_KEY in admin-boundaries/js/config.js");
  }
  maptilersdk.config.apiKey = window.MAPTILER_API_KEY;

  const digboardHref = ns.absUrl(DIGBOARD_URL);
  const findsHref = ns.absUrl(FINDS_URL);
  const surveyHref = ns.absUrl(SURVEY_URL);
  console.info("[Antikythera Dig] digboard", digboardHref);
  console.info("[Antikythera Dig] finds", findsHref);
  console.info("[Antikythera Dig] survey", surveyHref);

  const digHead = await fetch(digboardHref, { method: "HEAD" });
  const findsHead = await fetch(findsHref, { method: "HEAD" });
  const surveyHead = await fetch(surveyHref, { method: "HEAD" });
  if (!digHead.ok) throw new Error("Digboard PMTiles HTTP " + digHead.status + " at " + digboardHref);
  if (!findsHead.ok) throw new Error("Finds PMTiles HTTP " + findsHead.status + " at " + findsHref);
  if (!surveyHead.ok) throw new Error("Survey PMTiles HTTP " + surveyHead.status + " at " + surveyHref);

  const digArchive = new pmtiles.PMTiles(digboardHref);
  const findsArchive = new pmtiles.PMTiles(findsHref);
  const surveyArchive = new pmtiles.PMTiles(surveyHref);
  ns.registerNamedPmtilesProtocol({
    digboard: digArchive,
    finds: findsArchive,
    survey: surveyArchive,
  });

  const [scores, tractsFc, digHeader, findsHeader] = await Promise.all([
    ns.loadJson(SCORES_URL),
    ns.loadJson(TRACTS_URL, TRACTS_FALLBACK),
    digArchive.getHeader(),
    findsArchive.getHeader(),
  ]);
  state.scores = scores;
  console.info(
    "[Antikythera Dig] archives ok",
    "digboard z" + digHeader.minZoom + "-" + digHeader.maxZoom,
    "finds z" + findsHeader.minZoom + "-" + findsHeader.maxZoom
  );

  for (const f of tractsFc.features || []) {
    const tid = String((f.properties && f.properties.Tract) || "");
    f.id = tid;
    if (f.properties) f.properties.Tract = tid;
    if (tid) state.tractIndex[tid] = f;
  }

  ns.map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.HYBRID,
    center: CENTER,
    zoom: 13.2,
    pitch: 0,
    maxPitch: 60,
    navigationControl: true,
    geolocateControl: false,
  });

  ns.map.on("error", (e) => {
    const msg = (e && e.error && e.error.message) || "Map error";
    console.warn(msg, e);
    if (/api.?key|401|403/i.test(msg)) ns.fail("MapTiler API key issue: " + msg, e.error);
    else if (/pmtiles|Invalid PMTiles|Failed to fetch|Unknown pmtiles/i.test(msg)) {
      ns.logLine(`<span class="miss">Chart fault</span> · ${msg}`);
    }
  });

  await new Promise((resolve) => ns.map.once("load", resolve));

  ns.map.addSource("tracts", {
    type: "geojson",
    data: tractsFc,
    promoteId: "Tract",
  });

  ns.addPmtilesVectorSource("digboard", "digboard", {
    tracts: "Tract",
    grids: "Square",
    structures: "SID",
  });
  ns.addPmtilesVectorSource("finds", "finds");
  ns.addPmtilesVectorSource("survey", "survey");

  ns.map.addSource("find-markers", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  ns.map.addSource("period-hint", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  ns.map.addSource("dig-flash", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // Survey detail sits UNDER fog so undug tracts hide pottery/grids/ruins.
  // Digging drops fog opacity to 0 and the real finds show through the hole.
  ns.map.addLayer({
    id: "geology-fill",
    type: "fill",
    source: "digboard",
    "source-layer": "geology",
    paint: {
      "fill-color": [
        "match", ["get", "Type"],
        "Alluvium", "#d4a017",
        "Scree", "#8a8478",
        "Flysch", "#6b4f2e",
        "Nummulitic limestones", "#f0e6c8",
        "Rudist bearing limestones", "#c9b8a0",
        "Brecciated limestones", "#a89a88",
        "Clastic carbonate series", "#b5a67a",
        "Marls,Sandstones,Conglomerates", "#7a6b4a",
        "#9a8b6e",
      ],
      "fill-opacity": 0.18,
      "fill-antialias": true,
    },
  });

  ns.map.addLayer({
    id: "geology-outline",
    type: "line",
    source: "digboard",
    "source-layer": "geology",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#2a1f14",
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        12, 0.6,
        15, 1.2,
        17, 1.8,
      ],
      "line-opacity": 0.85,
    },
  });

  ns.map.addLayer({
    id: "terraces-line",
    type: "line",
    source: "survey",
    "source-layer": "terraces",
    layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
    minzoom: 11,
    paint: {
      "line-color": [
        "match", ["to-number", ["get", "code"]],
        0, "#8a4a2a",
        1, "#c45c26",
        2, "#b85c38",
        "#b85c38",
      ],
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        11, 0.5,
        13, 0.9,
        15, 1.5,
        17, 2.4,
      ],
      "line-opacity": [
        "match", ["to-number", ["get", "code"]],
        0, 0.55,
        1, 0.8,
        2, 0.95,
        0.85,
      ],
    },
  });

  ns.map.addLayer({
    id: "grids-line",
    type: "line",
    source: "digboard",
    "source-layer": "grids",
    minzoom: 14,
    paint: {
      "line-color": "rgba(166,124,45,0.7)",
      "line-width": 1.0,
    },
  });

  ns.map.addLayer({
    id: "structures-dots",
    type: "circle",
    source: "digboard",
    "source-layer": "structures",
    minzoom: 12,
    paint: {
      "circle-radius": [
        "match", ["get", "Type"],
        "church", 5.5,
        "lighthouse", 5.5,
        "windmill", 5,
        "watermill", 5,
        "threshing floor", 4.8,
        "wine press", 4.5,
        "well", 4.5,
        "cistern", 4.3,
        "rock shelter", 4.2,
        3.4,
      ],
      "circle-color": [
        "match", ["get", "Type"],
        "old house", "#8b2e2e",
        "new house", "#b85a4a",
        "shelter", "#5c6b3a",
        "rock shelter", "#4a5a6b",
        "well", "#2f6f8f",
        "cistern", "#3a6a8a",
        "threshing floor", "#c4963a",
        "wine press", "#b8860b",
        "press", "#a67c2d",
        "tomb?", "#6b4a6b",
        "possible limekiln", "#6a5a48",
        "church", "#e8d9b8",
        "windmill", "#5a5a5a",
        "watermill", "#4a5a6a",
        "gun emplacement", "#3a4030",
        "lighthouse", "#d4a017",
        "#8b2e2e",
      ],
      "circle-stroke-width": [
        "match", ["get", "Type"],
        "church", 1.6,
        "threshing floor", 1.4,
        "well", 1.3,
        1,
      ],
      "circle-stroke-color": [
        "match", ["get", "Type"],
        "church", "#5c1c1c",
        "#e8d9b8",
      ],
      "circle-opacity": 0.92,
    },
  });

  ns.map.addLayer({
    id: "pottery-dots",
    type: "circle",
    source: "finds",
    "source-layer": "pottery",
    minzoom: 14,
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        14, 2.4,
        16, 4.2,
        17, 5.5,
      ],
      "circle-color": "#c4963a",
      "circle-opacity": 0.95,
      "circle-stroke-width": 0.6,
      "circle-stroke-color": "#fff6d0",
    },
  });

  ns.map.addLayer({
    id: "lithics-dots",
    type: "circle",
    source: "finds",
    "source-layer": "lithics",
    minzoom: 14,
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        14, 2.6,
        16, 4.5,
        17, 5.8,
      ],
      "circle-color": "#5c6b8a",
      "circle-opacity": 0.95,
      "circle-stroke-width": 0.6,
      "circle-stroke-color": "#dce4f0",
    },
  });

  // Solid cover until excavated — undug/selected stay fully opaque.
  ns.map.addLayer({
    id: "tracts-fog",
    type: "fill",
    source: "tracts",
    paint: {
      "fill-color": [
        "case",
        ["boolean", ["feature-state", "dug"], false], "#000000",
        ["boolean", ["feature-state", "selected"], false], "#a67c2d",
        "#2a2116",
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "dug"], false], 0,
        1,
      ],
    },
  });

  ns.map.addLayer({
    id: "tracts-outline",
    type: "line",
    source: "tracts",
    paint: {
      "line-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false], "#e8c56a",
        ["all",
          ["boolean", ["feature-state", "dug"], false],
          ["boolean", ["feature-state", "hit"], false]
        ], "#d4a017",
        ["boolean", ["feature-state", "dug"], false], "#6a7060",
        "rgba(232,217,184,0.35)",
      ],
      "line-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false], 2.8,
        ["all",
          ["boolean", ["feature-state", "dug"], false],
          ["boolean", ["feature-state", "hit"], false]
        ], 3.2,
        ["boolean", ["feature-state", "dug"], false], 1.6,
        0.55,
      ],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "dug"], false], 0.95,
        0.55,
      ],
    },
  });

  // Temporary dig flash on just-opened tracts (under pick so clicks still work)
  ns.map.addLayer({
    id: "dig-flash-fill",
    type: "fill",
    source: "dig-flash",
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "hit"], 1], "#d4a017",
        "#6a7060",
      ],
      "fill-opacity": 0.4,
    },
  });

  ns.map.addLayer({
    id: "dig-flash-line",
    type: "line",
    source: "dig-flash",
    paint: {
      "line-color": [
        "case",
        ["==", ["get", "hit"], 1], "#f0d060",
        "#9aa090",
      ],
      "line-width": 3.5,
      "line-opacity": 0.95,
    },
  });

  // Invisible pick layer so dug (clear) tracts stay clickable for find reports
  ns.map.addLayer({
    id: "tracts-pick",
    type: "fill",
    source: "tracts",
    paint: {
      "fill-color": "#000000",
      "fill-opacity": 0.01,
    },
  });

  // Soft “search here” halo from journal chapter hover — sits on fog, hides no finds.
  ns.map.addLayer({
    id: "period-hint-fill",
    type: "fill",
    source: "period-hint",
    paint: {
      "fill-color": "#c4963a",
      "fill-opacity": 0.22,
    },
  });

  ns.map.addLayer({
    id: "period-hint-line",
    type: "line",
    source: "period-hint",
    paint: {
      "line-color": "#e8c56a",
      "line-width": 2.2,
      "line-dasharray": [1.2, 1.2],
      "line-opacity": 0.9,
    },
  });

  // Glory markers on fruitful digs — kind-colored, fresh ones read larger
  ns.map.addLayer({
    id: "find-heat",
    type: "circle",
    source: "find-markers",
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        12,
        ["case", ["==", ["get", "fresh"], 1], 10, 5],
        15,
        [
          "case",
          ["==", ["get", "fresh"], 1],
          ["interpolate", ["linear"], ["get", "value"], 0, 12, 500, 18, 3000, 26],
          ["interpolate", ["linear"], ["get", "value"], 0, 6, 500, 12, 3000, 20],
        ],
      ],
      "circle-color": [
        "match", ["get", "kind"],
        "pottery", "#c4963a",
        "lithics", "#5c6b8a",
        "structures", "#8b2e2e",
        "other", "#8b7355",
        "#c4963a",
      ],
      "circle-opacity": [
        "case",
        ["==", ["get", "fresh"], 1], 0.95,
        0.75,
      ],
      "circle-stroke-width": [
        "case",
        ["==", ["get", "fresh"], 1], 3.5,
        1.6,
      ],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "fresh"], 1], "#fff6d0",
        "#e8d9b8",
      ],
    },
  });

  ns.wireMapInteractions();
  ns.finishBoot(tractsFc, digHeader, findsHeader);
}
