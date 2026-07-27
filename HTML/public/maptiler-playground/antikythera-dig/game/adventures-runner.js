import { ns } from '../ns.js';
import { ADVENTURES } from '../data/adventures.js';
import {
  state,
  gloryRank,
  cannotAffordDig,
} from './state.js';

/** @type {{ adventureId: string, beatIndex: number, nodeId: string } | null} */
ns._adventureSession = null;


ns.adventureById = function adventureById(id) {
  return ADVENTURES.find((a) => a.id === id) || null;
}


ns.pickAdventureBeat = function pickAdventureBeat() {
  if (state.ended) return null;
  const digs = state.digsDone || 0;
  const progress = state.adventureProgress || Object.create(null);
  const done = state.adventuresDone || new Set();

  const eligible = [];
  for (const adv of ADVENTURES) {
    if (done.has(adv.id)) continue;
    const beatIndex = progress[adv.id] || 0;
    if (beatIndex >= adv.beats.length) continue;
    const beat = adv.beats[beatIndex];
    if (digs < (beat.afterDigs || 0)) continue;
    eligible.push({ adventure: adv, beatIndex, beat });
  }
  if (!eligible.length) return null;
  // Prefer the chain closest to finishing, then earliest gate.
  eligible.sort((a, b) => {
    const aLeft = a.adventure.beats.length - a.beatIndex;
    const bLeft = b.adventure.beats.length - b.beatIndex;
    if (aLeft !== bLeft) return aLeft - bLeft;
    return (a.beat.afterDigs || 0) - (b.beat.afterDigs || 0);
  });
  return eligible[0];
}


ns.showAdventureNode = function showAdventureNode(adventure, beatIndex, nodeId) {
  const beat = adventure.beats[beatIndex];
  const node = beat.nodes[nodeId];
  if (!node) return;

  ns._adventureSession = {
    adventureId: adventure.id,
    beatIndex,
    nodeId,
  };

  ns.hideFindHover();
  const card = document.getElementById("fieldEventCard");
  card.classList.remove("good-card", "bad-card", "mixed-card", "hit-card", "miss-card");
  card.classList.add("mixed-card");

  document.getElementById("fieldEventEyebrow").textContent =
    node.eyebrow || "Side path";
  document.getElementById("fieldEventTitle").textContent = node.title || adventure.title;
  document.getElementById("fieldEventSummary").textContent = node.blurb || "";

  const effect = document.getElementById("fieldEventEffect");
  const art = document.getElementById("fieldEventArt");
  const choices = document.getElementById("fieldEventChoices");
  const okBtn = document.getElementById("fieldEventOk");

  const isChoice = !!(node.yesNext || node.noNext);
  if (isChoice) {
    effect.textContent = "Choose carefully. (It will not matter.)";
    effect.hidden = false;
    choices.hidden = false;
    okBtn.hidden = true;
    document.getElementById("fieldEventYes").textContent = node.yes || "Yes";
    document.getElementById("fieldEventNo").textContent = node.no || "No";
  } else {
    effect.hidden = true;
    effect.textContent = "";
    choices.hidden = true;
    okBtn.hidden = false;
    okBtn.textContent = node.finale ? "Dust yourself off" : "Continue";
  }

  const artSrc = node.finale && adventure.art
    ? adventure.art
    : "";
  if (artSrc) {
    art.hidden = true;
    art.onload = () => {
      art.hidden = false;
    };
    art.onerror = () => {
      art.hidden = true;
      art.removeAttribute("src");
    };
    art.alt = adventure.folioLabel || adventure.title;
    art.src = artSrc;
  } else {
    art.hidden = true;
    art.removeAttribute("src");
  }

  document.getElementById("fieldEvent").classList.add("on");
}


ns.beginAdventureBeat = function beginAdventureBeat(pick) {
  if (!pick) return false;
  const { adventure, beatIndex, beat } = pick;
  ns.showAdventureNode(adventure, beatIndex, beat.start);
  ns.logLine(
    `<span class="hit">Side path</span> · ${adventure.title} · beat ${beatIndex + 1}/${adventure.beats.length}`
  );
  return true;
}


ns.resolveAdventureChoice = function resolveAdventureChoice(yes) {
  const session = ns._adventureSession;
  if (!session) return;
  const adventure = ns.adventureById(session.adventureId);
  if (!adventure) return;
  const beat = adventure.beats[session.beatIndex];
  const node = beat.nodes[session.nodeId];
  if (!node) return;
  const nextId = yes ? node.yesNext : node.noNext;
  if (!nextId) return;
  ns.showAdventureNode(adventure, session.beatIndex, nextId);
}


ns.finishAdventureNode = function finishAdventureNode() {
  const session = ns._adventureSession;
  if (!session) {
    ns.hideFieldEvent();
    return;
  }
  const adventure = ns.adventureById(session.adventureId);
  if (!adventure) {
    ns._adventureSession = null;
    ns.hideFieldEvent();
    return;
  }
  const beat = adventure.beats[session.beatIndex];
  const node = beat.nodes[session.nodeId];

  if (node && (node.yesNext || node.noNext)) {
    // Still on a choice node — ignore Carry on.
    return;
  }

  if (!state.adventureProgress) state.adventureProgress = Object.create(null);
  if (!state.adventuresDone) state.adventuresDone = new Set();

  const nextBeat = (state.adventureProgress[adventure.id] || 0) + 1;
  state.adventureProgress[adventure.id] = nextBeat;

  let effectLine = "";
  if (node && node.finale) {
    state.adventuresDone.add(adventure.id);
    const beforeTitle = gloryRank(state.score).title;
    effectLine = typeof adventure.reward === "function" ? adventure.reward(state) || "" : "";
    state.score = Math.max(0, state.score);
    ns.collectFolio("adventure:" + adventure.id);
    ns.logLine(
      `<span class="hit">${adventure.title}</span> · ${effectLine || "side path closed"}`,
      "hit"
    );
    const after = gloryRank(state.score);
    if (after.title !== beforeTitle) {
      ns.toast(`Promoted — ${after.title}`, "hit");
    } else {
      ns.toast(adventure.folioLabel || adventure.title, "hit");
    }
  } else {
    ns.toast(`${adventure.title} · to be continued…`);
  }

  ns._adventureSession = null;
  ns.hideFieldEvent();

  if (effectLine) {
    // Show reward briefly via toast/log only — modal already closed.
  }

  if (state.days <= 0 || cannotAffordDig()) {
    ns.endSeason(false);
    return;
  }
  ns.saveGame();
  ns.renderHud();
}


ns.maybeAdventureAfterDig = function maybeAdventureAfterDig() {
  if (state.ended) return false;
  if (ns._adventureSession) return false;
  const pick = ns.pickAdventureBeat();
  if (!pick) return false;
  // Mild chance so it doesn't fire every eligible dig — except the first beat of a chain feels more reliable.
  const beatIndex = pick.beatIndex;
  const chance = beatIndex === 0 ? 0.7 : 0.85;
  if (Math.random() > chance) return false;
  return ns.beginAdventureBeat(pick);
}


export { ADVENTURES };
