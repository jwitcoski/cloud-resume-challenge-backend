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

ns.eraHave = function eraHave(m) {
  let have = 0;
  for (const k of m.keys) have += state.periods[k] || 0;
  return have;
}


ns.newlyCompletedChapters = function newlyCompletedChapters() {
  const out = [];
  for (const m of MYSTERY) {
    if (state.chaptersSolved.has(m.id)) continue;
    if (ns.eraHave(m) >= m.need) out.push(m);
  }
  return out;
}


ns.hideChapterBrief = function hideChapterBrief() {
  document.getElementById("chapterBrief").classList.remove("on");
  ns.clearPeriodHint();
}


ns.chapterArtUrl = function chapterArtUrl(id) {
  return "images/chapters/era-" + encodeURIComponent(id) + ".png";
}


ns.rankArtUrl = function rankArtUrl(id) {
  return "images/ranks/rank-" + encodeURIComponent(id || "unknown") + ".png";
}


ns.bindSketchImg = function bindSketchImg(imgEl, src, alt) {
  if (!imgEl) return;
  imgEl.hidden = true;
  imgEl.onload = () => {
    imgEl.hidden = false;
  };
  imgEl.onerror = () => {
    imgEl.hidden = true;
    imgEl.removeAttribute("src");
  };
  imgEl.alt = alt || "";
  imgEl.src = src;
}


ns.showChapterComplete = function showChapterComplete(m) {
  ns.hideFindHover();
  ns.hideDigEvent();
  ns.hideFieldEvent();
  const bonus = state.hardMode ? 0 : (m.museumBonus || 1000);
  const glory = m.gloryBonus || 50;
  state.money += bonus;
  ns.applyGlory(glory);
  state.chaptersSolved.add(m.id);
  ns.collectFolio("chapter:" + m.id);

  document.getElementById("chapterEyebrow").textContent =
    `Chapter ${state.chaptersSolved.size} of ${MYSTERY.length} · Museum stipend`;
  document.getElementById("chapterTitle").textContent = m.label;
  document.getElementById("chapterWhen").textContent = m.when || "";
  ns.bindSketchImg(
    document.getElementById("chapterArt"),
    m.art || ns.chapterArtUrl(m.id),
    m.label
  );
  document.getElementById("chapterStory").textContent = m.story || m.blurb || "";
  document.getElementById("chapterWhere").innerHTML =
    `<strong>Where it lived on the isle:</strong> ${m.where || ""}`;
  document.getElementById("chapterLook").textContent = m.look
    ? `In the dirt: ${m.look}`
    : "";
  document.getElementById("chapterMuseum").innerHTML =
    state.hardMode
      ? `<strong>Museum cable:</strong> Your report on <em>${m.label}</em> is accepted — but hard mode grants <strong>no stipend</strong>. Glory alone: <strong>+${glory}</strong>.`
      : `<strong>Museum cable:</strong> Your report on <em>${m.label}</em> has been accepted. ` +
        `A stipend of <strong>${money(bonus)}</strong> is wired to the expedition — plus <strong>+${glory} glory</strong>.`;

  const ok = document.getElementById("chapterBriefOk");
  ok.textContent =
    state.chaptersSolved.size >= MYSTERY.length
      ? "Seal the season"
      : state.chapterQueue.length
        ? "Next chapter"
        : "Continue the dig";

  document.getElementById("chapterBrief").classList.add("on");
  ns.setPeriodHint(m);
  if (ns.map && m.hint) {
    ns.map.easeTo({
      center: [m.hint.lng, m.hint.lat],
      zoom: m.hint.zoom,
      duration: 900,
    });
  }
  ns.logLine(
    `<span class="hit">Chapter · ${m.label}</span> · museum +${money(bonus)} · +${glory} glory`,
    "hit"
  );
  ns.toast(`Chapter sealed — ${m.label}` + (bonus ? ` (+${money(bonus)})` : " (hard · no stipend)"), "hit");
  ns.saveGame();
  ns.renderHud();
}


