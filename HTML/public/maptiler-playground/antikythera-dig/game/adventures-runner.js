import { ns } from '../ns.js';
import { ADVENTURES, SIDE_PATH_ID } from '../data/adventures.js';
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


ns.adventureFlags = function adventureFlags() {
  if (!state.adventureFlags) state.adventureFlags = new Set();
  return state.adventureFlags;
}


ns.sidePathAdventure = function sidePathAdventure() {
  return ns.adventureById(SIDE_PATH_ID) || ADVENTURES[0] || null;
}


ns.beatStartNode = function beatStartNode(beat, flags) {
  if (typeof beat.startFor === "function") {
    return beat.startFor(flags) || beat.start;
  }
  return beat.start;
}


ns.pickAdventureBeat = function pickAdventureBeat() {
  if (state.ended) return null;
  const adventure = ns.sidePathAdventure();
  if (!adventure) return null;
  const done = state.adventuresDone || new Set();
  if (done.has(adventure.id)) return null;

  const digs = state.digsDone || 0;
  if (!state.adventureProgress) state.adventureProgress = Object.create(null);
  const beatIndex = state.adventureProgress[adventure.id] || 0;
  if (beatIndex >= adventure.beats.length) return null;

  const beat = adventure.beats[beatIndex];
  if (digs < (beat.afterDigs || 0)) return null;
  return { adventure, beatIndex, beat };
}


ns.resolveAdventureArt = function resolveAdventureArt(adventure, beat, beatIndex, node) {
  if (node && node.art) return node.art;
  if (beat && beat.art) return beat.art;
  if (beatIndex >= adventure.beats.length - 1 && adventure.art) return adventure.art;
  return (
    "images/events/adventure-" +
    encodeURIComponent(adventure.id) +
    "-b" +
    beatIndex +
    ".png"
  );
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
    effect.hidden = true;
    effect.textContent = "";
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

  const artSrc = ns.resolveAdventureArt(adventure, beat, beatIndex, node);
  art.hidden = true;
  art.onload = () => {
    art.hidden = false;
  };
  art.onerror = () => {
    if (adventure.art && artSrc !== adventure.art) {
      art.onerror = () => {
        art.hidden = true;
        art.removeAttribute("src");
      };
      art.src = adventure.art;
      return;
    }
    art.hidden = true;
    art.removeAttribute("src");
  };
  art.alt = node.title || adventure.folioLabel || adventure.title;
  art.src = artSrc;

  document.getElementById("fieldEvent").classList.add("on");
}


ns.beginAdventureBeat = function beginAdventureBeat(pick) {
  if (!pick) return false;
  const { adventure, beatIndex, beat } = pick;
  const flags = ns.adventureFlags();
  const startId = ns.beatStartNode(beat, flags);
  if (!beat.nodes[startId]) return false;
  ns.showAdventureNode(adventure, beatIndex, startId);
  ns.logLine(
    `<span class="hit">Side path</span> · ${adventure.title} · ${beatIndex + 1}/${adventure.beats.length}`
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
  if (!nextId || !beat.nodes[nextId]) return;
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

  if (node && (node.yesNext || node.noNext)) return;

  if (!state.adventureProgress) state.adventureProgress = Object.create(null);
  if (!state.adventuresDone) state.adventuresDone = new Set();
  const flags = ns.adventureFlags();

  if (node && node.flag) flags.add(node.flag);

  // Choice nodes that both go to ending still need a click-through — handled as normal nodes.
  // Advance beat when this node closes a chapter (nextBeat) or finishes the saga (finale).
  const closesBeat = !!(node && (node.nextBeat || node.finale));
  if (closesBeat) {
    state.adventureProgress[adventure.id] = (state.adventureProgress[adventure.id] || 0) + 1;
  }

  let effectLine = "";
  if (node && node.finale) {
    state.adventuresDone.add(adventure.id);
    const beforeTitle = gloryRank(state.score).title;
    effectLine =
      typeof adventure.reward === "function"
        ? adventure.reward(state, flags) || ""
        : "";
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
  } else if (closesBeat) {
    ns.toast(`${adventure.title} · to be continued…`);
  }

  ns._adventureSession = null;
  ns.hideFieldEvent();

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
  const beatIndex = pick.beatIndex;
  const chance = beatIndex === 0 ? 0.82 : 0.92;
  if (Math.random() > chance) return false;
  return ns.beginAdventureBeat(pick);
}


export { ADVENTURES, SIDE_PATH_ID };
