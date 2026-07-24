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

ns.setTractState = function setTractState(tractId, patch) {
  try {
    // Prefer vector digboard (PMTiles); fall back to geojson source
    if (ns.map.getSource("digboard")) {
      ns.map.setFeatureState(
        { source: "digboard", sourceLayer: "tracts", id: tractId },
        patch
      );
    }
    if (ns.map.getSource("tracts")) {
      ns.map.setFeatureState({ source: "tracts", id: tractId }, patch);
    }
  } catch (_) {
    /* feature may not be ready */
  }
}

/** Console / #tract=ID helper — fly to a survey tract and pencil it if free. */

ns.flyToTract = function flyToTract(rawId, opts) {
  const id = String(rawId || "").trim();
  if (!id) return false;
  const s = state.scores[id];
  const feat = state.tractIndex[id];
  let lng = s && s.lng;
  let lat = s && s.lat;
  if ((lng == null || lat == null) && feat && feat.geometry) {
    const g = feat.geometry;
    const ring =
      g.type === "Polygon"
        ? g.coordinates[0]
        : g.type === "MultiPolygon"
          ? g.coordinates[0][0]
          : null;
    if (ring && ring.length) {
      let sx = 0;
      let sy = 0;
      for (const c of ring) {
        sx += c[0];
        sy += c[1];
      }
      lng = sx / ring.length;
      lat = sy / ring.length;
    }
  }
  if (lng == null || lat == null) {
    ns.toast("Tract " + id + " not on the board");
    return false;
  }
  ns.map.easeTo({
    center: [lng, lat],
    zoom: Math.max(ns.map.getZoom(), 16.2),
    duration: (opts && opts.duration) || 900,
  });
  if (state.started && !state.ended && !state.dug.has(id) && !state.selected.has(id)) {
    if (state.selected.size < ns.effectiveCrew()) {
      state.selected.add(id);
      ns.setTractState(id, { selected: true, dug: false, hit: false });
      ns.renderHud();
      ns.saveGame();
    }
  }
  ns.toast("Tract " + id + " — zoomed in", "hit");
  ns.logLine(`Chart jump · tract <strong>${id}</strong>`);
  return true;
}

window.digFlyToTract = ns.flyToTract;


