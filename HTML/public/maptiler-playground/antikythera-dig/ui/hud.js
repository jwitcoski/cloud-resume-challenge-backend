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
  FIELD_EVENT_CHANCE, SURVEY_PASS_COST, SURVEY_PASS_DAYS,
  money, gloryRank, nextGloryRank, cannotAffordDig, emptyPenaltyPerTract,
} from '../game/state.js';

const errEl = document.getElementById("error");

ns.fail = function fail(msg, err) {
  console.error(msg, err);
  errEl.style.display = "block";
  errEl.textContent = msg + (err && err.message ? "\n\n" + err.message : "");
}


ns.toast = function toast(msg, kind) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hit", "miss");
  if (kind === "hit" || kind === "miss") el.classList.add(kind);
  el.classList.add("show");
  clearTimeout(ns.toast._t);
  ns.toast._t = setTimeout(() => {
    el.classList.remove("show", "hit", "miss");
  }, kind === "hit" ? 3200 : 2200);
}

ns.applyGlory = function applyGlory(delta) {
  const before = gloryRank(state.score);
  state.score = Math.max(0, state.score + (delta || 0));
  const after = gloryRank(state.score);
  if (after.title !== before.title) {
    const up = after.min > before.min;
    ns.logLine(
      `<span class="${up ? "hit" : "miss"}">${up ? "Promotion" : "Demotion"}</span> · ` +
        `${before.title} → <strong>${after.title}</strong>`,
      up ? "hit" : "miss"
    );
    ns.toast(
      up ? `Promoted — ${after.title}` : `Reputation slips — ${after.title}`,
      up ? "hit" : "miss"
    );
    if (up && after.id) {
      if (ns.collectFolio("rank:" + after.id)) {
        /* stamp unlocked quietly — promotion toast already fired */
      }
    }
  }
  return after;
}


ns.effectiveCrew = function effectiveCrew() {
  return Math.max(MIN_WORKERS, (state.workers || 1) - (state.busyWorkers || 0));
}


ns.trimSelectionToCrew = function trimSelectionToCrew() {
  const cap = ns.effectiveCrew();
  while (state.selected.size > cap) {
    const id = [...state.selected].pop();
    state.selected.delete(id);
    if (id != null) ns.setTractState(id, { selected: false, dug: false, hit: false });
  }
}


ns.tickBusyCrew = function tickBusyCrew() {
  if (state.busyDigsLeft > 0) {
    state.busyDigsLeft -= 1;
    if (state.busyDigsLeft <= 0) {
      state.busyWorkers = 0;
      state.busyDigsLeft = 0;
      ns.logLine("The busy hands are back on the shovels.");
    }
  }
}


ns.updateTutorialBanner = function updateTutorialBanner() {
  const el = document.getElementById("tutorialBanner");
  if (!el) return;
  const steps = {
    survey:
      "<strong>Field school · 1/3</strong> — Hit <em>Study landscape</em>, click a rock unit or terrace, then resume digging.",
    mark:
      "<strong>Field school · 2/3</strong> — Pencil one fogged tract on the map (crew size is your mark limit).",
    dig:
      "<strong>Field school · 3/3</strong> — Strike <em>Excavate</em>. Fortune — or dust — awaits.",
  };
  if (state.tutorialStep && steps[state.tutorialStep]) {
    el.innerHTML = steps[state.tutorialStep];
    el.classList.add("on");
  } else {
    el.classList.remove("on");
    el.innerHTML = "";
  }
}


ns.advanceTutorial = function advanceTutorial(from) {
  if (state.tutorialStep !== from) return;
  if (from === "survey") state.tutorialStep = "mark";
  else if (from === "mark") state.tutorialStep = "dig";
  else if (from === "dig") {
    state.tutorialStep = "done";
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch (_) { /* ignore */ }
    ns.toast("Field school complete — dig like you mean it", "hit");
  }
  ns.updateTutorialBanner();
  ns.saveGame();
}


