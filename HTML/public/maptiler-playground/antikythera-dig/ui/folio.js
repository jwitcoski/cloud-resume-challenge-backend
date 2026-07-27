import { ns } from '../ns.js';
import {
  TRACTS_URL, SCORES_URL, TRACTS_FALLBACK, DIGBOARD_URL, FINDS_URL, SURVEY_URL,
  CENTER, ISLAND_BOUNDS,
} from '../config.js';
import { MYSTERY } from '../data/mystery.js';
import { GLORY_EMPTY_PENALTY, GLORY_RANKS } from '../data/glory-ranks.js';
import { FIELD_EVENTS } from '../data/field-events.js';
import { ADVENTURES } from '../data/adventures.js';
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

ns.folioMeta = function folioMeta(key) {
  if (key.startsWith("event:")) {
    const id = key.slice(6);
    const ev = FIELD_EVENTS.find((e) => e.id === id);
    return {
      src: "images/events/event-" + id + ".png",
      label: (ev && ev.title) || id,
    };
  }
  if (key.startsWith("adventure:")) {
    const id = key.slice(10);
    const adv = ADVENTURES.find((a) => a.id === id);
    return {
      src: (adv && adv.art) || "images/events/event-mechanism.png",
      label: (adv && (adv.folioLabel || adv.title)) || id,
    };
  }
  if (key.startsWith("chapter:")) {
    const id = key.slice(8);
    const m = MYSTERY.find((x) => x.id === id);
    return {
      src: ns.chapterArtUrl(id),
      label: (m && m.label) || id,
    };
  }
  if (key.startsWith("rank:")) {
    const id = key.slice(5);
    const r = GLORY_RANKS.find((x) => x.id === id) || GLORY_RANKS[0];
    return {
      src: ns.rankArtUrl(id),
      label: r.title,
    };
  }
  return { src: "", label: key };
}


ns.allFolioKeys = function allFolioKeys() {
  const relics = [];
  const cables = [];
  for (const ev of FIELD_EVENTS) {
    const key = "event:" + ev.id;
    if (ev.relicTracts && ev.relicTracts.length) relics.push(key);
    else cables.push(key);
  }
  const keys = [...relics, ...cables];
  for (const adv of ADVENTURES) keys.push("adventure:" + adv.id);
  for (const m of MYSTERY) keys.push("chapter:" + m.id);
  for (const r of GLORY_RANKS) keys.push("rank:" + r.id);
  return keys;
}


ns.openFolio = function openFolio() {
  const grid = document.getElementById("folioGrid");
  const keys = ns.allFolioKeys();
  grid.innerHTML = keys
    .map((key) => {
      const meta = ns.folioMeta(key);
      const unlocked = state.folio.has(key);
      return (
        `<button type="button" class="folio-stamp${unlocked ? " unlocked" : " locked"}"` +
        (unlocked
          ? ` data-folio-src="${meta.src}" data-folio-label="${meta.label.replace(/"/g, "&quot;")}"`
          : ` disabled aria-disabled="true"`) +
        `>` +
        (unlocked
          ? `<img src="${meta.src}" alt="${meta.label}" loading="lazy" />`
          : `<div style="aspect-ratio:4/3;display:grid;place-items:center;font-size:1.4rem;color:var(--muted)">?</div>`) +
        `<div class="cap">${unlocked ? meta.label : "Not yet"}</div></button>`
      );
    })
    .join("");
  grid.querySelectorAll(".folio-stamp.unlocked").forEach((btn) => {
    btn.addEventListener("click", () => {
      ns.openFolioLightbox(btn.getAttribute("data-folio-src"), btn.getAttribute("data-folio-label"));
    });
  });
  document.getElementById("folioModal").classList.add("on");
}


ns.openFolioLightbox = function openFolioLightbox(src, label) {
  if (!src) return;
  const box = document.getElementById("folioLightbox");
  const img = document.getElementById("folioLightboxImg");
  img.src = src;
  img.alt = label || "Field sketch";
  document.getElementById("folioLightboxTitle").textContent = label || "Field sketch";
  box.hidden = false;
  box.classList.add("on");
}


ns.closeFolioLightbox = function closeFolioLightbox() {
  const box = document.getElementById("folioLightbox");
  box.classList.remove("on");
  box.hidden = true;
  document.getElementById("folioLightboxImg").removeAttribute("src");
}


ns.closeFolio = function closeFolio() {
  ns.closeFolioLightbox();
  document.getElementById("folioModal").classList.remove("on");
}

