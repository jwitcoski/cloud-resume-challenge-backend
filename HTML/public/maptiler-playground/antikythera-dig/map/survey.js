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

ns.setLayerVis = function setLayerVis(id, visible) {
  if (!ns.map || !ns.map.getLayer(id)) return;
  ns.map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

ns.huntChapterMeta = function huntChapterMeta(id) {
  return MYSTERY.find((m) => m.id === id) || null;
};

ns.defaultFogPaint = function defaultFogPaint() {
  return {
    "fill-color": [
      "case",
      ["boolean", ["feature-state", "dug"], false], "#000000",
      ["boolean", ["feature-state", "selected"], false], "#a67c2d",
      "#2a2116",
    ],
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "dug"], false], 0,
      1,
    ],
  };
};

/** Soft targeting — plain fog (no per-tract find heat). */
ns.updateFogPaintForSurvey = function updateFogPaintForSurvey() {
  if (!ns.map || !ns.map.getLayer("tracts-fog")) return;
  const paint = ns.defaultFogPaint();
  ns.map.setPaintProperty("tracts-fog", "fill-color", paint["fill-color"]);
  ns.map.setPaintProperty("tracts-fog", "fill-opacity", paint["fill-opacity"]);
  const leg = document.getElementById("surveyLegend");
  if (leg) leg.hidden = true;
};

