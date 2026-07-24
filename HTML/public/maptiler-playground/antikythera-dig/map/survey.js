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

ns.setLayerVis = function setLayerVis(id, visible) {
  if (!ns.map || !ns.map.getLayer(id)) return;
  ns.map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}


ns.setSurveyMode = function setSurveyMode(on) {
  if (!ns.map || !state.started || state.ended) return;
  state.paused = !!on;

  if (state.paused) {
    for (const id of state.selected) {
      ns.setTractState(id, {
        selected: false,
        dug: state.dug.has(id),
        hit: !!(state.reports[id] && state.reports[id].hit),
      });
    }
    state.selected.clear();
    ns.hideEraTip();
    ns.hideDigEvent();
    ns.hideFindHover();
    ns.hideFieldEvent();
    ns.hideChapterBrief();
    ns.closeLandscapePopup();
  } else {
    ns.closeLandscapePopup();
  }

  // Dig board off while scouting
  ns.setLayerVis("tracts-fog", !state.paused);
  ns.setLayerVis("tracts-outline", !state.paused);
  ns.setLayerVis("tracts-pick", !state.paused);
  ns.setLayerVis("pottery-dots", !state.paused);
  ns.setLayerVis("lithics-dots", !state.paused);
  ns.setLayerVis("grids-line", !state.paused);
  ns.setLayerVis("dig-flash-fill", !state.paused);
  ns.setLayerVis("dig-flash-line", !state.paused);

  // Landscape layers on
  ns.setLayerVis("terraces-line", state.paused);
  ns.setLayerVis("geology-outline", state.paused);
  ns.setLayerVis("structures-dots", true);
  ns.setLayerVis("geology-fill", true);
  ns.setLayerVis("find-heat", true);

  if (ns.map.getLayer("geology-fill")) {
    ns.map.setPaintProperty("geology-fill", "fill-opacity", state.paused ? 0.72 : 0.18);
  }
  if (ns.map.getLayer("geology-outline")) {
    ns.map.setPaintProperty("geology-outline", "line-opacity", state.paused ? 0.9 : 0);
  }

  document.querySelector(".hud").classList.toggle("paused", state.paused);
  const btn = document.getElementById("btnSurvey");
  btn.classList.toggle("on", state.paused);
  btn.textContent = state.paused ? "Resume digging" : "Study landscape";

  ns.toast(state.paused
    ? "Dig paused — click geology or terraces for notes"
    : "Fog restored — shovels ready");
  if (!state.paused) ns.advanceTutorial("survey");
  ns.renderHud();
  ns.saveGame();
}


ns.circlePolygon = function circlePolygon(lng, lat, radiusKm, steps) {
  const n = steps || 48;
  const ring = [];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dLng = (radiusKm / (111.32 * cosLat)) * Math.cos(a);
    const dLat = (radiusKm / 110.57) * Math.sin(a);
    ring.push([lng + dLng, lat + dLat]);
  }
  return { type: "Polygon", coordinates: [ring] };
}


ns.placeGloryTip = function placeGloryTip(anchorEl) {
  const tip = document.getElementById("gloryTip");
  tip.hidden = false;
  tip.classList.add("on");
  const r = anchorEl.getBoundingClientRect();
  const tipW = Math.min(320, window.innerWidth - 24);
  let left = r.right + 12;
  if (left + tipW > window.innerWidth - 12) left = Math.max(12, r.left - tipW - 12);
  tip.style.left = left + "px";
  tip.style.width = tipW + "px";
  requestAnimationFrame(() => {
    const h = tip.offsetHeight || 200;
    let top = r.top;
    if (top + h > window.innerHeight - 12) top = Math.max(12, window.innerHeight - h - 12);
    tip.style.top = top + "px";
  });
}


ns.showGloryTip = function showGloryTip(anchorEl) {
  const rank = gloryRank(state.score);
  const nxt = nextGloryRank(state.score);
  const tip = document.getElementById("gloryTip");
  const nextLine = nxt
    ? `Next: ${nxt.title} at ${nxt.min} glory (${Math.max(0, nxt.min - state.score)} to go).`
    : "You sit at the top of the ladder.";
  tip.innerHTML =
    `<img class="rank-art" src="${ns.rankArtUrl(rank.id)}" alt="${rank.title}" />` +
    `<p class="eyebrow">Academic rank · ${state.score} glory</p>` +
    `<h3>${rank.title}</h3>` +
    `<p>${rank.blurb}</p>` +
    `<p style="margin-top:8px;color:var(--muted)">${nextLine}</p>`;
  const tipImg = tip.querySelector(".rank-art");
  if (tipImg) tipImg.onerror = () => tipImg.remove();
  ns.placeGloryTip(anchorEl);
}


ns.hideGloryTip = function hideGloryTip() {
  const tip = document.getElementById("gloryTip");
  tip.classList.remove("on");
  tip.hidden = true;
}

