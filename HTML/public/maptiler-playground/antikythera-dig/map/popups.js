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

ns.landscapeArtUrl = function landscapeArtUrl(art) {
  if (!art) return "";
  return "images/landscape/" + encodeURIComponent(art) + ".png";
}


ns.findArtUrl = function findArtUrl(art) {
  if (!art) return "";
  return "images/finds/" + encodeURIComponent(art) + ".png";
}


ns.normalizeVesselType = function normalizeVesselType(raw) {
  if (!raw) return "";
  return String(raw).replace(/\?+$/, "").trim();
}


ns.artForPottery = function artForPottery(props) {
  const key = ns.normalizeVesselType(props && props.VesselType);
  return POTTERY_ART[key] || "";
}


ns.artForLithic = function artForLithic(props) {
  const p = props || {};
  const tool = p.ToolType;
  if (tool && tool !== "n" && LITHIC_TOOL_ART[tool]) return LITHIC_TOOL_ART[tool];
  const blank = String(p.PrimBlank || "").toLowerCase();
  const raw = p.MatSimple || p.Material || "";
  const mat = raw === "o" ? "o" : "c";
  return LITHIC_BLANK_ART[blank + "|" + mat] || "";
}


ns.landscapePopupHtml = function landscapePopupHtml(note) {
  const artSrc = note.artUrl || ns.landscapeArtUrl(note.art);
  const fallback = note.artFallback || "";
  const artHtml = artSrc
    ? `<img class="landscape-art" src="${artSrc}" alt="${note.title || "Landscape"}" ` +
      (fallback
        ? `data-fallback="${fallback}" onerror="if(this.dataset.fallback){const f=this.dataset.fallback;this.dataset.fallback='';this.src=f;}else{this.remove();}" `
        : `onerror="this.remove()" `) +
      `/>`
    : "";
  return (
    `<div class="dig-pop">` +
    `<p class="kind">${note.kind}</p>` +
    `<h3>${note.title}</h3>` +
    artHtml +
    `<p>${note.blurb}</p>` +
    `<p class="dig-tip"><strong>Dig tip:</strong> ${note.dig}</p>` +
    `</div>`
  );
}


ns.noteForGeology = function noteForGeology(props) {
  const type = (props && props.Type) || "";
  const base = GEOLOGY_NOTES[type] || {
    ...GEOLOGY_FALLBACK,
    title: type || GEOLOGY_FALLBACK.title,
  };
  const age = props && props.Age ? String(props.Age) : "";
  return {
    ...base,
    kind: age ? base.kind + " · " + age : base.kind,
  };
}


ns.noteForTerrace = function noteForTerrace(props) {
  const raw = props && props.code;
  const code = Number(raw);
  const key = Number.isFinite(code) ? code : 2;
  return TERRACE_NOTES[key] || TERRACE_FALLBACK;
}


ns.noteForStructure = function noteForStructure(props) {
  const type = (props && props.Type) || "";
  const base = STRUCTURE_NOTES[type] || {
    ...STRUCTURE_FALLBACK,
    title: type || STRUCTURE_FALLBACK.title,
  };
  const comments = props && props.Comments ? String(props.Comments) : "";
  const loc = props && props.LocErr != null ? String(props.LocErr) : "";
  let blurb = base.blurb;
  if (comments) blurb += ` Survey note: ${comments}.`;
  let kind = base.kind;
  if (loc) kind += ` · loc. ±${loc} m`;
  return { ...base, blurb, kind };
}


ns.closeLandscapePopup = function closeLandscapePopup() {
  if (ns.landscapePopup) ns.landscapePopup.remove();
}


ns.openLandscapePopup = function openLandscapePopup(lngLat, note) {
  if (!ns.map || !note) return;
  if (!ns.landscapePopup) {
    ns.landscapePopup = new maptilersdk.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "340px",
      className: "dig-popup",
      offset: 12,
    });
  }
  ns.landscapePopup.setLngLat(lngLat).setHTML(ns.landscapePopupHtml(note)).addTo(ns.map);
  ns.markLandscapeStudied();
}