ns.kmBetween = function kmBetween(lng1, lat1, lng2, lat2) {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLng = (lng2 - lng1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Coarse place-name for a chase circle — used in field-brief popups. */
ns.islandPocketLabel = function islandPocketLabel(lng, lat) {
  if (lat >= 35.882) return "the northern tip";
  if (lat >= 35.872) return "the northern waist";
  if (lat < 35.845) return "the far south";
  if (lng >= 23.318) return "the southeastern flanks";
  if (lng <= 23.288) return "the western shore";
  if (lat >= 35.862) return "the central farms";
  return "the southern half";
};

ns.pocketArtSlug = function pocketArtSlug(pocket) {
  return String(pocket || "default")
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
};

ns.chaseArtUrl = function chaseArtUrl(art) {
  if (!art) return "";
  return "images/chase/" + encodeURIComponent(art) + ".png";
};

/**
 * Why this pocket would hold the chase era — Indy field-journal voice.
 * Geography + soils/terraces + landscape use; never names individual tracts.
 * Each circle gets its own plate (…-c1…c4) and its own dig tip — even if two
 * circles land in the same coarse pocket.
 */
ns.huntZoneNote = function huntZoneNote(meta, z, i, total) {
  const pocket = ns.islandPocketLabel(z.lng, z.lat);
  const rank =
    i === 0
      ? "The charts’ boldest whisper for this chase"
      : total > 2 && i === total - 1
        ? "A thinner echo — still worth a look"
        : "Another gathering-place on the old survey";

  const byId = {
    neolithic: {
      "the northern tip":
        "Bare nummulitic limestone and a paper-thin A-horizon — lookout ledges and overnight camps, not plough soils. Flakes ride the bedrock more than any terrace fill.",
      "the western shore":
        "Wave-cut rock and pocket beach earth. Short-stay hunters left lithics on the strand; Melian glass travelled with people who slept a night, not a generation.",
      "the southeastern flanks":
        "Flysch meeting limestone above a landing cove. Early paths hugged the contact; projectile waste sits in lean slope soil, not farmed terrace webs.",
      "the far south":
        "Scree and hard rock with tiny soil pockets. Stubborn knapping floors cling to flat limestone slabs where earth never thickened enough for farms.",
      "the southern half":
        "Mixed limestone ridges and shallow hollows. Foragers used natural soil pockets seasonally — proto-paths, not yet true dry-stone terraces.",
      "the central farms":
        "The isle’s deepest early alluvium. Soft earth invited the first scratched garden plots and low stone lines that catch soil — the seed of terrace farming.",
      default:
        `Around ${pocket}, thin Mediterranean earth over limestone. Think coastal stopovers and hunting kits on usable soil pockets — not villages.`,
    },
    bronze: {
      "the northern tip":
        "Rocky limestone with scrap terraces at best. Sheep folds and lookouts more than grain — soft soils south of the waist hold the real farmscape.",
      "the northern waist":
        "Flysch–limestone saddle where dry-stone risers start trapping reddish slope fill for barley and olives. Terrace country begins here.",
      "the central farms":
        "Thick alluvial hollow, broad terrace webs, packed threshing floors. Minoan-linked households piled pottery where soil depth repaid the wall labour.",
      "the southern half":
        "Cascading stone terraces on limestone slopes — the densest prehistoric farmscape. Sherds ride the retained fill, not bare pavement.",
      "the far south":
        "Harsh tip: crumbling terrace scraps on scree, thin earth. Fishing and watch more than plough — dig soft pockets, skip dead rock.",
      "the southeastern flanks":
        "Flysch slopes cut into cove-facing terraces. Red-brown slope soils behind walls mark people who bothered to farm the approach to the sea.",
      default:
        `Bronze Age families chased soft earth. Around ${pocket}, hunt alluvium and terrace webs — pottery rides the fills people built to keep soil from washing away.`,
    },
    hellenistic: {
      "the northern tip":
        "Citadel limestone: thin soil on the ridge, garrison garden terraces below. Power watched the channel from rock; food came from wall-caught earth.",
      "the northern waist":
        "Saddle terraces feeding the fort road. Flysch soils in steps — logistics corridor where dumps and traffic cling to workable ground.",
      "the central farms":
        "Deep alluvial basin and orchard terraces that supplied the garrison. Rich brown earth south of the citadel is farm first, stronghold second.",
      "the southern half":
        "Wrong end for pirates as a capital, but cascading vine and olive terraces still show how the hinterland fed northern power.",
      default:
        `Hellenistic life couples fortress rock with terraced supply farms. Around ${pocket}, read ridge limestone against soft hollow fills.`,
    },
    roman: {
      "the northern tip":
        "Lookout limestone and villa garden terraces — thin rocky soil improved only where walls catch earth. Elite overlook, not the village heart.",
      "the central farms":
        "Classic Late Roman reseeding: modest clusters on the deepest workable soils and repaired terrace webs after earlier abandonments.",
      "the southern half":
        "Several farming villages on broad pottery spreads. Terrace labour and soft rock — ordinary imperial fields, not one citadel.",
      "the far south":
        "Southern village ground: water, fields, and stone risers holding lean earth through the quiet centuries after the pirates.",
      "the southeastern flanks":
        "Slope farms of the Roman return. Pair pottery carpets with terrace lines where flysch and limestone give soft enough soil.",
      "the western shore":
        "Coastal and near-coast farms on pocket soils — reoccupation spreads along workable shore earth, not a single northern capital.",
      default:
        `Roman villages re-seeded soft ground. Around ${pocket}, dig broad pottery on terrace fills and alluvium — not treasure rooms on bare rock.`,
    },
    byzantine: {
      "the northern tip":
        "Thin return on northern limestone. Terrace scraps and lean soils — every sherd is precious; the north is not this chapter’s heart.",
      "the southern half":
        "Sparse southern footholds on older farm terraces after Late Antique decline. Glimpse settlements riding reused soil catches.",
      "the far south":
        "The rare Byzantine carpet prefers southern earth pockets and repaired risers. One good soft-soil trench can make the short chapter.",
      "the southeastern flanks":
        "Thin reoccupation on southern slopes — whisper-level pottery in terrace fill where people still coaxed grain from flysch soils.",
      "the central farms":
        "A stubborn foothold in the alluvial hollow among older farm ground. Byzantine sherds hide inside already-promising soft tracts.",
      default:
        `Byzantine centuries are scarce gold. Around ${pocket}, hunt thin returns in terrace fills and soft hollows — dig as if every sherd might be the last.`,
    },
  };

  const pack = byId[meta.id] || {};
  const hasPocket = Object.prototype.hasOwnProperty.call(pack, pocket);
  const baseBlurb = (hasPocket ? pack[pocket] : pack.default) ||
    `The old survey thickens for ${meta.label} around ${pocket}. ${meta.where}`;

  // Circle-specific lens so two circles in the same pocket never share a tip.
  const lenses = [
    "Start with a soil profile: thick brown fill beats bare limestone every time.",
    "Walk the dry-stone risers — finds ride the earth those walls were built to keep.",
    "Work geology contacts (flysch against limestone, scree against alluvium) where paths and plots once clung.",
    "Prefer hollows and terrace treads over ridge pavement; people farmed what they could hold.",
  ];
  const lens = lenses[i % lenses.length];

  const digById = {
    neolithic: [
      "Lithics on thin coastal or ridge soils; skip deep plough fantasy — early pottery is scarce.",
      "Hunt blade waste in natural soil pockets and strand earth, not built terrace webs.",
      "Flat limestone slabs and lean hollows: knapping floors before farms.",
      "If earth deepens inland, treat it as a rare garden pocket — still lithics-first.",
    ],
    bronze: [
      "Pottery on soft soils and terrace fills; bare northern limestone is usually a waste of days.",
      "Follow copper-coloured risers downhill into thicker fill — that is farm country.",
      "Threshing floors and alluvial hollows repay trenches; scree tips rarely do.",
      "Cove-facing terraces on flysch slopes: dig the retained red-brown earth.",
    ],
    hellenistic: [
      "Citadel ridge and garrison garden terraces — stay with northern rock-and-fill pairs.",
      "Saddle logistics: dumps and traffic on stepped flysch soils toward the fort road.",
      "Supply farms in deep alluvium; do not confuse hinterland orchards with the stronghold itself.",
      "Southern terraces may feed the story, but the capital signal is still northern limestone.",
    ],
    roman: [
      "Broad pottery on repaired terrace webs; one deep hole on bare rock will not tell the village story.",
      "Central alluvium and modest clusters — reseeding after abandonment loves soft earth.",
      "Southern slope farms: pair sherd carpets with visible stone risers.",
      "Coastal pocket soils and near-shore fields — spreads, not a citadel dump.",
    ],
    byzantine: [
      "Every EByz / MByz sherd is precious; dig soft southern fills before northern pavement.",
      "Reuse older terrace catches — thin returns hide inside already-farmed hollows.",
      "Far-south earth pockets and repaired risers are the short chapter’s best bet.",
      "Lean slope terraces: whisper-level pottery only — move on if the fill is sterile rock.",
    ],
  };

  const digs = digById[meta.id] || [meta.look];
  const dig = digs[i % digs.length] || meta.look;

  // Unique plate per circle (c1…c4) so hover art never collapses across zones.
  const art = `${meta.id}-c${i + 1}`;

  return {
    title: meta.label,
    kind: `Chase circle ${i + 1} of ${total} · ${pocket}`,
    blurb: `${rank}. ${baseBlurb} ${lens}`,
    dig,
    art,
    artUrl: ns.chaseArtUrl(art),
    pocket,
  };
};

/**
 * Generalize chapter heat into a few broad search pockets.
 * Uses real period counts, but snaps / pads / merges so fog squares stay secret.
 */
ns.buildHuntZones = function buildHuntZones(meta) {
  if (!meta || !state.scores) return [];
  const raw = [];
  for (const s of Object.values(state.scores)) {
    let n = 0;
    for (const k of meta.keys) n += Number((s.periods || {})[k]) || 0;
    if (n > 0 && s.lng != null && s.lat != null) raw.push({ lng: s.lng, lat: s.lat, n });
  }
  const strong = raw.filter((p) => p.n >= 2).length;
  const minN = strong > 80 ? 4 : strong > 30 ? 3 : 2;
  const pts = raw.filter((p) => p.n >= minN);
  if (!pts.length) {
    if (!meta.hint) return [];
    return [{ lng: meta.hint.lng, lat: meta.hint.lat, radiusKm: meta.hint.radiusKm, weight: 0 }];
  }

  const cellDeg = 0.014; // ~1.5 km buckets
  const cells = new Map();
  for (const p of pts) {
    const key = Math.floor(p.lng / cellDeg) + "," + Math.floor(p.lat / cellDeg);
    let c = cells.get(key);
    if (!c) {
      c = { weight: 0, lngSum: 0, latSum: 0, members: [] };
      cells.set(key, c);
    }
    c.weight += p.n;
    c.lngSum += p.lng * p.n;
    c.latSum += p.lat * p.n;
    c.members.push(p);
  }

  const ranked = [...cells.values()].sort((a, b) => b.weight - a.weight).slice(0, 6);
  const zones = [];
  for (const c of ranked) {
    let lng = c.lngSum / c.weight;
    let lat = c.latSum / c.weight;
    let maxD = 0.3;
    for (const m of c.members) {
      const d = ns.kmBetween(lng, lat, m.lng, m.lat);
      if (d > maxD) maxD = d;
    }
    // Snap + pad so pockets read as field hypotheses, not dig targets.
    lng = Math.round(lng / 0.006) * 0.006;
    lat = Math.round(lat / 0.006) * 0.006;
    const radiusKm = Math.min(1.55, Math.max(0.55, Math.ceil((maxD + 0.4) * 2) / 2));
    const z = { lng, lat, radiusKm, weight: c.weight };
    let merged = false;
    for (const o of zones) {
      if (ns.kmBetween(z.lng, z.lat, o.lng, o.lat) < Math.max(o.radiusKm, z.radiusKm) * 0.85) {
        const w = o.weight + z.weight;
        o.lng = (o.lng * o.weight + z.lng * z.weight) / w;
        o.lat = (o.lat * o.weight + z.lat * z.weight) / w;
        o.lng = Math.round(o.lng / 0.006) * 0.006;
        o.lat = Math.round(o.lat / 0.006) * 0.006;
        o.radiusKm = Math.min(1.7, Math.max(o.radiusKm, z.radiusKm) + 0.15);
        o.weight = w;
        merged = true;
        break;
      }
    }
    if (!merged) zones.push(z);
  }
  return zones.slice(0, 4);
};

/** Persistent generalized search pockets for the season thesis. */
ns.restoreHuntZone = function restoreHuntZone() {
  if (!ns.map || !ns.map.getSource("period-hint")) return;
  if (state.revealed || !state.surveyPass || !state.huntChapter) {
    ns.clearPeriodHint();
    return;
  }
  const meta = ns.huntChapterMeta(state.huntChapter);
  if (!meta) {
    ns.clearPeriodHint();
    return;
  }
  const zones = ns.buildHuntZones(meta);
  ns.map.getSource("period-hint").setData({
    type: "FeatureCollection",
    features: zones.map((z, i) => {
      const note = ns.huntZoneNote(meta, z, i, zones.length);
      return {
        type: "Feature",
        properties: {
          id: meta.id,
          label: meta.label,
          i,
          weight: z.weight,
          pocket: note.pocket,
          why: note.blurb,
          digTip: note.dig,
          circleLabel: note.kind,
          artUrl: note.artUrl || "",
          art: note.art || "",
        },
        geometry: ns.circlePolygon(z.lng, z.lat, z.radiusKm),
      };
    }),
  });
};

ns.hideHuntZoneHover = function hideHuntZoneHover() {
  if (ns.huntZoneKey) ns.huntZoneKey = null;
  if (ns.huntZonePopup) ns.huntZonePopup.remove();
};

ns.ensureHuntZonePopup = function ensureHuntZonePopup() {
  if (!ns.huntZonePopup) {
    ns.huntZonePopup = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "320px",
      className: "dig-popup dig-popup-chase",
      offset: 16,
    });
  }
  return ns.huntZonePopup;
};

