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

ns.loadJson = async function loadJson(url, fallbackUrl) {
  let res = await fetch(url);
  if (!res.ok && fallbackUrl) res = await fetch(fallbackUrl);
  if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
  return res.json();
}


ns.absUrl = function absUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, window.location.origin).href;
}

/**
 * MapLibre mangles pmtiles://http://... into a relative http/localhost:... path.
 * Use short archive keys instead: pmtiles://digboard/{z}/{x}/{y}
 */

ns.registerNamedPmtilesProtocol = function registerNamedPmtilesProtocol(archives) {
  if (!window.pmtiles || !pmtiles.PMTiles) {
    throw new Error("pmtiles library failed to load");
  }
  if (typeof maptilersdk.addProtocol !== "function") {
    throw new Error("maptilersdk.addProtocol missing — check MapTiler SDK CDN");
  }

  maptilersdk.addProtocol("pmtiles", async (params, abortController) => {
    const raw = String(params.url || "");
    const m = /^pmtiles:\/\/([A-Za-z0-9_-]+)(?:\/(\d+)\/(\d+)\/(\d+))?/.exec(raw);
    if (!m) throw new Error("Invalid pmtiles url: " + raw);

    const instance = archives[m[1]];
    if (!instance) throw new Error("Unknown pmtiles archive: " + m[1]);

    // TileJSON / metadata style request
    if (params.type === "json" || m[2] == null) {
      const h = await instance.getHeader();
      return {
        data: {
          tiles: ["pmtiles://" + m[1] + "/{z}/{x}/{y}"],
          minzoom: h.minZoom,
          maxzoom: h.maxZoom,
          bounds: [h.minLon, h.minLat, h.maxLon, h.maxLat],
        },
      };
    }

    const z = Number(m[2]);
    const x = Number(m[3]);
    const y = Number(m[4]);
    const resp = await instance.getZxy(z, x, y, abortController && abortController.signal);
    if (resp) {
      return {
        data: new Uint8Array(resp.data),
        cacheControl: resp.cacheControl,
        expires: resp.expires,
      };
    }
    // Empty MVT for missing tiles
    return { data: new Uint8Array() };
  });
}


ns.addPmtilesVectorSource = function addPmtilesVectorSource(sourceId, archiveKey, promoteId) {
  ns.map.addSource(sourceId, {
    type: "vector",
    tiles: ["pmtiles://" + archiveKey + "/{z}/{x}/{y}"],
    minzoom: 10,
    maxzoom: 17,
    bounds: ISLAND_BOUNDS,
    attribution: "Bevan & Conolly / ADS 10.5284/1012484 (CC-BY 3.0)",
    ...(promoteId ? { promoteId } : {}),
  });
}

