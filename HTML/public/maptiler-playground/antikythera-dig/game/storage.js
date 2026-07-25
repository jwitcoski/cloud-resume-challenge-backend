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

ns.loadFolioFromDisk = function loadFolioFromDisk() {
  try {
    const raw = localStorage.getItem(FOLIO_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((k) => state.folio.add(k));
  } catch (_) { /* ignore */ }
}


ns.persistFolio = function persistFolio() {
  try {
    localStorage.setItem(FOLIO_KEY, JSON.stringify([...state.folio]));
  } catch (_) { /* ignore */ }
}


ns.collectFolio = function collectFolio(key, label) {
  if (!key || state.folio.has(key)) return false;
  state.folio.add(key);
  ns.persistFolio();
  return true;
}


ns.serializeGame = function serializeGame() {
  return {
    v: 1,
    money: state.money,
    days: state.days,
    workers: state.workers,
    busyWorkers: state.busyWorkers,
    busyDigsLeft: state.busyDigsLeft,
    score: state.score,
    dug: [...state.dug],
    selected: [...state.selected],
    periods: { ...state.periods },
    reports: state.reports,
    eventsSeen: [...state.eventsSeen],
    chaptersSolved: [...state.chaptersSolved],
    digsDone: state.digsDone,
    hardMode: state.hardMode,
    tutorialStep: state.tutorialStep,
    mechanismFound: state.mechanismFound,
    goatsHits: state.goatsHits,
    barrenDigs: state.barrenDigs,
    fruitfulDigs: state.fruitfulDigs,
    surveyPass: !!state.surveyPass,
    huntChapter: state.huntChapter || null,
    landscapeStudied: !!state.landscapeStudied,
    ended: state.ended,
    started: true,
  };
}


ns.saveGame = function saveGame() {
  if (!state.started || state.revealed) return;
  try {
    if (state.ended) {
      localStorage.removeItem(SAVE_KEY);
      return;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(ns.serializeGame()));
  } catch (_) { /* ignore */ }
}


ns.peekSave = function peekSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.ended || !data.started) return null;
    return data;
  } catch (_) {
    return null;
  }
}


ns.applySaveData = function applySaveData(data) {
  state.money = data.money;
  state.days = data.days;
  state.workers = data.workers;
  state.busyWorkers = data.busyWorkers || 0;
  state.busyDigsLeft = data.busyDigsLeft || 0;
  state.score = data.score || 0;
  state.dug = new Set(data.dug || []);
  state.selected = new Set(data.selected || []);
  state.periods = Object.assign(Object.create(null), data.periods || {});
  state.reports = data.reports || Object.create(null);
  state.eventsSeen = new Set(data.eventsSeen || []);
  state.chaptersSolved = new Set(data.chaptersSolved || []);
  state.digsDone = data.digsDone || 0;
  state.hardMode = !!data.hardMode;
  state.tutorialStep = data.tutorialStep || "done";
  state.mechanismFound = !!data.mechanismFound;
  state.goatsHits = data.goatsHits || 0;
  state.barrenDigs = data.barrenDigs || 0;
  state.fruitfulDigs = data.fruitfulDigs || 0;
  state.surveyPass = !!data.surveyPass;
  // Drop legacy prospect / auto-period tints — player must pick a hunt chapter.
  state.huntChapter =
    data.huntChapter && MYSTERY.some((m) => m.id === data.huntChapter)
      ? data.huntChapter
      : null;
  state.landscapeStudied = !!data.landscapeStudied;
  state.ended = false;
  state.revealed = false;
  state.paused = false;
  state.started = true;
}