ns.showHuntZoneHover = function showHuntZoneHover(feature, lngLat) {
  if (!ns.map || !state.started || state.paused || state.ended || state.revealed) return false;
  if (!state.surveyPass || !state.huntChapter) return false;
  const p = (feature && feature.properties) || {};
  if (!p.why && !p.label) return false;
  const key = "hz:" + (p.id || "") + ":" + String(p.i ?? "");
  const popup = ns.ensureHuntZonePopup();
  const chapterUrl = p.id && ns.chapterArtUrl ? ns.chapterArtUrl(p.id) : "";
  const chaseUrl = p.art ? ns.chaseArtUrl(p.art) : (p.artUrl || "");
  if (ns.huntZoneKey !== key) {
    ns.huntZoneKey = key;
    popup.setHTML(
      ns.landscapePopupHtml({
        title: p.label || "Chase",
        kind: p.circleLabel || "Field brief",
        blurb: p.why || "",
        dig: p.digTip || "Read the rock and terraces inside the circle before you spend a trench.",
        // Prefer tip plate; fall back to chapter sketch if the chase PNG is missing.
        artUrl: chaseUrl || chapterUrl,
        artFallback: chaseUrl && chapterUrl && chaseUrl !== chapterUrl ? chapterUrl : "",
      })
    );
  }
  popup.setLngLat(lngLat).addTo(ns.map);
  return true;
};

