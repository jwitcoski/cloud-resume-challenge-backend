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

ns.openIsleBriefing = function openIsleBriefing() {
  const el = document.getElementById("isleBrief");
  el.classList.add("on");
  ns.hideFindHover();

  const bootInset = () => {
    if (!window.maptilersdk || !window.MAPTILER_API_KEY) return;
    maptilersdk.config.apiKey = window.MAPTILER_API_KEY;
    if (!ns.aegeanMap) {
      ns.aegeanMap = new maptilersdk.Map({
        container: "aegeanMap",
        style: maptilersdk.MapStyle.HYBRID,
        center: [24.15, 36.75],
        zoom: 6.15,
        navigationControl: true,
        geolocateControl: false,
      });
      ns.aegeanMap.on("load", () => {
        const marker = new maptilersdk.Marker({ color: "#8b2e2e" })
          .setLngLat(CENTER)
          .setPopup(
            new maptilersdk.Popup({ offset: 12, className: "dig-popup" }).setHTML(
              `<div class="dig-pop"><p class="kind">Southern Aegean</p>` +
                `<h3>Antikythera</h3>` +
                `<p>Between Kythera (N) and Crete (S). Strategic pinch-point on ancient sea lanes.</p></div>`
            )
          )
          .addTo(ns.aegeanMap);
        marker.togglePopup();

        const neighbours = [
          { name: "Kythera", lng: 22.98, lat: 36.25 },
          { name: "Crete", lng: 24.9, lat: 35.25 },
          { name: "Melos (obsidian)", lng: 24.45, lat: 36.72 },
        ];
        for (const n of neighbours) {
          new maptilersdk.Marker({ color: "#a67c2d" })
            .setLngLat([n.lng, n.lat])
            .setPopup(
              new maptilersdk.Popup({ offset: 10, className: "dig-popup" }).setText(n.name)
            )
            .addTo(ns.aegeanMap);
        }
      });
    } else {
      ns.aegeanMap.resize();
    }
  };

  // Map container is display:none until .on — resize after paint
  requestAnimationFrame(() => requestAnimationFrame(bootInset));
}


ns.closeIsleBriefing = function closeIsleBriefing() {
  document.getElementById("isleBrief").classList.remove("on");
}
