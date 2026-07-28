import { ns } from '../ns.js';
import { ADVENTURES, SIDE_PATH_ID, RELIC_CLUSTERS } from '../data/adventures.js';
import { FIELD_EVENTS, relicEvents } from '../data/field-events.js';
import {
  state,
  gloryRank,
  cannotAffordDig,
} from './state.js';

/** @type {{ adventureId: string, beatIndex: number, nodeId: string } | null} */
ns._adventureSession = null;
/** Relic to fire after the saga leaf closes */
ns._pendingSagaRelic = null;


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
  if (adventure.art) return adventure.art;
  return (
    "images/events/adventure-" +
    encodeURIComponent(adventure.id) +
    "-b" +
    beatIndex +
    ".png"
  );
}


ns.relicEventById = function relicEventById(id) {
  return FIELD_EVENTS.find((ev) => ev.id === id && ev.relicTracts && ev.relicTracts.length) || null;
}


/** First unseen relic in a cluster; else any unseen relic; else null. */
ns.pickRelicFromCluster = function pickRelicFromCluster(clusterKey) {
  const seen = state.eventsSeen || new Set();
  const ids = RELIC_CLUSTERS[clusterKey] || [];
  for (const id of ids) {
    if (!seen.has(id)) {
      const ev = ns.relicEventById(id);
      if (ev) return ev;
    }
  }
  for (const ev of relicEvents()) {
    if (!seen.has(ev.id)) return ev;
  }
  return null;
}


ns.showAdventureNode = function showAdventureNode(adventure, beatIndex, nodeId) {
  const beat = adventure.beats[beatIndex];
  const node = beat.nodes[nodeId];
  if (!node) return;

  ns._adventureSession = {
    adventureId: adventure.id,
    beatIndex,
    nodeId,
    pendingRelic: null,
  };

  let summary = node.blurb || "";
  if (node.finale && node.endingCluster) {
    const relic = ns.pickRelicFromCluster(node.endingCluster);
    if (relic) {
      ns._adventureSession.pendingRelic = relic;
      summary =
        summary +
        ` The chart locks onto tract ${relic.relicTracts[0]} — ${relic.title}.`;
    } else {
      summary = summary + " (Every odd find in this cluster is already in the bag.)";
    }
  }

  ns.hideFindHover();
  const card = document.getElementById("fieldEventCard");
  card.classList.remove("good-card", "bad-card", "mixed-card", "hit-card", "miss-card");
  card.classList.add(node.finale ? "good-card" : "mixed-card");

  document.getElementById("fieldEventEyebrow").textContent =
    node.eyebrow || "Side path";
  document.getElementById("fieldEventTitle").textContent = node.title || adventure.title;
  document.getElementById("fieldEventSummary").textContent = summary;

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
    okBtn.textContent = node.finale ? "Follow the find" : "Continue";
  }

  const artSrc =
    (ns._adventureSession.pendingRelic &&
      "images/events/event-" +
        encodeURIComponent(ns._adventureSession.pendingRelic.id) +
        ".png") ||
    ns.resolveAdventureArt(adventure, beat, beatIndex, node);
  art.hidden = true;
  art.onload = () => {
    art.hidden = false;
  };
  art.onerror = () => {
    const fallback = ns.resolveAdventureArt(adventure, beat, beatIndex, node);
    if (fallback && artSrc !== fallback) {
      art.onerror = () => {
        if (adventure.art && fallback !== adventure.art) {
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
      art.src = fallback;
      return;
    }
    art.hidden = true;
    art.removeAttribute("src");
  };
  art.alt =
    (ns._adventureSession.pendingRelic && ns._adventureSession.pendingRelic.title) ||
    node.title ||
    adventure.folioLabel ||
    adventure.title;
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

  const closesBeat = !!(node && (node.nextBeat || node.finale));
  if (closesBeat) {
    state.adventureProgress[adventure.id] = (state.adventureProgress[adventure.id] || 0) + 1;
  }

  let pendingRelic = null;

  if (node && node.finale) {
    state.adventuresDone.add(adventure.id);
    pendingRelic =
      (session.pendingRelic && !state.eventsSeen.has(session.pendingRelic.id)
        ? session.pendingRelic
        : null) ||
      (node.endingCluster ? ns.pickRelicFromCluster(node.endingCluster) : null);
    if (pendingRelic) {
      state.adventureEndingRelic = pendingRelic.id;
      const tract = pendingRelic.relicTracts && pendingRelic.relicTracts[0];
      if (tract) {
        try {
          ns.flyToTract(tract);
        } catch (_) { /* map may not be ready */ }
      }
    }
    const beforeTitle = gloryRank(state.score).title;
    const effectLine =
      typeof adventure.reward === "function"
        ? adventure.reward(state, flags) || ""
        : "";
    state.score = Math.max(0, state.score);
    ns.collectFolio("adventure:" + adventure.id);
    const findBit = pendingRelic
      ? ` · find: ${pendingRelic.title}`
      : " · (all odd finds already bagged)";
    ns.logLine(
      `<span class="hit">${adventure.title}</span> · ${effectLine || "side path closed"}${findBit}`,
      "hit"
    );
    const after = gloryRank(state.score);
    if (after.title !== beforeTitle) {
      ns.toast(`Promoted — ${after.title}`, "hit");
    } else if (pendingRelic) {
      ns.toast(`Side path → ${pendingRelic.title}`, "hit");
    } else {
      ns.toast(adventure.folioLabel || adventure.title, "hit");
    }
  } else if (closesBeat) {
    ns.toast(`${adventure.title} · to be continued…`);
  }

  ns._adventureSession = null;
  ns.hideFieldEvent();

  if (pendingRelic && typeof ns.runFieldEvent === "function") {
    // Hand off to the special-find cable (folio + glory from the relic itself).
    ns.runFieldEvent(pendingRelic);
    ns.saveGame();
    ns.renderHud();
    return;
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
  const beatIndex = pick.beatIndex;
  const chance = beatIndex === 0 ? 0.85 : 0.95;
  if (Math.random() > chance) return false;
  return ns.beginAdventureBeat(pick);
}


export { ADVENTURES, SIDE_PATH_ID, RELIC_CLUSTERS };