ns.tryShowHuntZoneAt = function tryShowHuntZoneAt(point, lngLat) {
  if (!ns.map || !ns.map.getLayer("period-hint-fill")) return false;
  if (!state.surveyPass || !state.huntChapter || state.paused) return false;
  const hits = ns.map.queryRenderedFeatures(point, { layers: ["period-hint-fill"] });
  if (!hits.length) return false;
  return ns.showHuntZoneHover(hits[0], lngLat);
};

ns.applySurveyFeatureStates = function applySurveyFeatureStates() {
  ns.restoreHuntZone();
};

ns.renderHuntPicker = function renderHuntPicker() {
  const shell = document.getElementById("fieldBriefHint");
  const wrap = document.getElementById("huntPicker");
  const active = document.getElementById("fieldBriefActive");
  const showShell = state.started && !state.ended && !state.revealed;
  if (shell) shell.hidden = !showShell;

  if (!wrap) return;
  const showPicker = showShell && state.surveyPass;
  wrap.hidden = !showPicker;

  const meta = ns.huntChapterMeta(state.huntChapter);
  if (active) {
    if (meta) {
      active.hidden = false;
      active.textContent = `· chase: ${meta.label}`;
    } else if (state.surveyPass) {
      active.hidden = false;
      active.textContent = "· brief ready";
    } else {
      active.hidden = true;
      active.textContent = "";
    }
  }

  if (!showPicker) {
    const note = document.getElementById("huntThesisNote");
    if (note) {
      note.hidden = true;
      note.innerHTML = "";
    }
    return;
  }

  if (!wrap.dataset.ready) {
    wrap.innerHTML =
      `<strong>Name your chase</strong>` +
      `<div class="hunt-options">` +
      MYSTERY.map(
        (m) =>
          `<button type="button" data-hunt="${m.id}" title="${m.when}">${m.label}</button>`
      ).join("") +
      `<button type="button" data-hunt="" class="hunt-off">Call it off</button>` +
      `</div>` +
      `<span class="lede-mini">Rough circles where that age gathers — hover a circle for why. Not which square hides the goods. Read the rock inside them.</span>`;
    wrap.dataset.ready = "1";
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-hunt]");
      if (!btn || !state.surveyPass) return;
      ns.setHuntChapter(btn.getAttribute("data-hunt") || null);
    });
  }

  for (const btn of wrap.querySelectorAll("[data-hunt]")) {
    const id = btn.getAttribute("data-hunt") || "";
    btn.classList.toggle("on", (state.huntChapter || "") === id);
  }

  const note = document.getElementById("huntThesisNote");
  if (note) {
    if (meta) {
      const zones = ns.buildHuntZones(meta);
      const n = zones.length;
      note.hidden = false;
      note.innerHTML =
        `<strong>${meta.label}</strong> — ${n} rough circle${n === 1 ? "" : "s"} on the chart. ` +
        `${meta.look}`;
    } else {
      note.hidden = true;
      note.innerHTML = "";
    }
  }
};

