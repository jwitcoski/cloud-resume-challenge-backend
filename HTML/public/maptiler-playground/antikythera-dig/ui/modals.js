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

ns.siteRowHtml = function siteRowHtml(r) {
  const stamp = r.hit ? "FIND" : "DUST";
  const cls = r.hit ? "hit" : "miss";
  const periods = ns.topPeriods(r.periods, 2);
  const chapters = (r.chapters || []).map((c) => `${c.label} +${c.n}`).join(" · ");
  const extra = [
    periods.length ? periods.join(", ") : null,
    chapters || null,
  ].filter(Boolean).join(" · ");
  return (
    `<div class="dig-site ${cls}">` +
      `<span class="peg">${stamp}</span>` +
      `<span class="site-title">Tract ${r.id}</span>` +
      `<span class="site-detail">${r.detail}${extra ? "<br/>" + extra : ""}</span>` +
    `</div>`
  );
}


ns.showDigEvent = function showDigEvent(reports, opts) {
  ns.hideFindHover();
  const reviewOnly = !!(opts && opts.review);
  ns.showDigEvent._reviewOnly = reviewOnly;
  const finds = reports.filter((r) => r.hit);
  const dust = reports.filter((r) => !r.hit);
  const gained = reports.reduce((n, r) => n + (r.value || 0), 0);
  const emptyPenalty = dust.length * emptyPenaltyPerTract();
  const netGlory = gained - emptyPenalty;
  const card = document.getElementById("digEventCard");
  const el = document.getElementById("digEvent");
  card.classList.toggle("hit-card", finds.length > 0);
  card.classList.toggle("miss-card", finds.length === 0);
  document.getElementById("digEventEyebrow").textContent = reviewOnly
    ? "Trench notes"
    : finds.length
      ? "From the trench"
      : "Empty ground";
  document.getElementById("digEventTitle").textContent = reviewOnly
    ? (finds.length ? "Earlier paydirt" : "Earlier empty ground")
    : finds.length
      ? (finds.length === reports.length ? "Fortune and glory!" : "A mixed dig")
      : "Nothing but dust";
  let summary;
  if (reviewOnly) {
    summary = finds.length
      ? `Already excavated · ${finds.length} fruitful · ${dust.length} barren. No new costs or events.`
      : `Already excavated — this square stayed barren. No new costs or events.`;
  } else {
    summary = finds.length
      ? `${finds.length} fruitful · ${dust.length} barren`
      : `${reports.length} tract${reports.length === 1 ? "" : "s"} opened — empty sieve.`;
    if (gained > 0) summary += ` · finds +${gained} glory`;
    if (emptyPenalty > 0) {
      summary += ` · barren −${emptyPenalty} glory (−${emptyPenaltyPerTract()} each)`;
    }
    summary += ` · net ${netGlory >= 0 ? "+" : ""}${netGlory}. Rank: ${gloryRank(state.score).title}.`;
  }
  document.getElementById("digEventSummary").textContent = summary;
  document.getElementById("digEventSites").innerHTML = reports.map(ns.siteRowHtml).join("");
  const ok = document.getElementById("digEventOk");
  if (ok) ok.textContent = reviewOnly ? "Back to the map" : "Back to the journal";
  el.classList.add("on");
}


ns.hideDigEvent = function hideDigEvent() {
  document.getElementById("digEvent").classList.remove("on");
}


ns.showTractReport = function showTractReport(id) {
  const r = state.reports[id] || ns.buildTractReport(id);
  state.reports[id] = r;
  ns.showDigEvent([r], { review: true });
  ns.flashDugTracts([r]);
  if (r.lng != null) {
    ns.map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(ns.map.getZoom(), 15), duration: 600 });
  }
}