ns.topPeriodKey = function topPeriodKey(periods) {
  let best = null;
  let n = -1;
  for (const [k, v] of Object.entries(periods || {})) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}


ns.findHoverStory = function findHoverStory(r) {
  const top = ns.topPeriodKey(r.periods);
  const periodLabel = top ? (PERIOD_LABELS[top] || top) : null;
  const why =
    (top && PERIOD_WHY[top]) ||
    FIND_KIND_WHY[r.kind] ||
    FIND_KIND_WHY.empty;
  const chapterLine = (r.chapters || [])
    .slice(0, 2)
    .map((c) => `${c.label} (+${c.n})`)
    .join(" · ");
  const title = r.hit
    ? (periodLabel ? periodLabel + " ground" : "Fruitful tract")
    : "Barren tract";
  const found = r.hit
    ? r.detail
    : "Opened and empty — the crew bags nothing but dust.";
  return { title, found, why, chapterLine, periodLabel };
}


ns.findHoverHtml = function findHoverHtml(r) {
  const story = ns.findHoverStory(r);
  return (
    `<div class="dig-pop">` +
    `<p class="kind">Tract ${r.id}${r.hit ? " · excavated" : " · excavated (empty)"}</p>` +
    `<h3>${story.title}</h3>` +
    `<p><strong>What turned up:</strong> ${story.found}</p>` +
    (story.chapterLine ? `<p><strong>Chapters:</strong> ${story.chapterLine}</p>` : "") +
    `<p class="dig-tip"><strong>Why it matters:</strong> ${story.why}</p>` +
    `</div>`
  );
}


ns.topScoredPeriod = function topScoredPeriod(props) {
  let best = null;
  let n = 0;
  for (const k of PERIOD_SCORE_KEYS) {
    const v = Number(props && props[k]);
    if (Number.isFinite(v) && v > n) {
      n = v;
      best = k;
    }
  }
  return best ? { key: best, score: n } : null;
}


ns.noteForPottery = function noteForPottery(props) {
  const p = props || {};
  const vessel = VESSEL_TYPE[p.VesselType] || p.VesselType || "Pottery sherd";
  const part = VESSEL_PART[p.VesselPart] || p.VesselPart || "Sherd";
  const other = p.OtherType && p.OtherType !== "U" ? String(p.OtherType) : "";
  const fabric = p.FabricType ? String(p.FabricType) : "";
  const coarse = COARSENESS[p.Coarseness] || "";
  const thick = THICKNESS[p.Thickness] || "";
  const dated = ns.topScoredPeriod(p);
  const periodLine = dated
    ? `${PERIOD_LABELS[dated.key] || dated.key} (survey confidence ${dated.score}%)`
    : "Period uncertain";
  const why = (dated && PERIOD_WHY[dated.key]) || FIND_KIND_WHY.pottery;
  const bits = [part, coarse, thick].filter(Boolean).join(" · ");
  let blurb = `${vessel}${other ? " — " + other : ""}.`;
  if (fabric) blurb += ` Fabric: ${fabric}.`;
  if (p.Comments) blurb += ` ${String(p.Comments).slice(0, 160)}${String(p.Comments).length > 160 ? "…" : ""}`;
  return {
    kind: "Pottery · " + periodLine,
    title: other && other.length < 40 ? other : vessel,
    blurb: bits ? `${bits}. ${blurb}` : blurb,
    dig: why,
    art: ns.artForPottery(p),
    key: "p:" + (p.UID || Math.random()),
  };
}