ns.setHuntChapter = function setHuntChapter(rawId) {
  if (!state.surveyPass || state.ended || state.revealed) return;
  const id = rawId || null;
  if (id && !ns.huntChapterMeta(id)) return;
  state.huntChapter = id;
  ns.updateFogPaintForSurvey();
  if (id) {
    const meta = ns.huntChapterMeta(id);
    const zones = ns.buildHuntZones(meta);
    ns.restoreHuntZone();
    if (ns.map && zones.length) {
      const best = zones.reduce((a, b) => (b.weight > a.weight ? b : a), zones[0]);
      ns.map.easeTo({
        center: [best.lng, best.lat],
        zoom: Math.max(12.8, Math.min(14.2, 14.5 - best.radiusKm)),
        duration: 900,
      });
    }
    const n = zones.length;
    ns.toast(
      `Chase is on · ${meta.label} — ${n} rough circle${n === 1 ? "" : "s"} inked`,
      "hit"
    );
    ns.logLine(
      `<span class="hit">Chase</span> · ${meta.label} · ${n} circle${n === 1 ? "" : "s"} on the chart`,
      "hit"
    );
  } else {
    ns.clearPeriodHint();
    ns.hideHuntZoneHover?.();
    ns.toast("Chase called off — chart wiped clean");
  }
  ns.renderHud();
  ns.saveGame();
};

