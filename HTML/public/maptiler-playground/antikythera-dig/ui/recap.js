import { ns } from '../ns.js';
import {
  TRACTS_URL, SCORES_URL, TRACTS_FALLBACK, DIGBOARD_URL, FINDS_URL, SURVEY_URL,
  CENTER, ISLAND_BOUNDS,
} from '../config.js';
import { MYSTERY } from '../data/mystery.js';
import { GLORY_EMPTY_PENALTY, GLORY_RANKS } from '../data/glory-ranks.js';
import { FIELD_EVENTS, relicEvents } from '../data/field-events.js';
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

ns.foundRelics = function foundRelics() {
  return relicEvents().filter((ev) => state.eventsSeen.has(ev.id));
};


ns.seasonPunchline = function seasonPunchline(won) {
  if (state.eventsSeen.has("foil-house")) {
    return "Three saints, one roll of foil — the island’s best parish.";
  }
  if (state.adventuresDone && state.adventuresDone.has("side-path")) {
    return "It belongs in a gift shop — oil, plaster, and a bootlace whip.";
  }
  if (state.eventsSeen.has("underground-sanctuary")) {
    return "You walked over an underground sanctuary. The map still feels haunted.";
  }
  if (state.eventsSeen.has("philip-coin")) {
    return "A Macedonian king in the sieve — try explaining that at the café.";
  }
  if (state.eventsSeen.has("bee-swarm")) {
    return "The bees filed the only protest that stuck.";
  }
  if (state.eventsSeen.has("dead-bunny")) {
    return "Dead bunny. Science continued. Respect.";
  }
  if (state.eventsSeen.has("binda-button")) {
    return "Milano left a button. The island kept the joke.";
  }
  if (state.eventsSeen.has("snail-tomb")) {
    return "Possible tomb. Definite snails.";
  }
  if (state.mechanismFound) {
    return "It belongs in a museum — and so do the gears.";
  }
  if (state.goatsHits >= 2) {
    return "The goats have entered the chat. Context will never be the same.";
  }
  const relics = ns.foundRelics();
  if (relics.length >= 3) {
    return `${relics.length} oddball finds bagged. The field notebook is getting weird.`;
  }
  if (state.barrenDigs > state.fruitfulDigs && state.dug.size > 4) {
    return "More dust than destiny — but the map learned something.";
  }
  if (won) {
    return "Five chapters sealed. Athens will pretend they always believed in you.";
  }
  if (state.hardMode) {
    return "Hard mode does not negotiate. The boats still leave.";
  }
  const chapters = state.chaptersSolved.size;
  if (chapters === 0) return "Zero chapters. Maximum character development.";
  return `${chapters}/5 chapters recovered. Next year, sharper pencils.`;
}


ns.fillSeasonRecap = function fillSeasonRecap(won) {
  const rank = gloryRank(state.score);
  const stats = document.getElementById("finalRecapStats");
  stats.hidden = false;
  stats.innerHTML =
    `<div><span class="k">Tracts</span>${state.dug.size} opened</div>` +
    `<div><span class="k">Chapters</span>${state.chaptersSolved.size}/5 sealed</div>` +
    `<div><span class="k">Mode</span>${state.hardMode ? "Hard" : "Standard"}</div>` +
    `<div><span class="k">Mechanism</span>${state.mechanismFound ? "Rumoured" : "Silent"}</div>` +
    `<div><span class="k">Odd finds</span>${ns.foundRelics().length}/${relicEvents().length}</div>` +
    `<div><span class="k">Paydirt</span>${state.fruitfulDigs} fruitful</div>` +
    `<div><span class="k">Dust</span>${state.barrenDigs} barren</div>`;
  const punch = document.getElementById("finalPunch");
  punch.hidden = false;
  punch.textContent = ns.seasonPunchline(won);
  return {
    won,
    rank,
    punch: punch.textContent,
  };
}