ns.advanceChapterQueue = function advanceChapterQueue() {
  ns.hideChapterBrief();
  if (state.chapterQueue.length) {
    ns.showChapterComplete(state.chapterQueue.shift());
    return true;
  }
  return false;
}


ns.finishAfterModals = function finishAfterModals() {
  if (ns.advanceChapterQueue()) return;
  if (ns.digSelected._pendingWin) {
    ns.digSelected._pendingWin = false;
    ns.endSeason(true);
    return;
  }
  // Re-check after museum stipends — a chapter payout can rescue a broke dig.
  ns.digSelected._pendingLose = false;
  if (cannotAffordDig()) {
    ns.endSeason(false);
    return;
  }
  ns.maybeFieldEventAfterDig();
}


ns.finishDigModalFlow = function finishDigModalFlow() {
  const reviewOnly = !!ns.showDigEvent._reviewOnly;
  ns.showDigEvent._reviewOnly = false;
  ns.hideDigEvent();
  if (reviewOnly) return;
  ns.finishAfterModals();
}


ns.finishChapterModalFlow = function finishChapterModalFlow() {
  ns.finishAfterModals();
}

ns.setPeriodHint = function setPeriodHint(m) {
  if (!ns.map || !ns.map.getSource("period-hint") || !m || !m.hint) return;
  ns.map.getSource("period-hint").setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: m.id, label: m.label },
        geometry: ns.circlePolygon(m.hint.lng, m.hint.lat, m.hint.radiusKm),
      },
    ],
  });
}


ns.clearPeriodHint = function clearPeriodHint() {
  if (!ns.map || !ns.map.getSource("period-hint")) return;
  ns.map.getSource("period-hint").setData({ type: "FeatureCollection", features: [] });
}


ns.placeEraTip = function placeEraTip(anchorEl) {
  const tip = document.getElementById("eraTip");
  const r = anchorEl.getBoundingClientRect();
  const tipW = Math.min(300, window.innerWidth - 24);
  let left = r.right + 12;
  if (left + tipW > window.innerWidth - 12) left = Math.max(12, r.left - tipW - 12);
  if (window.innerWidth < 720) left = Math.max(12, (window.innerWidth - tipW) / 2);
  let top = r.top;
  tip.hidden = false;
  tip.classList.add("on");
  tip.style.width = tipW + "px";
  tip.style.left = left + "px";
  // measure after show
  requestAnimationFrame(() => {
    const h = tip.offsetHeight || 160;
    if (top + h > window.innerHeight - 12) top = Math.max(12, window.innerHeight - h - 12);
    tip.style.top = top + "px";
  });
}


ns.showEraTip = function showEraTip(m, anchorEl) {
  const tip = document.getElementById("eraTip");
  const artSrc = m.art || ns.chapterArtUrl(m.id);
  tip.innerHTML =
    `<img class="era-art" src="${artSrc}" alt="${m.label}" />` +
    `<p class="when">${m.when}</p>` +
    `<h3>${m.label}</h3>` +
    `<p>${m.blurb}</p>` +
    `<p class="where"><strong>Where to look:</strong> ${m.where}</p>` +
    `<p class="where"><strong>In the dirt:</strong> ${m.look}</p>`;
  const tipImg = tip.querySelector(".era-art");
  if (tipImg) {
    tipImg.onerror = () => tipImg.remove();
  }
  ns.placeEraTip(anchorEl);
  ns.setPeriodHint(m);
}


ns.hideEraTip = function hideEraTip() {
  const tip = document.getElementById("eraTip");
  tip.classList.remove("on");
  tip.hidden = true;
  ns.clearPeriodHint();
}


ns.glanceEra = function glanceEra(m) {
  if (!ns.map || !m.hint) return;
  ns.setPeriodHint(m);
  ns.map.easeTo({
    center: [m.hint.lng, m.hint.lat],
    zoom: m.hint.zoom,
    duration: 900,
  });
  ns.toast(`Field note · ${m.label}`);
}