ns.buySurveyPass = function buySurveyPass() {
  if (!state.started || state.ended || state.paused || state.revealed) return;
  if (state.surveyPass) {
    if (state.huntChapter) {
      ns.setHuntChapter(null);
    } else {
      ns.toast("Name what you’re after — pick a chapter below");
      const shell = document.getElementById("fieldBriefHint");
      if (shell) shell.open = true;
      document.getElementById("huntPicker")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    return;
  }
  const cost = state.hardMode ? Math.round(SURVEY_PASS_COST * 1.25) : SURVEY_PASS_COST;
  const days = state.hardMode ? SURVEY_PASS_DAYS + 1 : SURVEY_PASS_DAYS;
  if (state.money < cost || state.days < days) {
    ns.toast(`Need €${cost} and ${days} day${days === 1 ? "" : "s"} for a hint.`);
    return;
  }
  const btnPass = document.getElementById("btnSurveyPass");
  // Two-click confirm so the purse hit is deliberate and obvious.
  if (btnPass && btnPass.dataset.confirmSpend !== "1") {
    btnPass.dataset.confirmSpend = "1";
    btnPass.textContent = `Confirm: pay €${cost}?`;
    btnPass.title = `Click again to spend €${cost} and ${days} day${days === 1 ? "" : "s"}.`;
    ns.toast(`Hint costs €${cost} + ${days} day${days === 1 ? "" : "s"} — click again to pay`, "warn");
    if (ns._briefConfirmTimer) clearTimeout(ns._briefConfirmTimer);
    ns._briefConfirmTimer = setTimeout(() => {
      if (btnPass.dataset.confirmSpend === "1" && !state.surveyPass) {
        delete btnPass.dataset.confirmSpend;
        ns.renderHud();
      }
    }, 5000);
    return;
  }
  if (btnPass) delete btnPass.dataset.confirmSpend;
  if (ns._briefConfirmTimer) {
    clearTimeout(ns._briefConfirmTimer);
    ns._briefConfirmTimer = null;
  }
  state.money -= cost;
  state.days -= days;
  state.surveyPass = true;
  state.huntChapter = null;
  ns.updateFogPaintForSurvey();
  ns.logLine(
    `<span class="hit">Hint paid</span> · −${money(cost)} · −${days} day${days === 1 ? "" : "s"} · the chase awaits`,
    "hit"
  );
  ns.toast(`Paid €${cost} — name the lost chapter you’re hunting`, "hit");
  const shell = document.getElementById("fieldBriefHint");
  if (shell) shell.open = true;
  ns.renderHud();
  ns.saveGame();
};

ns.markLandscapeStudied = function markLandscapeStudied() {
  if (state.landscapeStudied) return;
  state.landscapeStudied = true;
  ns.saveGame();
};


ns.setSurveyMode = function setSurveyMode(on) {
  if (!ns.map || !state.started || state.ended) return;
  state.paused = !!on;

  if (state.paused) {
    for (const id of state.selected) {
      ns.setTractState(id, {
        selected: false,
        dug: state.dug.has(id),
        hit: !!(state.reports[id] && state.reports[id].hit),
      });
    }
    state.selected.clear();
    ns.hideEraTip();
    ns.hideDigEvent();
    ns.hideFindHover();
    ns.hideHuntZoneHover?.();
    ns.hideFieldEvent();
    ns.hideChapterBrief();
    ns.closeLandscapePopup();
  } else {
    ns.closeLandscapePopup();
    ns.hideHuntZoneHover?.();
  }

  // Dig board off while scouting
  ns.setLayerVis("tracts-fog", !state.paused);
  ns.setLayerVis("tracts-outline", !state.paused);
  ns.setLayerVis("tracts-pick", !state.paused);
  ns.setLayerVis("pottery-dots", !state.paused);
  ns.setLayerVis("lithics-dots", !state.paused);
  ns.setLayerVis("grids-line", !state.paused);
  ns.setLayerVis("dig-flash-fill", !state.paused);
  ns.setLayerVis("dig-flash-line", !state.paused);

  // Landscape layers on
  ns.setLayerVis("terraces-line", state.paused);
  ns.setLayerVis("geology-outline", state.paused);
  ns.setLayerVis("structures-dots", true);
  ns.setLayerVis("geology-fill", true);
  ns.setLayerVis("find-heat", true);

  if (ns.map.getLayer("geology-fill")) {
    ns.map.setPaintProperty("geology-fill", "fill-opacity", state.paused ? 0.72 : 0.18);
  }
  if (ns.map.getLayer("geology-outline")) {
    ns.map.setPaintProperty("geology-outline", "line-opacity", state.paused ? 0.9 : 0);
  }

  document.querySelector(".hud").classList.toggle("paused", state.paused);
  const btn = document.getElementById("btnSurvey");
  btn.classList.toggle("on", state.paused);
  btn.textContent = state.paused ? "Resume digging" : "Study landscape";

  if (ns.isMobileHud()) {
    if (state.paused) {
      ns.setHudExpanded(true);
      const legend = document.getElementById("scoutLegend");
      if (legend) legend.open = true;
    } else {
      ns.setHudExpanded(false);
    }
  }

  ns.toast(state.paused
    ? "Shovels down — read the rock, the terraces, the ruins"
    : "Fog restored — shovels ready");
  if (!state.paused) {
    ns.advanceTutorial("survey");
    ns.updateFogPaintForSurvey();
  }
  ns.renderHud();
  ns.saveGame();
}


ns.circlePolygon = function circlePolygon(lng, lat, radiusKm, steps) {
  const n = steps || 48;
  const ring = [];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dLng = (radiusKm / (111.32 * cosLat)) * Math.cos(a);
    const dLat = (radiusKm / 110.57) * Math.sin(a);
    ring.push([lng + dLng, lat + dLat]);
  }
  return { type: "Polygon", coordinates: [ring] };
}