ns.recapText = function recapText(won) {
  const rank = gloryRank(state.score);
  return [
    "RAIDERS OF ANTIKYTHERA — EXPEDITION REPORT",
    won ? "Outcome: It belongs in a museum" : "Outcome: Storm season",
    `Glory: ${state.score} · Rank: ${rank.title}`,
    `Tracts: ${state.dug.size} · Chapters: ${state.chaptersSolved.size}/5`,
    `Mode: ${state.hardMode ? "Hard" : "Standard"} · Mechanism: ${state.mechanismFound ? "yes" : "no"}` +
      ` · Odd finds: ${ns.foundRelics().length}/${relicEvents().length}`,
    ns.seasonPunchline(won),
    typeof location !== "undefined" ? location.href.split("#")[0] : "",
  ].join("\n");
}


ns.copyRecap = async function copyRecap() {
  const won = /museum/i.test(document.getElementById("finalTitle").textContent || "");
  const text = ns.recapText(won);
  try {
    await navigator.clipboard.writeText(text);
    ns.toast("Expedition report copied", "hit");
  } catch (_) {
    ns.toast("Could not copy — select the report manually");
  }
}


ns.downloadRecapPng = async function downloadRecapPng() {
  const won = /museum/i.test(document.getElementById("finalTitle").textContent || "");
  const rank = gloryRank(state.score);
  const canvas = document.getElementById("recapCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#e8d9b8";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#4a2f1c";
  ctx.fillRect(36, 36, W - 72, H - 72);
  ctx.fillStyle = "#e8d9b8";
  ctx.fillRect(48, 48, W - 96, H - 96);

  ctx.fillStyle = "#8b2e2e";
  ctx.font = "600 28px Cinzel, serif";
  ctx.fillText("EXPEDITION REPORT", 80, 110);
  ctx.fillStyle = "#4a2f1c";
  ctx.font = "700 48px Cinzel, serif";
  ctx.fillText("Raiders of Antikythera", 80, 170);
  ctx.font = "600 32px Cinzel, serif";
  ctx.fillText(won ? "It belongs in a museum" : "Storm season", 80, 220);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = ns.rankArtUrl(rank.id);
    });
    ctx.drawImage(img, 80, 250, 740, 555);
  } catch (_) {
    ctx.fillStyle = "#d4c19a";
    ctx.fillRect(80, 250, 740, 400);
  }

  ctx.fillStyle = "#4a2f1c";
  ctx.font = "700 36px Cinzel, serif";
  ctx.fillText(rank.title, 80, 860);
  ctx.font = "28px Special Elite, monospace";
  ctx.fillText(`Glory ${state.score}  ·  ${state.dug.size} tracts  ·  ${state.chaptersSolved.size}/5 chapters`, 80, 910);
  ctx.fillText(state.hardMode ? "HARD MODE" : "STANDARD", 80, 955);
  if (state.mechanismFound) ctx.fillText("Mechanism rumoured", 80, 1000);
  const found = ns.foundRelics();
  if (found.length) {
    const labels = found.slice(0, 4).map((ev) => ev.title);
    const more = found.length > 4 ? ` +${found.length - 4}` : "";
    ctx.fillText("Odd finds: " + labels.join(" · ") + more, 80, 1040);
  }

  ctx.fillStyle = "#6b5340";
  ctx.font = "26px Special Elite, monospace";
  const punch = ns.seasonPunchline(won);
  const words = punch.split(" ");
  let line = "";
  let y = 1060;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > W - 160) {
      ctx.fillText(line, 80, y);
      line = w;
      y += 34;
    } else line = test;
  }
  if (line) ctx.fillText(line, 80, y);

  canvas.toBlob((blob) => {
    if (!blob) {
      ns.toast("PNG export failed");
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "raiders-of-antikythera-report.png";
    a.click();
    URL.revokeObjectURL(a.href);
    ns.toast("Report downloaded", "hit");
  }, "image/png");
}