ns.noteForLithic = function noteForLithic(props) {
  const p = props || {};
  const mat = LITHIC_MATERIAL[p.Material] || LITHIC_MATERIAL[p.MatSimple] || p.Material || "Stone";
  const blank = LITHIC_BLANK[p.PrimBlank] || p.PrimBlank || "Lithic";
  const tool = LITHIC_TOOL[p.ToolType] || p.ToolType || "";
  const sec = p.SecBlank ? String(p.SecBlank) : "";
  const isObsidian = p.MatSimple === "o" || p.Material === "o";
  const title = tool && tool !== "Unretouched piece" ? tool : blank;
  let blurb = `${mat}. Primary form: ${blank}${sec ? " (" + sec + ")" : ""}.`;
  if (tool) blurb += ` Tool class: ${tool}.`;
  if (p.Length && p.Length !== "NA") {
    blurb += ` Size ~${p.Length}×${p.Width || "?"}×${p.Thickness || "?"} mm.`;
  }
  if (p.ProjNotes) blurb += ` Note: ${p.ProjNotes}.`;
  const dig = isObsidian
    ? "Obsidian almost certainly crossed the sea from Melos — a portable clue to early Aegean networks, not local bedrock."
    : (tool && tool !== "Unretouched piece"
      ? "A shaped tool means someone finished the job here — hunting, cutting, or craft — not just discarded waste."
      : FIND_KIND_WHY.lithics);
  return {
    kind: "Lithic · stone tool / debitage",
    title,
    blurb,
    dig,
    art: ns.artForLithic(p),
    key: "l:" + (p.UID || Math.random()),
  };
}


ns.artefactHoverHtml = function artefactHoverHtml(note) {
  const artSrc = ns.findArtUrl(note.art);
  const artHtml = artSrc
    ? `<img class="landscape-art" src="${artSrc}" alt="${note.title || "Find"}" />`
    : "";
  return (
    `<div class="dig-pop">` +
    `<p class="kind">${note.kind}</p>` +
    `<h3>${note.title}</h3>` +
    artHtml +
    `<p>${note.blurb}</p>` +
    `<p class="dig-tip"><strong>Why it matters:</strong> ${note.dig}</p>` +
    `</div>`
  );
}


ns.hideFindHover = function hideFindHover() {
  ns.hoverKey = null;
  if (ns.findHoverPopup) ns.findHoverPopup.remove();
}


ns.ensureFindHoverPopup = function ensureFindHoverPopup() {
  if (!ns.findHoverPopup) {
    ns.findHoverPopup = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "300px",
      className: "dig-popup",
      offset: 14,
    });
  }
  return ns.findHoverPopup;
}


ns.showArtefactHover = function showArtefactHover(feature, lngLat) {
  if (!ns.map || state.paused || (state.ended && !state.revealed)) return;
  if (document.getElementById("digEvent").classList.contains("on")) return;
  const layerId = feature.layer && feature.layer.id;
  const note = layerId === "lithics-dots"
    ? ns.noteForLithic(feature.properties)
    : ns.noteForPottery(feature.properties);
  const popup = ns.ensureFindHoverPopup();
  if (ns.hoverKey !== note.key) {
    ns.hoverKey = note.key;
    popup.setHTML(ns.artefactHoverHtml(note));
  }
  popup.setLngLat(lngLat).addTo(ns.map);
}


ns.showFindHover = function showFindHover(id, lngLat) {
  if (!ns.map || state.paused || (state.ended && !state.revealed)) return;
  if (document.getElementById("digEvent").classList.contains("on")) return;
  const r = state.reports[id] || ns.buildTractReport(id);
  state.reports[id] = r;
  const popup = ns.ensureFindHoverPopup();
  const key = "t:" + id;
  if (ns.hoverKey !== key) {
    ns.hoverKey = key;
    popup.setHTML(ns.findHoverHtml(r));
  }
  popup.setLngLat(lngLat).addTo(ns.map);
}


ns.queryArtefactAt = function queryArtefactAt(point) {
  const pad = 5;
  return ns.map.queryRenderedFeatures(
    [
      [point.x - pad, point.y - pad],
      [point.x + pad, point.y + pad],
    ],
    { layers: ["pottery-dots", "lithics-dots"] }
  );
}


ns.handleDugHover = function handleDugHover(e, tractId) {
  const artefacts = ns.queryArtefactAt(e.point);
  if (artefacts.length) {
    ns.map.getCanvas().style.cursor = "help";
    ns.showArtefactHover(artefacts[0], e.lngLat);
    return;
  }
  ns.map.getCanvas().style.cursor = "help";
  ns.showFindHover(tractId, e.lngLat);
}

