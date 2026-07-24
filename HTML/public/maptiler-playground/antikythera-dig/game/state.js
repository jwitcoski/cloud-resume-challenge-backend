import { GLORY_EMPTY_PENALTY, GLORY_RANKS } from '../data/glory-ranks.js';

const HIRE_COST = 500;
const MAX_WORKERS = 8;
const MIN_WORKERS = 1;
const DIG_COST_PER_TRACT = 120;
const DAYS_PER_TRACT = 4;
const FIELD_EVENT_CHANCE = 0.45;
/** Reputation hit for opening a barren tract — empty ground wastes the season. */
export const SAVE_KEY = 'antikythera-dig-save-v1';
export const FOLIO_KEY = 'antikythera-dig-folio-v1';
export const TUTORIAL_KEY = 'antikythera-dig-tutorial-done-v1';

const state = {
  money: 8000,
  days: 365,
  workers: 3,
  busyWorkers: 0,
  busyDigsLeft: 0,
  score: 0,
  selected: new Set(),
  dug: new Set(),
  periods: Object.create(null),
  scores: {},
  reports: Object.create(null),
  tractIndex: Object.create(null),
  eventsSeen: new Set(),
  chaptersSolved: new Set(),
  chapterQueue: [],
  digsDone: 0,
  ended: false,
  paused: false,
  revealed: false,
  started: false,
  hardMode: false,
  tutorialStep: null, // survey | mark | dig | done | null
  mechanismFound: false,
  folio: new Set(),
  goatsHits: 0,
  barrenDigs: 0,
  fruitfulDigs: 0,
};
export const boot = {
  done: false,
  welcome: { tractCount: 0, digZooms: '', findsZooms: '' },
  pendingSaveRestore: null,
};

export {
  HIRE_COST, MAX_WORKERS, MIN_WORKERS, DIG_COST_PER_TRACT,
  DAYS_PER_TRACT, FIELD_EVENT_CHANCE, state,
  GLORY_EMPTY_PENALTY, GLORY_RANKS,
};

export function emptyPenaltyPerTract() {
  return Math.round(GLORY_EMPTY_PENALTY * (state.hardMode ? 1.75 : 1));
}

export function money(n) {
  return '$' + Math.max(0, Math.round(n)).toLocaleString('en-US');
}

export function gloryRank(score) {
  let rank = GLORY_RANKS[0];
  const s = Math.max(0, score || 0);
  for (const r of GLORY_RANKS) {
    if (s >= r.min) rank = r;
  }
  return rank;
}

export function nextGloryRank(score) {
  const s = Math.max(0, score || 0);
  for (const r of GLORY_RANKS) {
    if (r.min > s) return r;
  }
  return null;
}

export function cannotAffordDig() {
  return state.money < DIG_COST_PER_TRACT || state.days < DAYS_PER_TRACT;
}
