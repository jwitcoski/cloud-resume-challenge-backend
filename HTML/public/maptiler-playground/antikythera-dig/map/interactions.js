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


ns.wireMapInteractions = function wireMapInteractions() {
  ns.map.on("mousemove", "tracts-pick", (e) => {
    if (!state.started || state.paused || (state.ended && !state.revealed)) return;
    const f = (e.features || [])[0];
    if (!f) return;
    const id = String(f.id != null ? f.id : (f.properties && f.properties.Tract) || "");
    if (!id) return;
    if (!state.dug.has(id)) {
      if (typeof ns.tryShowHuntZoneAt === "function" && ns.tryShowHuntZoneAt(e.point, e.lngLat)) {
        ns.hideFindHover();
        ns.map.getCanvas().style.cursor = "help";
        return;
      }
      ns.hideHuntZoneHover?.();
      ns.hideFindHover();
      ns.map.getCanvas().style.cursor = "pointer";
      return;
    }
    ns.hideHuntZoneHover?.();
    ns.handleDugHover(e, id);
  });
  ns.map.on("mouseleave", "tracts-pick", () => {
    ns.hideFindHover();
    ns.map.getCanvas().style.cursor = "";
  });
  ns.map.on("click", "tracts-pick", ns.onTractClick);

  ns.map.on("mousemove", "period-hint-fill", (e) => {
    if (!state.started || state.paused || state.ended || state.revealed) return;
    if (!state.surveyPass || !state.huntChapter) return;
    const f = (e.features || [])[0];
    if (!f) return;
    ns.hideFindHover();
    ns.map.getCanvas().style.cursor = "help";
    ns.showHuntZoneHover(f, e.lngLat);
  });
  ns.map.on("mouseleave", "period-hint-fill", () => {
    ns.hideHuntZoneHover();
    ns.map.getCanvas().style.cursor = "";
  });

  ns.map.on("mousemove", "find-heat", (e) => {
    if (!state.started || state.paused || (state.ended && !state.revealed)) return;
    const artefacts = ns.queryArtefactAt(e.point);
    if (artefacts.length) {
      ns.map.getCanvas().style.cursor = "help";
      ns.showArtefactHover(artefacts[0], e.lngLat);
      return;
    }
    const f = (e.features || [])[0];
    const id = f && f.properties && f.properties.id;
    if (!id) return;
    ns.map.getCanvas().style.cursor = "help";
    ns.showFindHover(String(id), e.lngLat);
  });
  ns.map.on("mouseleave", "find-heat", () => {
    ns.hideFindHover();
    ns.map.getCanvas().style.cursor = "";
  });
  ns.map.on("click", "find-heat", (e) => {
    if (!state.started || state.paused) return;
    ns.hideFindHover();
    const f = (e.features || [])[0];
    const id = f && f.properties && f.properties.id;
    if (id) ns.showTractReport(String(id));
  });

  const scoutLayers = ["structures-dots", "terraces-line", "geology-fill"];
  ns.map.on("click", (e) => {
    if (!state.paused) return;
    const hits = ns.map.queryRenderedFeatures(e.point, { layers: scoutLayers });
    if (!hits.length) {
      ns.closeLandscapePopup();
      return;
    }
    const f = hits[0];
    let note = null;
    if (f.layer.id === "terraces-line") note = ns.noteForTerrace(f.properties);
    else if (f.layer.id === "geology-fill") note = ns.noteForGeology(f.properties);
    else if (f.layer.id === "structures-dots") note = ns.noteForStructure(f.properties);
    if (note) ns.openLandscapePopup(e.lngLat, note);
  });
  for (const lid of scoutLayers) {
    ns.map.on("mouseenter", lid, () => {
      if (state.paused) ns.map.getCanvas().style.cursor = "help";
    });
    ns.map.on("mouseleave", lid, () => {
      ns.map.getCanvas().style.cursor = "";
    });
  }

  ns.map.on("sourcedata", (e) => {
    if ((e.sourceId === "tracts" || e.sourceId === "digboard") && e.isSourceLoaded) {
      ns.refreshTractStates();
    }
  });

  document.getElementById("btnDig").addEventListener("click", ns.digSelected);
  document.getElementById("btnIsle").addEventListener("click", ns.openIsleBriefing);
  const gloryStat = document.getElementById("gloryStat");
  const rankEl = document.getElementById("statRank");
  gloryStat.addEventListener("mouseenter", () => {
    if (ns.isCoarsePointer()) return;
    ns.showGloryTip(rankEl);
  });
  gloryStat.addEventListener("mouseleave", () => {
    if (ns.isCoarsePointer()) return;
    ns.hideGloryTip();
  });
  rankEl.addEventListener("focus", () => ns.showGloryTip(rankEl));
  rankEl.addEventListener("blur", () => {
    if (ns.isCoarsePointer()) return;
    ns.hideGloryTip();
  });
  gloryStat.addEventListener("click", (e) => {
    if (!ns.isCoarsePointer()) return;
    e.preventDefault();
    const tip = document.getElementById("gloryTip");
    if (tip && tip.classList.contains("on")) ns.hideGloryTip();
    else ns.showGloryTip(rankEl);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!ns.isCoarsePointer()) return;
    const eraTip = document.getElementById("eraTip");
    const gloryTip = document.getElementById("gloryTip");
    const t = e.target;
    if (eraTip && eraTip.classList.contains("on") && !eraTip.contains(t) && !t.closest?.(".era")) {
      ns.hideEraTip();
    }
    if (gloryTip && gloryTip.classList.contains("on") && !gloryTip.contains(t) && !t.closest?.("#gloryStat")) {
      ns.hideGloryTip();
    }
  });
  ns.initMobileHud?.();
  document.getElementById("isleBriefOk").addEventListener("click", ns.closeIsleBriefing);
  document.getElementById("isleBrief").addEventListener("click", (e) => {
    if (e.target.id === "isleBrief") ns.closeIsleBriefing();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById("isleBrief").classList.contains("on")) {
      ns.closeIsleBriefing();
    }
  });
  document.getElementById("digEventOk").addEventListener("click", ns.finishDigModalFlow);
  document.getElementById("chapterBriefOk").addEventListener("click", ns.finishChapterModalFlow);
  document.getElementById("fieldEventOk").addEventListener("click", () => {
    ns.hideFieldEvent();
    if (state.days <= 0 || cannotAffordDig()) {
      ns.endSeason(false);
      return;
    }
    ns.saveGame();
    ns.renderHud();
  });
  document.getElementById("btnSurvey").addEventListener("click", () => {
    ns.setSurveyMode(!state.paused);
  });
  document.getElementById("btnSurveyPass").addEventListener("click", () => {
    ns.buySurveyPass();
  });
  document.getElementById("btnClear").addEventListener("click", () => {
    if (!state.started || state.paused) return;
    for (const id of state.selected) ns.setTractState(id, { selected: false });
    state.selected.clear();
    ns.renderHud();
  });
  document.getElementById("btnHire").addEventListener("click", () => {
    if (!state.started || state.paused || state.workers >= MAX_WORKERS || state.money < HIRE_COST) return;
    state.money -= HIRE_COST;
    state.workers += 1;
    ns.toast(`Another shovel on the payroll · crew of ${state.workers}`);
    ns.renderHud();
    ns.saveGame();
  });
  document.getElementById("btnAgain").addEventListener("click", () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) { /* ignore */ }
    location.reload();
  });
  document.getElementById("btnReveal").addEventListener("click", () => {
    ns.revealAllMaterials();
  });
  document.getElementById("btnRestartReveal").addEventListener("click", () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) { /* ignore */ }
    location.reload();
  });
  document.getElementById("btnStart").addEventListener("click", ns.startExpedition);
  document.getElementById("btnContinue").addEventListener("click", ns.continueExpedition);
  document.getElementById("btnFolio").addEventListener("click", ns.openFolio);
  document.getElementById("btnFolioStart").addEventListener("click", ns.openFolio);
  document.getElementById("btnFolioFinal").addEventListener("click", ns.openFolio);
  document.getElementById("folioClose").addEventListener("click", ns.closeFolio);
  document.getElementById("folioLightboxClose").addEventListener("click", (e) => {
    e.stopPropagation();
    ns.closeFolioLightbox();
  });
  document.getElementById("folioLightbox").addEventListener("click", (e) => {
    if (e.target.id === "folioLightbox") ns.closeFolioLightbox();
  });
  document.getElementById("btnCopyRecap").addEventListener("click", ns.copyRecap);
  document.getElementById("btnDownloadRecap").addEventListener("click", ns.downloadRecapPng);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.getElementById("startScreen").classList.contains("on")) {
      e.preventDefault();
      if (!document.getElementById("btnContinue").hidden && ns.peekSave()) ns.continueExpedition();
      else ns.startExpedition();
    }
    if (e.key === "Escape") {
      if (document.getElementById("folioLightbox").classList.contains("on")) {
        ns.closeFolioLightbox();
        return;
      }
      if (document.getElementById("folioModal").classList.contains("on")) {
        ns.closeFolio();
      }
    }
  });

};

ns.finishBoot = function finishBoot(tractsFc, digHeader, findsHeader) {
  ns.loadFolioFromDisk();
  const save = ns.peekSave();
  const cont = document.getElementById("btnContinue");
  if (save) {
    cont.hidden = false;
    cont.textContent = `Continue expedition (${save.dug?.length || 0} tracts · ${save.score || 0} glory)`;
  }

  ns.markChartsReady(
    (tractsFc.features || []).length,
    digHeader,
    findsHeader
  );
}