ns.welcomeAboard = function welcomeAboard(opts) {
  const ready = document.getElementById("startReady");
  if (ready) {
    ready.textContent = "Charts aboard — stamp when ready";
    ready.classList.add("ok");
  }
  if (!state.started) return;
  if (opts && opts.resumed) {
    ns.toast(
      state.hardMode
        ? "Hard expedition resumed — charts reloaded"
        : "Expedition resumed — charts reloaded",
      "hit"
    );
    ns.logLine(
      `Resume · ${state.dug.size} tracts already open · ${boot.welcome.tractCount} on the board`
    );
  } else {
    ns.toast(
      state.hardMode ? "Hard permit stamped — charts loaded" : "Permit stamped — charts loaded",
      "hit"
    );
    ns.logLine(
      `Day 1 · ${boot.welcome.tractCount} fogged tracts · ` +
        `PMTiles digboard ${boot.welcome.digZooms} · finds ${boot.welcome.findsZooms}` +
        (state.hardMode ? " · HARD MODE" : "")
    );
  }
  ns.updateTutorialBanner();
  ns.renderHud();
  ns.saveGame();
}


ns.startExpedition = function startExpedition() {
  if (state.started) return;
  state.hardMode = !!(document.getElementById("chkHard") && document.getElementById("chkHard").checked);
  if (state.hardMode) {
    state.money = 4500;
    state.days = 280;
    state.workers = 2;
  }
  let tutorialDone = false;
  try {
    tutorialDone = localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch (_) { /* ignore */ }
  state.tutorialStep = tutorialDone ? "done" : "survey";
  state.started = true;
  ns.collectFolio("rank:unknown");
  document.getElementById("startScreen").classList.remove("on");
  document.body.classList.add("playing");
  if (boot.done) ns.welcomeAboard();
  else ns.toast("Charts still arriving from Athens…");
  ns.updateTutorialBanner();
  ns.renderHud();
  ns.saveGame();
  ns.consumeTractHash();
}


ns.continueExpedition = function continueExpedition() {
  const data = ns.peekSave();
  if (!data || state.started) return;
  ns.applySaveData(data);
  document.getElementById("startScreen").classList.remove("on");
  document.body.classList.add("playing");
  if (boot.done) {
    ns.refreshTractStates();
    ns.welcomeAboard({ resumed: true });
  } else {
    boot.pendingSaveRestore = true;
    ns.toast("Charts still arriving — save will restore when ready");
  }
  ns.updateTutorialBanner();
  ns.renderHud();
  ns.consumeTractHash();
}


ns.markChartsReady = function markChartsReady(tractCount, digHeader, findsHeader) {
  boot.done = true;
  boot.welcome = {
    tractCount,
    digZooms: `z${digHeader.minZoom}–${digHeader.maxZoom}`,
    findsZooms: `z${findsHeader.minZoom}–${findsHeader.maxZoom}`,
  };
  if (boot.pendingSaveRestore && state.started) {
    boot.pendingSaveRestore = false;
    ns.refreshTractStates();
    ns.welcomeAboard({ resumed: true });
    ns.consumeTractHash();
  } else {
    ns.welcomeAboard();
    if (state.started) ns.consumeTractHash();
  }
}


ns.endSeason = function endSeason(won) {
  state.ended = true;
  state.selected.clear();
  state.chapterQueue = [];
  ns.hideDigEvent();
  ns.hideFieldEvent();
  ns.hideChapterBrief();
  ns.hideGloryTip();
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (_) { /* ignore */ }
  ns.renderHud();
  const final = document.getElementById("final");
  document.getElementById("finalTitle").textContent = won
    ? "It belongs in a museum"
    : "Storm season";
  document.getElementById("finalScore").textContent = String(state.score);
  const rank = gloryRank(state.score);
  document.getElementById("finalRank").textContent = rank.title;
  ns.bindSketchImg(
    document.getElementById("finalRankArt"),
    ns.rankArtUrl(rank.id),
    rank.title
  );
  document.getElementById("finalBlurb").textContent = won
    ? `You cracked the island’s lost chapters before the rains. Final rank: ${rank.title}. ${rank.blurb}`
    : `The boats are leaving. ${state.dug.size} tracts opened, ${state.chaptersSolved.size}/5 chapters recovered. Final rank: ${rank.title}. Next year, perhaps.`;
  ns.fillSeasonRecap(won);
  ns.collectFolio("rank:" + rank.id);
  final.classList.add("on");
}