ns.placeGloryTip = function placeGloryTip(anchorEl) {
  const tip = document.getElementById("gloryTip");
  tip.hidden = false;
  tip.classList.add("on");
  if (ns.isMobileHud()) {
    tip.style.left = "";
    tip.style.width = "";
    tip.style.top = "";
    return;
  }
  const r = anchorEl.getBoundingClientRect();
  const tipW = Math.min(320, window.innerWidth - 24);
  let left = r.right + 12;
  if (left + tipW > window.innerWidth - 12) left = Math.max(12, r.left - tipW - 12);
  tip.style.left = left + "px";
  tip.style.width = tipW + "px";
  requestAnimationFrame(() => {
    const h = tip.offsetHeight || 200;
    let top = r.top;
    if (top + h > window.innerHeight - 12) top = Math.max(12, window.innerHeight - h - 12);
    tip.style.top = top + "px";
  });
}


ns.showGloryTip = function showGloryTip(anchorEl) {
  const rank = gloryRank(state.score);
  const nxt = nextGloryRank(state.score);
  const tip = document.getElementById("gloryTip");
  const nextLine = nxt
    ? `Next: ${nxt.title} at ${nxt.min} glory (${Math.max(0, nxt.min - state.score)} to go).`
    : "You sit at the top of the ladder.";
  tip.innerHTML =
    `<img class="rank-art" src="${ns.rankArtUrl(rank.id)}" alt="${rank.title}" />` +
    `<p class="eyebrow">Academic rank · ${state.score} glory</p>` +
    `<h3>${rank.title}</h3>` +
    `<p>${rank.blurb}</p>` +
    `<p style="margin-top:8px;color:var(--muted)">${nextLine}</p>`;
  const tipImg = tip.querySelector(".rank-art");
  if (tipImg) tipImg.onerror = () => tipImg.remove();
  ns.placeGloryTip(anchorEl);
}


ns.hideGloryTip = function hideGloryTip() {
  const tip = document.getElementById("gloryTip");
  tip.classList.remove("on");
  tip.hidden = true;
}