ns.renderHud = function renderHud() {
  document.getElementById("statMoney").textContent = money(state.money);
  document.getElementById("statDays").textContent = String(state.days);
  const crewEl = document.getElementById("statWorkers");
  const free = ns.effectiveCrew();
  if (state.busyWorkers > 0) {
    crewEl.textContent = `${free}/${state.workers}`;
    crewEl.title = `${state.busyWorkers} busy (tourists/illness) · ${state.busyDigsLeft} dig(s) left`;
    crewEl.classList.add("busy");
  } else {
    crewEl.textContent = String(state.workers);
    crewEl.title = "";
    crewEl.classList.remove("busy");
  }
  document.getElementById("statScore").textContent = String(state.score);
  const rank = gloryRank(state.score);
  const nxt = nextGloryRank(state.score);
  const rankEl = document.getElementById("statRank");
  rankEl.textContent = rank.title;
  rankEl.title = "";
  rankEl.dataset.rankId = rank.id || "unknown";
  const nextLine = nxt
    ? `Next: ${nxt.title} at ${nxt.min} glory (${nxt.min - state.score} to go)`
    : "Top of the ladder.";
  rankEl.dataset.rankBlurb = rank.blurb + " · " + nextLine;
  document.getElementById("btnDig").disabled =
    !state.started || state.ended || state.paused || state.selected.size === 0 || state.days <= 0 || state.money < DIG_COST_PER_TRACT
    || document.getElementById("chapterBrief").classList.contains("on");
  document.getElementById("btnHire").disabled =
    !state.started || state.ended || state.paused || state.workers >= MAX_WORKERS || state.money < HIRE_COST
    || document.getElementById("chapterBrief").classList.contains("on");
  document.getElementById("btnClear").disabled =
    !state.started || state.ended || state.paused || state.selected.size === 0
    || document.getElementById("chapterBrief").classList.contains("on");
  document.getElementById("btnSurvey").disabled =
    !state.started || state.ended || document.getElementById("chapterBrief").classList.contains("on");

  const surveyCost = state.hardMode ? Math.round(SURVEY_PASS_COST * 1.25) : SURVEY_PASS_COST;
  const surveyDays = state.hardMode ? SURVEY_PASS_DAYS + 1 : SURVEY_PASS_DAYS;
  const btnPass = document.getElementById("btnSurveyPass");
  const briefSum = document.getElementById("fieldBriefSum");
  const briefLede = document.getElementById("fieldBriefLede");
  if (briefSum) {
    briefSum.textContent = state.surveyPass
      ? "Hint paid · pick a chase"
      : `Need a hint? · costs €${surveyCost}`;
  }
  if (briefLede && !state.surveyPass) {
    briefLede.innerHTML =
      `<strong class="field-brief-cost">Costs money:</strong> €${surveyCost} and ${surveyDays} day${surveyDays === 1 ? "" : "s"} from your permit. ` +
      `Pay for a field brief, name the lost chapter you’re after, and the charts ink a few rough circles — ` +
      `not which square hides the goods. Optional. Fog keeps its secrets either way.`;
  } else if (briefLede && state.surveyPass) {
    briefLede.innerHTML =
      `Brief already paid (€${surveyCost}). Name a lost chapter below — rough circles ink on the chart. ` +
      `Hover a circle for why. Fog still hides every sherd.`;
  }
  if (btnPass) {
    const modalOpen = document.getElementById("chapterBrief").classList.contains("on");
    if (!state.surveyPass) {
      if (btnPass.dataset.confirmSpend === "1") {
        btnPass.textContent = `Confirm: pay €${surveyCost}?`;
        btnPass.title = `Click again to spend €${surveyCost} and ${surveyDays} day${surveyDays === 1 ? "" : "s"} from your purse and permit.`;
      } else {
        btnPass.textContent = `Pay €${surveyCost} for a hint`;
        btnPass.title =
          `Costs €${surveyCost} and ${surveyDays} day${surveyDays === 1 ? "" : "s"} — name the age you’re after and the charts ink rough search circles. Fog keeps every sherd secret.`;
      }
      btnPass.classList.remove("on");
      btnPass.disabled =
        !state.started || state.ended || state.paused || state.revealed || modalOpen ||
        state.money < surveyCost || state.days < surveyDays;
    } else {
      delete btnPass.dataset.confirmSpend;
      const meta = state.huntChapter && MYSTERY.find((m) => m.id === state.huntChapter);
      btnPass.textContent = meta ? `Call off · ${meta.label}` : "Name your chase";
      btnPass.title = meta
        ? "Wipe the chase circles from the chart"
        : "Pick a lost chapter — the desk marks where that age gathers";
      btnPass.classList.toggle("on", !!state.huntChapter);
      btnPass.disabled =
        !state.started || state.ended || state.paused || state.revealed || modalOpen;
    }
  }
  if (typeof ns.renderHuntPicker === "function") ns.renderHuntPicker();

  const phase = document.getElementById("phase");
  if (!state.started) {
    phase.innerHTML = "Awaiting permit stamp…";
  } else if (state.ended && state.revealed) {
    phase.innerHTML =
      "<strong>Spoiler map</strong> — all archaeological materials shown. Restart when you’re done touring.";
  } else if (state.ended) {
    phase.innerHTML = "Pack it in — the permit has expired.";
  } else if (document.getElementById("chapterBrief").classList.contains("on")) {
    phase.innerHTML = "<strong>Chapter pause</strong> — the museum is reading your report. Digging waits.";
  } else if (state.paused) {
    phase.innerHTML =
      "<strong>Landscape desk</strong> — click geology, terraces, or structure dots (wells, shelters, threshing floors…) then <strong>Resume digging</strong>.";
  } else if (state.tutorialStep === "survey" || state.tutorialStep === "mark" || state.tutorialStep === "dig") {
    phase.innerHTML =
      state.tutorialStep === "survey"
        ? "<strong>Field school</strong> — Study landscape, then resume."
        : state.tutorialStep === "mark"
          ? "<strong>Field school</strong> — Mark one fogged tract."
          : "<strong>Field school</strong> — Excavate your mark.";
  } else if (cannotAffordDig()) {
    phase.innerHTML =
      "Purse or days exhausted — the boats won’t wait for another trench.";
  } else if (state.selected.size) {
    phase.innerHTML =
      `<strong>${state.selected.size}</strong> site(s) marked · crew can open <strong>${free}</strong>` +
      (state.busyWorkers ? ` <span style="color:var(--warn)">(${state.busyWorkers} busy)</span>` : "") +
      ` · ${money(state.selected.size * DIG_COST_PER_TRACT)} and ${state.selected.size * DAYS_PER_TRACT} days on the line.`;
  } else if (state.surveyPass && state.huntChapter) {
    const meta = MYSTERY.find((m) => m.id === state.huntChapter);
    phase.innerHTML =
      `<strong>Chase · ${meta ? meta.label : "the past"}</strong> — rough circles on the chart (hover one for why). Fog keeps its secrets; read the rock before you dig.`;
  } else {
    phase.innerHTML = `Pencil the map — click fogged tracts (up to your crew), then strike with <strong>Excavate</strong>.`;
  }

  // If already insolvent with no modal open (e.g. after a purse-draining event), close the season.
  if (
    state.started &&
    !state.ended &&
    cannotAffordDig() &&
    !document.getElementById("digEvent").classList.contains("on") &&
    !document.getElementById("chapterBrief").classList.contains("on") &&
    !document.getElementById("fieldEvent").classList.contains("on") &&
    !document.getElementById("startScreen").classList.contains("on")
  ) {
    queueMicrotask(() => {
      if (!state.ended && cannotAffordDig()) ns.endSeason(false);
    });
  }

  const eras = document.getElementById("eras");
  eras.innerHTML = "";
  let solved = 0;
  for (const m of MYSTERY) {
    let have = 0;
    for (const k of m.keys) have += state.periods[k] || 0;
    const pct = Math.min(100, Math.round((have / m.need) * 100));
    const done = have >= m.need;
    if (done) solved += 1;
    const row = document.createElement("div");
    row.className = "era" + (done ? " done" : "");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", m.label + " — field notes");
    row.innerHTML =
      `<span class="name">${done ? "★ " : ""}${m.label}</span>` +
      `<span>${Math.min(have, m.need)}/${m.need}</span>` +
      `<div class="bar"><span style="width:${pct}%"></span></div>`;
    row.addEventListener("mouseenter", () => ns.showEraTip(m, row));
    row.addEventListener("mouseleave", ns.hideEraTip);
    row.addEventListener("focus", () => ns.showEraTip(m, row));
    row.addEventListener("blur", ns.hideEraTip);
    row.addEventListener("click", () => ns.glanceEra(m));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ns.glanceEra(m);
      }
    });
    eras.appendChild(row);
  }
  return solved;
}


ns.logLine = function logLine(html, cls) {
  const log = document.getElementById("log");
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.innerHTML = html;
  log.prepend(div);
}