ns.consumeTractHash = function consumeTractHash() {
  const m = /(?:^|[&#?])tract=([^&#]+)/i.exec(location.hash + location.search);
  if (!m) return;
  const id = decodeURIComponent(m[1]).trim();
  if (!id) return;
  setTimeout(() => ns.flyToTract(id), 400);
}


ns.refreshTractStates = function refreshTractStates() {
  for (const id of state.dug) {
    const hit = !!(state.reports[id] && state.reports[id].hit);
    ns.setTractState(id, { dug: true, selected: false, hit });
  }
  for (const id of state.selected) {
    if (!state.dug.has(id)) ns.setTractState(id, { selected: true, dug: false, hit: false });
  }
}


ns.topPeriods = function topPeriods(periods, limit) {
  return Object.entries(periods || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 3)
    .map(([k, n]) => `${PERIOD_LABELS[k] || k} ×${n}`);
}


ns.buildTractReport = function buildTractReport(id) {
  const s = state.scores[id] || {
    pottery: 0, lithics: 0, other: 0, structures: 0, periods: {}, value: 0, lng: null, lat: null,
  };
  const pottery = s.pottery || 0;
  const lithics = s.lithics || 0;
  const structures = s.structures || 0;
  const other = s.other || 0;
  const finds = pottery + lithics + structures + other;
  const hit = finds > 0 || (s.value || 0) > 0;
  let kind = "empty";
  if (pottery >= lithics && pottery >= structures && pottery > 0) kind = "pottery";
  else if (lithics >= structures && lithics > 0) kind = "lithics";
  else if (structures > 0) kind = "structures";
  else if (other > 0) kind = "other";
  const chapters = [];
  for (const m of MYSTERY) {
    let n = 0;
    for (const k of m.keys) n += (s.periods || {})[k] || 0;
    if (n > 0) chapters.push({ id: m.id, label: m.label, n });
  }
  return {
    id,
    hit,
    kind,
    pottery,
    lithics,
    structures,
    other,
    finds,
    value: s.value || 0,
    periods: s.periods || {},
    chapters,
    lng: s.lng,
    lat: s.lat,
    detail: hit
      ? [
          pottery ? `${pottery} pottery` : null,
          lithics ? `${lithics} lithics` : null,
          structures ? `${structures} structures` : null,
          other ? `${other} other` : null,
          s.value ? `+${s.value} glory` : null,
        ].filter(Boolean).join(" · ")
      : `The sieve is empty — −${emptyPenaltyPerTract()} glory`,
  };
}


ns.updateFindMarkers = function updateFindMarkers(freshIds) {
  const fresh = freshIds || new Set();
  const feats = [];
  for (const id of state.dug) {
    const r = state.reports[id] || ns.buildTractReport(id);
    if (!r.hit || r.lng == null || r.lat == null) continue;
    feats.push({
      type: "Feature",
      properties: {
        id,
        value: r.value,
        pottery: r.pottery,
        lithics: r.lithics,
        structures: r.structures,
        kind: r.kind,
        fresh: fresh.has(id) ? 1 : 0,
        label: r.detail,
      },
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
    });
  }
  const src = ns.map.getSource("find-markers");
  if (src) src.setData({ type: "FeatureCollection", features: feats });
}


ns.flashDugTracts = function flashDugTracts(reports) {
  if (!ns.map || !ns.map.getSource("dig-flash")) return;
  const features = [];
  for (const r of reports) {
    const f = state.tractIndex[r.id];
    if (!f || !f.geometry) continue;
    features.push({
      type: "Feature",
      properties: { id: r.id, hit: r.hit ? 1 : 0 },
      geometry: f.geometry,
    });
  }
  ns.map.getSource("dig-flash").setData({ type: "FeatureCollection", features });
  clearTimeout(ns.digFlashTimer);
  ns.digFlashTimer = setTimeout(() => {
    if (ns.map.getSource("dig-flash")) {
      ns.map.getSource("dig-flash").setData({ type: "FeatureCollection", features: [] });
    }
  }, 5500);
}


ns.focusDigBatch = function focusDigBatch(reports) {
  if (!ns.map || !reports.length) return;
  const coords = [];
  for (const r of reports) {
    if (r.lng != null && r.lat != null) coords.push([r.lng, r.lat]);
    else {
      const f = state.tractIndex[r.id];
      if (f && f.geometry && f.geometry.type === "Polygon") {
        coords.push(f.geometry.coordinates[0][0]);
      }
    }
  }
  if (!coords.length) return;
  if (coords.length === 1) {
    ns.map.easeTo({ center: coords[0], zoom: Math.max(ns.map.getZoom(), 15.2), duration: 900 });
    return;
  }
  let minX = coords[0][0], maxX = coords[0][0], minY = coords[0][1], maxY = coords[0][1];
  for (const [x, y] of coords) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ns.map.fitBounds(
    [[minX, minY], [maxX, maxY]],
    { padding: { top: 80, bottom: 80, left: 420, right: 80 }, maxZoom: 15.5, duration: 900 }
  );
}


ns.revealAllMaterials = function revealAllMaterials() {
  if (!ns.map || state.revealed) return;
  state.revealed = true;
  state.paused = false;
  document.getElementById("final").classList.remove("on");
  document.getElementById("revealBar").classList.add("on");
  document.querySelector(".hud")?.classList.remove("paused");

  // Lift every fog square so PMTiles finds show through.
  for (const tid of Object.keys(state.tractIndex)) {
    state.dug.add(tid);
    const hit = !!(state.reports[tid] && state.reports[tid].hit);
    ns.setTractState(tid, { dug: true, selected: false, hit });
  }

  ns.setLayerVis("tracts-fog", false);
  ns.setLayerVis("tracts-outline", true);
  ns.setLayerVis("tracts-pick", true);
  ns.setLayerVis("pottery-dots", true);
  ns.setLayerVis("lithics-dots", true);
  ns.setLayerVis("grids-line", true);
  ns.setLayerVis("structures-dots", true);
  ns.setLayerVis("find-heat", true);
  ns.setLayerVis("terraces-line", true);
  ns.setLayerVis("geology-fill", true);
  ns.setLayerVis("geology-outline", true);
  ns.setLayerVis("dig-flash-fill", false);
  ns.setLayerVis("dig-flash-line", false);

  if (ns.map.getLayer("geology-fill")) {
    ns.map.setPaintProperty("geology-fill", "fill-opacity", 0.22);
  }
  if (ns.map.getLayer("geology-outline")) {
    ns.map.setPaintProperty("geology-outline", "line-opacity", 0.55);
  }

  // Show find dots from farther out so the island reads as a survey map.
  for (const id of ["pottery-dots", "lithics-dots", "structures-dots"]) {
    if (ns.map.getLayer(id)) ns.map.setLayerZoomRange(id, 11, 24);
  }
  if (ns.map.getLayer("pottery-dots")) {
    ns.map.setPaintProperty("pottery-dots", "circle-opacity", 0.9);
  }
  if (ns.map.getLayer("lithics-dots")) {
    ns.map.setPaintProperty("lithics-dots", "circle-opacity", 0.9);
  }

  ns.map.fitBounds(
    [
      [ISLAND_BOUNDS[0], ISLAND_BOUNDS[1]],
      [ISLAND_BOUNDS[2], ISLAND_BOUNDS[3]],
    ],
    { padding: 48, duration: 1400, maxZoom: 13.6 }
  );

  ns.toast("Fog lifted — the island’s archaeology laid bare", "hit");
  ns.logLine(
    `<span class="hit">Reveal</span> · pottery, lithics, grids &amp; structures shown island-wide`,
    "hit"
  );
  ns.renderHud();
}


ns.digSelected = function digSelected() {
  if (!state.started || state.ended || state.paused || !state.selected.size) return;
  const batch = [...state.selected];
  const cost = batch.length * DIG_COST_PER_TRACT;
  const days = batch.length * DAYS_PER_TRACT;
  if (state.money < cost) {
    ns.toast("Purse is empty — the diggers won’t lift a shovel.");
    return;
  }
  if (state.days < days) {
    ns.toast("No days left on the permit.");
    return;
  }

  state.money -= cost;
  state.days -= days;

  const reports = [];
  let pottery = 0;
  let lithics = 0;
  let structures = 0;
  let gained = 0;

  for (const id of batch) {
    state.selected.delete(id);
    if (state.dug.has(id)) continue;
    state.dug.add(id);
    const r = ns.buildTractReport(id);
    state.reports[id] = r;
    ns.setTractState(id, { dug: true, selected: false, hit: r.hit });
    reports.push(r);
    pottery += r.pottery;
    lithics += r.lithics;
    structures += r.structures;
    gained += r.value;
    for (const [k, v] of Object.entries(r.periods || {})) {
      state.periods[k] = (state.periods[k] || 0) + v;
    }
  }

  if (!reports.length) {
    ns.renderHud();
    return;
  }

  const emptyCount = reports.filter((r) => !r.hit).length;
  const emptyPenalty = emptyCount * emptyPenaltyPerTract();
  ns.applyGlory(gained - emptyPenalty);
  state.barrenDigs += emptyCount;
  state.fruitfulDigs += reports.filter((r) => r.hit).length;
  state.digsDone += 1;
  ns.advanceTutorial("dig");
  ns.tickBusyCrew();
  const fresh = new Set(reports.filter((r) => r.hit).map((r) => r.id));
  ns.updateFindMarkers(fresh);
  ns.flashDugTracts(reports);
  ns.focusDigBatch(reports);
  ns.digSelected._pendingRelic = ns.relicEventForReports(reports);
  ns.showDigEvent(reports);
  ns.saveGame();

  const finds = pottery + lithics + structures;
  const fruitful = reports.filter((r) => r.hit).length;
  const net = gained - emptyPenalty;
  if (fruitful > 0) {
    ns.logLine(
      `<span class="hit">Paydirt ×${fruitful}</span> · ` +
        `${pottery} sherds · ${lithics} lithics · ${structures} ruins · ` +
        `glory ${net >= 0 ? "+" : ""}${net}` +
        (emptyCount ? ` (${emptyCount} barren)` : ""),
      "hit"
    );
    ns.toast(
      `Paydirt — net ${net >= 0 ? "+" : ""}${net} glory` +
        (emptyCount ? ` (−${emptyPenalty} barren)` : ""),
      "hit"
    );
  } else {
    ns.logLine(
      `<span class="miss">Dust</span> · ${reports.length} barren · −${emptyPenalty} glory`,
      "miss"
    );
    ns.toast(`Barren ground — −${emptyPenalty} glory`, "miss");
  }

  clearTimeout(ns.updateFindMarkers._freshT);
  ns.updateFindMarkers._freshT = setTimeout(() => ns.updateFindMarkers(), 5000);

  state.chapterQueue = ns.newlyCompletedChapters();
  const solved = ns.renderHud();
  if (solved >= MYSTERY.length) {
    ns.digSelected._pendingWin = true;
    return;
  }
  ns.digSelected._pendingWin = false;
  ns.digSelected._pendingLose = cannotAffordDig();
}


ns.onTractClick = function onTractClick(e) {
  if (!state.started || state.paused) return;
  if (state.ended && !state.revealed) return;
  if (document.getElementById("chapterBrief").classList.contains("on")) return;
  const f = (e.features || [])[0];
  if (!f) return;
  const id = String(f.id != null ? f.id : (f.properties && f.properties.Tract) || "");
  if (!id) return;
  if (state.dug.has(id) || state.revealed) {
    ns.showTractReport(id);
    return;
  }
  if (state.ended) return;
  if (state.selected.has(id)) {
    state.selected.delete(id);
    ns.setTractState(id, { selected: false, dug: false, hit: false });
  } else {
    if (state.selected.size >= ns.effectiveCrew()) {
      ns.toast(
        state.busyWorkers
          ? `Only ${ns.effectiveCrew()} free diggers (${state.busyWorkers} busy).`
          : `Only ${state.workers} diggers on the payroll. Hire help.`
      );
      return;
    }
    state.selected.add(id);
    ns.setTractState(id, { selected: true, dug: false, hit: false });
    ns.advanceTutorial("mark");
  }
  ns.renderHud();
  ns.saveGame();
}

