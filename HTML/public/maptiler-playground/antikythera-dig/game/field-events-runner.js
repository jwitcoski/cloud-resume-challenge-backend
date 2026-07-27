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

ns.pickFieldEvent = function pickFieldEvent() {
  const pool = FIELD_EVENTS.filter((ev) => {
    if (ev.once && state.eventsSeen.has(ev.id)) return false;
    if (typeof ev.canFire === "function" && !ev.canFire(state)) return false;
    return true;
  });
  if (!pool.length) return null;
  const total = pool.reduce((n, ev) => n + (ev.weight || 1), 0);
  let r = Math.random() * total;
  for (const ev of pool) {
    r -= ev.weight || 1;
    if (r <= 0) return ev;
  }
  return pool[pool.length - 1];
}


ns.showFieldEvent = function showFieldEvent(ev, effectLine) {
  ns.hideFindHover();
  ns._adventureSession = null;
  const card = document.getElementById("fieldEventCard");
  card.classList.remove("good-card", "bad-card", "mixed-card", "hit-card", "miss-card");
  card.classList.add((ev.tone || "mixed") + "-card");
  document.getElementById("fieldEventEyebrow").textContent = ev.eyebrow || "Field cable";
  document.getElementById("fieldEventTitle").textContent = ev.title;
  document.getElementById("fieldEventSummary").textContent = ev.blurb;
  const effect = document.getElementById("fieldEventEffect");
  effect.hidden = false;
  effect.textContent = effectLine;
  const choices = document.getElementById("fieldEventChoices");
  if (choices) choices.hidden = true;
  const okBtn = document.getElementById("fieldEventOk");
  if (okBtn) {
    okBtn.hidden = false;
    okBtn.textContent = "Carry on";
  }
  const art = document.getElementById("fieldEventArt");
  const artSrc =
    ev.art ||
    "images/events/event-" + encodeURIComponent(ev.id) + ".png";
  art.hidden = true;
  art.onload = () => {
    art.hidden = false;
  };
  art.onerror = () => {
    art.hidden = true;
    art.removeAttribute("src");
  };
  art.alt = ev.title || "Field event sketch";
  art.src = artSrc;
  document.getElementById("fieldEvent").classList.add("on");
  ns.collectFolio("event:" + ev.id);
  if (ev.id === "goats") state.goatsHits = (state.goatsHits || 0) + 1;
  ns.saveGame();
}


ns.hideFieldEvent = function hideFieldEvent() {
  document.getElementById("fieldEvent").classList.remove("on");
  const choices = document.getElementById("fieldEventChoices");
  if (choices) choices.hidden = true;
  const okBtn = document.getElementById("fieldEventOk");
  if (okBtn) {
    okBtn.hidden = false;
    okBtn.textContent = "Carry on";
  }
}


ns.runFieldEvent = function runFieldEvent(ev) {
  if (!ev) return;
  const beforeTitle = gloryRank(state.score).title;
  const effectLine = ev.apply(state) || "";
  state.score = Math.max(0, state.score);
  state.eventsSeen.add(ev.id);
  ns.trimSelectionToCrew();
  const toneCls = ev.tone === "good" ? "hit" : ev.tone === "bad" ? "miss" : "";
  ns.logLine(
    `<span class="${toneCls || "hit"}">${ev.title}</span> · ${effectLine}`,
    toneCls || undefined
  );
  const after = gloryRank(state.score);
  if (after.title !== beforeTitle) {
    const prev = GLORY_RANKS.find((r) => r.title === beforeTitle) || GLORY_RANKS[0];
    const promoted = after.min > prev.min;
    ns.logLine(
      `<span class="${promoted ? "hit" : "miss"}">${promoted ? "Promotion" : "Demotion"}</span> · ` +
        `${beforeTitle} → <strong>${after.title}</strong>`,
      promoted ? "hit" : "miss"
    );
    ns.toast(
      promoted ? `Promoted — ${after.title}` : `Reputation slips — ${after.title}`,
      promoted ? "hit" : "miss"
    );
  }
  ns.showFieldEvent(ev, effectLine);
  ns.renderHud();
}


ns.relicEventForReports = function relicEventForReports(reports) {
  const dugIds = new Set((reports || []).map((r) => String(r.id)));
  for (const ev of FIELD_EVENTS) {
    if (!ev.relicTracts || !ev.relicTracts.length) continue;
    if (ev.once && state.eventsSeen.has(ev.id)) continue;
    if (ev.relicTracts.some((t) => dugIds.has(String(t)))) return ev;
  }
  return null;
}


ns.maybeFieldEventAfterDig = function maybeFieldEventAfterDig() {
  if (state.ended) return false;
  const relic = ns.digSelected._pendingRelic;
  ns.digSelected._pendingRelic = null;
  if (relic) {
    ns.runFieldEvent(relic);
    return true;
  }
  if (typeof ns.maybeAdventureAfterDig === "function" && ns.maybeAdventureAfterDig()) {
    return true;
  }
  if (state.digsDone < 1) return false;
  if (Math.random() > FIELD_EVENT_CHANCE) return false;
  const ev = ns.pickFieldEvent();
  if (!ev) return false;
  ns.runFieldEvent(ev);
  return true;
}

