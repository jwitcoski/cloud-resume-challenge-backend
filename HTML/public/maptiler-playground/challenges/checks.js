/**
 * MapTiler Agent Skill — strict static graders (v3)
 * Presence-only checks are low weight; substance checks dominate Extreme/Insane.
 *
 * Modes:
 *   normal — v2 thresholds / letter bands (demo-friendly)
 *   harsh  — training mode: higher substance bars, stricter letters, auto-extra rigor
 */
(function (global) {
  const PINNED_SDK = "v4.0.2";
  const PINNED_WEATHER = "v3.1.1";
  const PINNED_CESIUM = "1.141.0";
  const PINNED_GEOSPLATS = "v1.0.4";

  /** @type {"normal"|"harsh"} */
  let MODE = "harsh";

  const THRESHOLDS = {
    normal: { web: 700, extreme: 1600, insane: 1100 },
    harsh: { web: 1100, extreme: 2400, insane: 1700 },
  };

  const LEGACY_STYLE_RE = /streets-v2|basic-v2|outdoor-v2|hybrid-v2|topo-v2|satellite-v2|streets-v2-dark|streets-v2-light/i;

  const OUTDOOR_LAYERS = new Set([
    "contour", "contours", "path", "mountain_peak", "landcover", "landuse",
    "park", "transportation", "water", "waterway", "boundary", "building",
    "place", "poi", "aeroway", "housenumber",
  ]);

  const FAKE_LAYER_RE =
    /source-layer['"`]?\s*:\s*['"`](hiking_trails_v9|fake_trails|my_trails|trail_network_v2|custom_contours_x)['"`]/i;

  const STUB_RE =
    /YOUR_MAPTILER_SPLAT_MODEL|YOUR_MAPTILER_SPLAT_ID|MODEL_ID_HERE|TODO:|FIXME|not implemented|placeholder model|replace with a real|coming soon|implement me|lorem ipsum/i;

  const UUID_RE =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

  const PRAGUE_SWAPPED_RE = /\[\s*50\.11\d*\s*,\s*14\.4/i;
  const PRAGUE_OK_RE = /\[\s*14\.4178\s*,\s*50\.1167\s*\]/;
  const NYC_SWAPPED_RE = /\[\s*40\.7\d*\s*,\s*-74\.0/i;

  function isHarsh() {
    return MODE === "harsh";
  }

  /** Amplify hard-check weight in harsh mode so soft keyword hits can't carry the grade. */
  function w(base, kind) {
    if (!isHarsh()) return base;
    if (kind === "soft") return Math.max(4, Math.round(base * 0.7));
    if (kind === "hard") return Math.round(base * 1.5);
    return Math.round(base * 1.2);
  }

  function pts(pass, weight, id, detail) {
    return { id, pass: !!pass, weight, points: pass ? weight : 0, detail: detail || "" };
  }

  function countMatches(src, re) {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const r = new RegExp(re.source, flags);
    return (src.match(r) || []).length;
  }

  /** Script/body weight — ignore huge shared CSS paste that inflated early 100% scores. */
  function substanceLen(src) {
    return String(src || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<link[^>]*>/gi, "")
      .replace(/\s+/g, " ")
      .trim().length;
  }

  function commentRatio(raw) {
    const full = String(raw || "");
    if (full.length < 80) return 0;
    let comments = 0;
    const blocks = full.match(/\/\*[\s\S]*?\*\//g) || [];
    const html = full.match(/<!--[\s\S]*?-->/g) || [];
    const lines = full.match(/(^|[^:])\/\/[^\n]*/g) || [];
    for (const b of blocks) comments += b.length;
    for (const b of html) comments += b.length;
    for (const b of lines) comments += b.length;
    return comments / full.length;
  }

  function setMode(next) {
    MODE = next === "normal" ? "normal" : "harsh";
    return MODE;
  }

  function getMode() {
    return MODE;
  }

  const CHECKS = {
    // ——— hygiene (moderate weight) ———
    sdk_not_maplibre(src) {
      const usesSdk = /@maptiler\/sdk|maptiler-sdk-js|maptilersdk/i.test(src);
      const dual = /maplibre-gl/i.test(src) && usesSdk;
      const maplibreOnly = /maplibre-gl/i.test(src) && !usesSdk;
      if (dual) return pts(false, 12, "sdk_not_maplibre", "Dual maplibre-gl + SDK import");
      if (maplibreOnly) return pts(false, 12, "sdk_not_maplibre", "maplibre-gl without @maptiler/sdk");
      const other =
        /Cesium|Leaflet|deck\.gl|geosplats|SwiftUI|LngLat|maptiler_flutter|@maptiler\/react-native|service\.maptiler/i.test(src);
      return pts(usesSdk || other, 12, "sdk_not_maplibre", usesSdk ? "SDK OK" : other ? "Non-web stack OK" : "Missing SDK");
    },

    pinned_sdk_version(src) {
      if (!/@maptiler\/sdk|maptiler-sdk-js/i.test(src)) {
        return pts(true, 4, "pinned_sdk_version", "N/A");
      }
      const ok = src.includes("maptiler-sdk-js/" + PINNED_SDK) || src.includes(PINNED_SDK);
      return pts(ok, 10, "pinned_sdk_version", ok ? PINNED_SDK : "Wrong/missing SDK pin");
    },

    pinned_weather_version(src) {
      const ok =
        src.includes("maptiler-weather/" + PINNED_WEATHER.replace(/^v/, "")) ||
        src.includes("maptiler-weather/" + PINNED_WEATHER) ||
        src.includes("@maptiler/weather@" + PINNED_WEATHER) ||
        (src.includes("maptiler-weather") && src.includes("3.1.1"));
      return pts(ok, 12, "pinned_weather_version", ok ? "weather 3.1.1 CDN" : "Need maptiler-weather/3.1.1 script or package");
    },

    pinned_cesium(src) {
      const ok = src.includes(PINNED_CESIUM);
      return pts(ok, 14, "pinned_cesium", ok ? PINNED_CESIUM : "Pin Cesium 1.141.0");
    },

    pinned_geosplats(src) {
      const ok = src.includes("maptiler-geosplats/" + PINNED_GEOSPLATS) || src.includes("geosplats@" + PINNED_GEOSPLATS) || (src.includes("geosplats") && src.includes("1.0.4"));
      return pts(ok, 14, "pinned_geosplats", ok ? PINNED_GEOSPLATS : "Pin geosplats v1.0.4");
    },

    no_template_leak(src) {
      const bad = /\{\{[^}]+\}\}/.test(src);
      return pts(!bad, 10, "no_template_leak", bad ? "{{ }} leak" : "OK");
    },

    no_legacy_style(src) {
      // Avoid lookbehind issues in older engines — manual check
      const bad =
        /streets-v2|basic-v2|outdoor-v2|hybrid-v2|topo-v2|satellite-v2|streets-v2-dark|streets-v2-light/i.test(src) ||
        (/dataviz-dark/i.test(src) && !/dataviz-v4-dark|DATAVIZ\.DARK/i.test(src));
      return pts(!bad, 14, "no_legacy_style", bad ? "Legacy style id" : "OK");
    },

    mapstyle_constant(src) {
      if (!/maptilersdk|@maptiler\/sdk/i.test(src)) return pts(true, 4, "mapstyle_constant", "N/A");
      const hasConst = /MapStyle\.[A-Z]/.test(src);
      const hardOnly = /api\.maptiler\.com\/maps\/[a-z0-9-]+\/style\.json/i.test(src) && !hasConst;
      return pts(hasConst && !hardOnly, 10, "mapstyle_constant", hasConst ? "MapStyle.*" : "Use MapStyle constants");
    },

    lng_lat_order(src) {
      if (PRAGUE_SWAPPED_RE.test(src) || NYC_SWAPPED_RE.test(src)) {
        return pts(false, 16, "lng_lat_order", "Swapped [lat,lng] fixture");
      }
      return pts(true, 10, "lng_lat_order", "No classic swap");
    },

    api_key_hygiene(src) {
      const assignsKey =
        /(?:MAPTILER_API_KEY|apiKey)\s*=\s*["'][0-9a-f]{8}-[0-9a-f-]{20,}["']/i.test(src);
      if (assignsKey) return pts(false, 16, "api_key_hygiene", "Hardcoded key literal");
      return pts(true, 10, "api_key_hygiene", "OK");
    },

    controls_as_flags(src) {
      const invented = /new\s+(MinimapControl|GeocodingBar|TerrainControl|ProjectionControl)\s*\(/i.test(src);
      return pts(!invented, 10, "controls_as_flags", invented ? "Hallucinated control class" : "OK");
    },

    no_stub_placeholder(src) {
      const bad = STUB_RE.test(src);
      return pts(!bad, w(18, "hard"), "no_stub_placeholder", bad ? "Stub/placeholder left in solution" : "No stubs");
    },

    min_substance_web(src) {
      const need = THRESHOLDS[MODE].web;
      const n = substanceLen(src);
      return pts(
        n >= need,
        w(12, "hard"),
        "min_substance_web",
        n >= need ? `${n} substance chars` : `Too thin (${n} chars, need ≥${need} script/body)`
      );
    },

    min_substance_extreme(src) {
      const need = THRESHOLDS[MODE].extreme;
      const n = substanceLen(src);
      return pts(
        n >= need,
        w(18, "hard"),
        "min_substance_extreme",
        n >= need ? `${n} substance chars` : `Too thin (${n} chars, need ≥${need} after stripping CSS boilerplate)`
      );
    },

    min_substance_insane(src) {
      const need = THRESHOLDS[MODE].insane;
      const n = substanceLen(src);
      return pts(
        n >= need,
        w(16, "hard"),
        "min_substance_insane",
        n >= need ? `${n} substance chars` : `Too thin (${n} chars, need ≥${need})`
      );
    },

    needs_validate_key(src) {
      const ok =
        /MAPTILER_API_KEY|apiKey/.test(src) &&
        /(missing|YOUR_MAPTILER|!key|throw new Error|if\s*\(\s*!)/i.test(src);
      return pts(ok, w(14, "hard"), "needs_validate_key", ok ? "Key guard" : "Add missing-key guard");
    },

    needs_full_viewport(src) {
      const ok = /#map/.test(src) && /height:\s*100%|inset:\s*0|100vh/.test(src);
      return pts(ok, w(10, "hard"), "needs_full_viewport", ok ? "Full viewport" : "Need full-viewport #map CSS");
    },

    loads_config_js(src) {
      if (!/maptilersdk|maptiler-sdk-js|geosplats|cesium/i.test(src)) {
        return pts(true, 4, "loads_config_js", "N/A");
      }
      if (!/<html|<!DOCTYPE|<script/i.test(src)) {
        return pts(true, 4, "loads_config_js", "N/A");
      }
      const ok = /admin-boundaries\/js\/config\.js/i.test(src);
      return pts(ok, w(12, "hard"), "loads_config_js", ok ? "config.js loaded" : "Load ../admin-boundaries/js/config.js");
    },

    assigns_sdk_apikey(src) {
      if (!/maptilersdk|@maptiler\/sdk/i.test(src)) return pts(true, 4, "assigns_sdk_apikey", "N/A");
      const ok = /config\.apiKey\s*=/i.test(src);
      return pts(ok, w(12, "hard"), "assigns_sdk_apikey", ok ? "config.apiKey set" : "Set maptilersdk.config.apiKey");
    },

    no_comment_bloat(src) {
      // Placeholder — real ratio computed in grade() with raw source
      return pts(true, w(10, "hard"), "no_comment_bloat", "OK");
    },

    // ——— core feature substance ———
    needs_mapstyle_streets(src) {
      return pts(/MapStyle\.STREETS/.test(src), 10, "needs_mapstyle_streets", "MapStyle.STREETS");
    },
    needs_prague_center(src) {
      return pts(PRAGUE_OK_RE.test(src) || /14\.4178[\s\S]{0,40}50\.1167/.test(src), 10, "needs_prague_center", "Prague [lng,lat]");
    },
    needs_globe(src) {
      return pts(/projection\s*:\s*['"]globe['"]|setProjection\(\s*['"]globe['"]\s*\)/i.test(src), 12, "needs_globe", "globe projection");
    },
    needs_halo_and_space(src) {
      const halo = /\bhalo\s*:\s*true\b|\bhalo\b\s*=\s*true/i.test(src);
      const space = /\bspace\s*:\s*true\b|\bspace\b\s*=\s*true/i.test(src);
      return pts(halo && space, 14, "needs_halo_and_space", halo && space ? "halo+space" : "Need both halo:true and space:true");
    },
    needs_halo_or_space(src) {
      return pts(/\bhalo\b|\bspace\b/i.test(src), 6, "needs_halo_or_space", "halo/space mention");
    },
    needs_terrain(src) {
      return pts(/terrain\s*:\s*true|enableTerrain|setTerrain/i.test(src), 10, "needs_terrain", "terrain");
    },
    needs_terrain_exaggeration(src) {
      return pts(/terrainExaggeration\s*:\s*[1-9]|exaggeration\s*:\s*[1-9]/i.test(src), 12, "needs_terrain_exaggeration", "exaggeration > 0");
    },
    needs_flyto(src) {
      return pts(/\.flyTo\s*\(/.test(src), 8, "needs_flyto", "flyTo");
    },
    flyto_alps(src) {
      // Alps-ish lng 6–14, lat 45–48
      const ok = /flyTo\s*\(\s*\{[^}]*center\s*:\s*\[\s*[6-9]|1[0-4]\.\d+\s*,\s*4[5-8]\./i.test(src)
        || /flyTo\s*\(\s*\{[\s\S]{0,120}center\s*:\s*\[\s*8\.\d+\s*,\s*46\.\d+/i.test(src);
      return pts(ok, 16, "flyto_alps", ok ? "Alps flyTo" : "flyTo should target Alps (~[8.6, 46.5])");
    },
    needs_setstyle(src) {
      return pts(/\.setStyle\s*\(/.test(src), 8, "needs_setstyle", "setStyle");
    },
    needs_style_reload_hook(src) {
      return pts(/style\.load|styledata|once\(\s*['"]style/i.test(src), 14, "needs_style_reload_hook", "style reload hook");
    },
    style_switcher_at_least_3(src) {
      const n = countMatches(src, /MapStyle\.[A-Z][A-Z_.]*/g);
      return pts(n >= 3, 14, "style_switcher_at_least_3", n >= 3 ? `${n} MapStyle refs` : `Need ≥3 MapStyle variants (found ${n})`);
    },
    needs_geocode_forward(src) {
      return pts(/geocoding\.forward\s*\(/i.test(src), 12, "needs_geocode_forward", "geocoding.forward(");
    },
    needs_geocode_reverse(src) {
      return pts(/geocoding\.reverse\s*\(/i.test(src), 12, "needs_geocode_reverse", "geocoding.reverse(");
    },
    geocode_ui_input(src) {
      return pts(/<input|getElementById\s*\(\s*['"]q['"]/i.test(src), 10, "geocode_ui_input", "Search input UI");
    },
    needs_elevation_at(src) {
      return pts(/elevation\.(at|batch|fromLineString)\s*\(/i.test(src), 12, "needs_elevation_at", "elevation API call");
    },
    elevation_stats_ui(src) {
      const ok = /min|max|gain/i.test(src) && /(textContent|innerHTML|innerText)/i.test(src);
      return pts(ok, 16, "elevation_stats_ui", ok ? "min/max/gain UI" : "Show min/max/gain in the UI");
    },
    elevation_multi_sample(src) {
      const ok = /fromLineString|elevation\.batch|for\s*\([^)]+\)[\s\S]{0,200}elevation\.at/i.test(src);
      return pts(ok, 16, "elevation_multi_sample", ok ? "Multi-sample" : "Sample along line (batch/fromLineString/loop)");
    },
    needs_fill_extrusion(src) {
      return pts(/fill-extrusion|'fill-extrusion'/i.test(src), 10, "needs_fill_extrusion", "fill-extrusion");
    },
    extrusion_height_expr(src) {
      const ok = /fill-extrusion-height['"`]?\s*:\s*\[[\s\S]*?get['"`]?\s*,\s*['"`](height|render_height)/i.test(src)
        || /'fill-extrusion-height'\s*:\s*\[[\s\S]*?\['get'/.test(src);
      return pts(ok, 16, "extrusion_height_expr", ok ? "height expression" : "Use data-driven fill-extrusion-height");
    },
    buildings_under_labels(src) {
      const ok = /labelLayerId|beforeId|waterway-label|text-field/i.test(src);
      return pts(ok, 12, "buildings_under_labels", ok ? "Inserted under labels" : "Insert extrusion before label layers");
    },
    needs_weather(src) {
      return pts(/WindLayer|TemperatureLayer|PrecipitationLayer|RadarLayer|maptilerweather/i.test(src), 12, "needs_weather", "Weather layer class");
    },
    weather_cdn_script(src) {
      return pts(/maptiler-weather\/3\.1\.1|@maptiler\/weather@3\.1\.1/i.test(src), 12, "weather_cdn_script", "Weather 3.1.1 script tag");
    },
    needs_heatmap_or_cluster(src) {
      return pts(/addHeatmap|type:\s*['"]heatmap['"]|cluster\s*:\s*true/i.test(src), 8, "needs_heatmap_or_cluster", "heatmap/cluster");
    },
    five_thousand_points(src) {
      const ok = /i\s*<\s*5000|5000\s*;|length\s*=\s*5000|new Array\(\s*5000/i.test(src);
      return pts(ok, 16, "five_thousand_points", ok ? "5000 loop" : "Generate ~5000 features in a loop");
    },
    cluster_and_unclustered_layers(src) {
      const clustered = /\[\s*['"]has['"]\s*,\s*['"]point_count['"]\s*\]/i.test(src);
      const unclustered =
        /unclustered/i.test(src) ||
        /\[\s*['"]!['"]\s*,\s*\[\s*['"]has['"]\s*,\s*['"]point_count['"]/i.test(src);
      const ok = clustered && unclustered && /addLayer/.test(src);
      return pts(ok, 16, "cluster_and_unclustered_layers", ok ? "Cluster + unclustered layers" : "Need both has point_count and !has/unclustered layers");
    },
    heatmap_toggle(src) {
      return pts(/heatmap/i.test(src) && /toggle|togHeat|removeLayer|setLayoutProperty/i.test(src), 14, "heatmap_toggle", "Heatmap toggle control");
    },
    needs_static_maps(src) {
      return pts(/staticMaps\.|\/static\/|staticMaps/i.test(src), 10, "needs_static_maps", "static maps");
    },
    static_img_element(src) {
      return pts(/<img|Image\(|createElement\(\s*['"]img['"]/i.test(src), 12, "static_img_element", "Display <img>");
    },
    needs_popup_or_click(src) {
      return pts(/new\s+maptilersdk\.Popup|\.on\(\s*['"]click['"]/i.test(src), 8, "needs_popup_or_click", "click/popup");
    },
    needs_linestring(src) {
      return pts(/LineString|lineString/i.test(src), 8, "needs_linestring", "LineString");
    },
    needs_debounce(src) {
      return pts(/debounc|throttle/i.test(src), 6, "needs_debounce", "debounce word");
    },
    debounce_cleartimeout(src) {
      const ok = /clearTimeout/i.test(src) && /setTimeout/i.test(src);
      return pts(ok, 16, "debounce_cleartimeout", ok ? "clearTimeout debounce" : "Implement debounce with clearTimeout+setTimeout");
    },
    mapstyle_outdoor(src) {
      return pts(/MapStyle\.OUTDOOR/.test(src), 8, "mapstyle_outdoor", "OUTDOOR");
    },
    schema_outdoor_ok(src) {
      const layers = [...src.matchAll(/source-layer['"`]?\s*:\s*['"`]([a-z0-9_-]+)['"`]/gi)].map((m) => m[1]);
      if (!layers.length) return pts(false, 12, "schema_outdoor_ok", "No source-layer");
      const good = layers.filter((l) => OUTDOOR_LAYERS.has(l));
      return pts(good.length > 0, 12, "schema_outdoor_ok", good.length ? good.join(",") : "Unknown layers");
    },
    outdoor_multi_overlay(src) {
      const layers = [...src.matchAll(/source-layer['"`]?\s*:\s*['"`]([a-z0-9_-]+)['"`]/gi)].map((m) => m[1]);
      const uniq = new Set(layers.filter((l) => OUTDOOR_LAYERS.has(l)));
      return pts(uniq.size >= 2, 16, "outdoor_multi_overlay", uniq.size >= 2 ? `${uniq.size} overlays` : "Need ≥2 real source-layers (contour, path, …)");
    },
    no_fake_source_layer(src) {
      return pts(!FAKE_LAYER_RE.test(src), 12, "no_fake_source_layer", "No fake layers");
    },
    needs_coordinates_api(src) {
      return pts(/coordinates\.(transform|search)|api\.maptiler\.com\/coordinates/i.test(src), 12, "needs_coordinates_api", "coordinates API");
    },
    coordinates_shows_both(src) {
      const ok = /EPSG|WGS84|4326|transform/i.test(src) && /(textContent|innerHTML|label)/i.test(src);
      return pts(ok, 14, "coordinates_shows_both", ok ? "Shows CRS labels" : "Label both CRS results in UI");
    },
    needs_leaflet(src) {
      return pts(/L\.map\s*\(|leaflet/i.test(src), 8, "needs_leaflet", "Leaflet");
    },
    needs_leaflet_latlng(src) {
      return pts(/setView\s*\(\s*\[\s*(50\.|40\.|48\.)|L\.latLng\s*\(/i.test(src), 12, "needs_leaflet_latlng", "Leaflet lat-first");
    },
    needs_streets_v4_tiles_or_sdk(src) {
      return pts(/streets-v4|leaflet-maptilersdk|MapStyle\.STREETS/i.test(src), 10, "needs_streets_v4_tiles_or_sdk", "v4 tiles/style");
    },
    dual_map_containers(src) {
      const ok = (/maptilersdk\.Map/.test(src) || /new maptilersdk\.Map/.test(src)) && /L\.map\s*\(/.test(src);
      return pts(ok, 16, "dual_map_containers", ok ? "SDK + Leaflet" : "Need both maptilersdk.Map and L.map");
    },
    nyc_pitch_hybrid(src) {
      const nyc = /-74\.0|40\.71|40\.7128/.test(src);
      const pitch = /pitch\s*:\s*6[0-9]|pitch:\s*60/.test(src);
      const hybrid = /MapStyle\.HYBRID|HYBRID/.test(src);
      return pts(nyc && pitch && hybrid, 14, "nyc_pitch_hybrid", nyc && pitch && hybrid ? "NYC+pitch+HYBRID" : "Need NYC center, pitch~60, HYBRID");
    },

    // ——— insane ———
    needs_cesium(src) {
      return pts(/Cesium\.(Viewer|Ion)|new Cesium/i.test(src), 12, "needs_cesium", "Cesium Viewer");
    },
    cesium_widgets_css(src) {
      return pts(/Widgets\/widgets\.css|cesium.*widgets\.css/i.test(src), 12, "cesium_widgets_css", "Widgets CSS");
    },
    cesium_maptiler_imagery(src) {
      return pts(/api\.maptiler\.com|MapTiler|UrlTemplateImageryProvider|ImageryProvider/i.test(src), 14, "cesium_maptiler_imagery", "MapTiler imagery in Cesium");
    },
    no_maplibre_in_cesium(src) {
      if (!/cesium/i.test(src)) return pts(false, 10, "no_maplibre_in_cesium", "Not Cesium");
      return pts(!/maplibre-gl|maptilersdk\.Map/i.test(src), 12, "no_maplibre_in_cesium", "No MapLibre in Cesium file");
    },
    /**
     * cesium.com/downloads/.../1.141.0 currently 404s — a blank page that still
     * mentions 1.141.0 must not pass. Prefer jsDelivr/unpkg + CESIUM_BASE_URL.
     */
    cesium_cdn_loads(src) {
      const deadOfficial141 =
        /cesium\.com\/downloads\/cesiumjs\/releases\/1\.141\.0/i.test(src);
      const workingNpmCdn =
        /(?:cdn\.jsdelivr\.net\/npm\/cesium@1\.141\.0|unpkg\.com\/cesium@1\.141\.0)/i.test(src);
      if (deadOfficial141 && !workingNpmCdn) {
        return pts(
          false,
          20,
          "cesium_cdn_loads",
          "cesium.com/downloads/.../1.141.0 404s (blank page) — use jsDelivr/unpkg cesium@1.141.0"
        );
      }
      return pts(
        workingNpmCdn,
        20,
        "cesium_cdn_loads",
        workingNpmCdn ? "Working npm CDN for 1.141.0" : "Need jsDelivr or unpkg cesium@1.141.0 script"
      );
    },
    cesium_base_url(src) {
      const ok = /CESIUM_BASE_URL/i.test(src);
      return pts(
        ok,
        16,
        "cesium_base_url",
        ok ? "CESIUM_BASE_URL set" : "Set window.CESIUM_BASE_URL before Cesium.js (Workers/Assets)"
      );
    },
    cesium_guards_load(src) {
      const ok =
        /typeof\s+Cesium\s*===?\s*['"]undefined['"]|if\s*\(\s*!?\s*Cesium|CesiumJS failed|showErr|getElementById\s*\(\s*['"]err['"]/i.test(
          src
        );
      return pts(
        ok,
        12,
        "cesium_guards_load",
        ok ? "Guards missing Cesium / shows error UI" : "Guard Cesium load failure with visible error UI"
      );
    },
    needs_deckgl(src) {
      return pts(/new\s+(ScatterplotLayer|HexagonLayer|Deck)/i.test(src) || /ScatterplotLayer\s*\(/.test(src), 14, "needs_deckgl", "deck.gl layer instance");
    },
    sdk_or_maptiler_basemap(src) {
      return pts(/maptiler|MapStyle|api\.maptiler\.com/i.test(src), 8, "sdk_or_maptiler_basemap", "MapTiler basemap");
    },
    needs_geosplats(src) {
      return pts(/SplatModel|addSplatModel|geosplats/i.test(src), 12, "needs_geosplats", "GeoSplats API");
    },
    needs_webgpu_gate(src) {
      return pts(/navigator\.gpu/i.test(src), 12, "needs_webgpu_gate", "navigator.gpu");
    },
    needs_webgpu_fallback(src) {
      return pts(/display\s*=\s*['"]block['"]|fallback|not supported|WebGPU is not/i.test(src), 12, "needs_webgpu_fallback", "Visible fallback UI");
    },
    geosplats_real_asset(src) {
      const stub = /YOUR_MAPTILER_SPLAT|MODEL_ID_HERE|placeholder/i.test(src);
      return pts(!stub, 20, "geosplats_real_asset", stub ? "Replace placeholder splat model id" : "Real asset id");
    },
    needs_swift_maptiler(src) {
      return pts(/MTConfig|MTMapView|MapTilerSDK|import MapTiler/i.test(src), 12, "needs_swift_maptiler", "Swift MapTiler");
    },
    needs_streets_v4_url(src) {
      return pts(/streets-v4/i.test(src), 12, "needs_streets_v4_url", "streets-v4 URL");
    },
    needs_ios_await_key(src) {
      return pts(/await\s+MTConfig|await.*setAPIKey|\.task\s*\{/i.test(src), 14, "needs_ios_await_key", "await key");
    },
    ios_gate_map_until_key(src) {
      const ok = /apiKeyReady|keyReady|if\s+apiKeyReady|ProgressView/i.test(src);
      return pts(ok, 16, "ios_gate_map_until_key", ok ? "Map gated on key" : "Don't show map until await setAPIKey finishes");
    },
    ios_applies_style_to_map(src) {
      const hasUrl = /streets-v4\/style\.json/i.test(src);
      if (!hasUrl) return pts(false, 14, "ios_applies_style_to_map", "Missing streets-v4 style.json URL");
      // Must actually feed URL into map API — not only `_ = streetsV4StyleURL` or unused let
      const applied =
        /styleURL\s*[:=]|loadStyle\s*\(|\.style\s*=\s*streets|MTMap.*style|map\.style|setStyle\s*\(\s*streets/i.test(src);
      return pts(applied, 14, "ios_applies_style_to_map", applied ? "Style applied" : "streets-v4 URL is unused — apply it to the map");
    },

    map_on_error(src) {
      return pts(/\.on\(\s*['"]error['"]/i.test(src), w(12, "hard"), "map_on_error", "map.on('error') handler");
    },

    async_catch(src) {
      return pts(/\.catch\s*\(|try\s*\{[\s\S]*await/i.test(src), w(12, "hard"), "async_catch", "try/await or .catch on async");
    },

    ui_style_buttons(src) {
      const buttons = countMatches(src, /<button/gi);
      return pts(buttons >= 3, 12, "ui_style_buttons", buttons >= 3 ? `${buttons} buttons` : `Need ≥3 <button>s for style switcher (found ${buttons})`);
    },

    helpers_heatmap(src) {
      return pts(/helpers\.addHeatmap\s*\(/i.test(src), 14, "helpers_heatmap", "helpers.addHeatmap(");
    },

    helpers_point_cluster(src) {
      return pts(/helpers\.addPoint\s*\([\s\S]*?cluster\s*:\s*true/i.test(src), 14, "helpers_point_cluster", "helpers.addPoint({ cluster: true })");
    },

    readd_layers_in_style_load(src) {
      // Must re-add inside a style.load handler (function ref or inline body)
      const named =
        /style\.load['"]?\s*,\s*(addExtrusions|enableWeather|onStyleReady|readd|addBuildings|addLayers)\b/i.test(src);
      const inline =
        /style\.load[\s\S]{0,120}(?:=>|function)[\s\S]{0,500}(?:addLayer|enableWeather|addExtrusions|WindLayer|fill-extrusion|helpers\.add)/i.test(src);
      // If handler is onStyleReady, that function body must itself re-add
      const viaHelper =
        /function\s+onStyleReady|onStyleReady\s*=\s*(?:async\s*)?(?:\(|function)/i.test(src) &&
        /onStyleReady[\s\S]{0,400}(?:addLayer|enableWeather|WindLayer|setTerrain)/i.test(src) &&
        /style\.load['"]?\s*,\s*(?:\(?\s*)?(?:\(\)\s*=>\s*\{?\s*)?onStyleReady/i.test(src);
      const ok = named || inline || viaHelper;
      return pts(ok, 18, "readd_layers_in_style_load", ok ? "Re-adds in style.load" : "Re-add custom layers inside map.on('style.load', …)");
    },

    weather_time_or_animate(src) {
      const ok = /animateIn|setOpacity|pickAt|\.time\s*=|animation|playback|weather.*slider/i.test(src);
      return pts(ok, 14, "weather_time_or_animate", ok ? "Weather interactivity" : "Add weather opacity/time/animation control (not just addLayer)");
    },

    tiles_url_with_key(src) {
      const urls = [...src.matchAll(/api\.maptiler\.com\/tiles\/[^'"`\s]+/gi)].map((m) => m[0]);
      if (!urls.length) return pts(true, 4, "tiles_url_with_key", "N/A (no tiles URL)");
      let bad = 0;
      for (const u of urls) {
        const i = src.indexOf(u);
        const window = src.slice(Math.max(0, i - 20), i + u.length + 80);
        if (!/\?key=|&key=|key='\s*\+|key="\s*\+|key=\s*['"`]|key=\s*\+|\$\{[^}]*key/i.test(window)) bad++;
      }
      return pts(bad === 0, 16, "tiles_url_with_key", bad === 0 ? "Tiles URLs include key" : `${bad} tiles URL(s) missing ?key=`);
    },

    route_dense_samples(src) {
      const coordsBlocks = [...src.matchAll(/coordinates\s*:\s*\[([\s\S]*?)\]\s*[,}]/g)];
      let maxPts = 0;
      for (const m of coordsBlocks) {
        const n = countMatches(m[1], /\[\s*-?\d/g);
        if (n > maxPts) maxPts = n;
      }
      const densify = /densify|interpolate|for\s*\([^)]*i\s*<\s*(1[5-9]|[2-9]\d|[1-9]\d{2,})/i.test(src);
      const fromLine = /fromLineString\s*\(/i.test(src) && (maxPts >= 10 || densify || /precision|samples|step/i.test(src));
      const ok = maxPts >= 15 || densify || fromLine;
      return pts(ok, 16, "route_dense_samples", ok ? `Route density OK (${maxPts} verts)` : `Need denser LineString (≥15 verts or densify); found ${maxPts}`);
    },

    geocode_places_marker(src) {
      const ok = /geocoding\.forward/i.test(src) && /Marker|setLngLat/i.test(src);
      return pts(ok, 14, "geocode_places_marker", ok ? "Marker after geocode" : "Drop a Marker (or setLngLat) on the forward-geocode hit");
    },

    crs_epsg_both_labeled(src) {
      const a = /4326|WGS84/i.test(src);
      const b = /3857|Mercator|EPSG:\s*3/i.test(src);
      return pts(a && b, 14, "crs_epsg_both_labeled", a && b ? "Both CRS labeled" : "Label EPSG:4326/WGS84 and target CRS (e.g. 3857)");
    },

    needs_marker(src) {
      return pts(/new\s+maptilersdk\.Marker|Marker\s*\(/.test(src), 10, "needs_marker", "Marker");
    },

    leaflet_attribution_maptiler(src) {
      const ok = /attribution/i.test(src) && /MapTiler/i.test(src);
      return pts(ok, 12, "leaflet_attribution_maptiler", ok ? "MapTiler attribution" : "Leaflet tiles need MapTiler attribution");
    },

    deck_overlay_wired(src) {
      const overlay = /MapboxOverlay|MaplibreOverlay|GoogleMapsOverlay/i.test(src);
      const add = /addControl\s*\(|setMap\s*\(|setProps\s*\(/i.test(src);
      return pts(overlay && add, 16, "deck_overlay_wired", overlay && add ? "Overlay wired" : "Wire deck overlay via addControl/setMap");
    },

    no_cookiecutter_split_css(src) {
      // Penalize unused split-pane CSS pasted into every challenge
      const hasSplitCss = /\.split\s*\{[^}]*grid-template-columns/i.test(src);
      const usesSplit = /class\s*=\s*['"][^'"]*\bsplit\b/i.test(src);
      if (!hasSplitCss) return pts(true, w(8, "hard"), "no_cookiecutter_split_css", "OK");
      return pts(
        usesSplit,
        w(8, "hard"),
        "no_cookiecutter_split_css",
        usesSplit ? "Split layout used" : "Unused .split CSS boilerplate — remove cookie-cutter paste"
      );
    },

    admin_live_fetch_process(src) {
      // Must have fetch(...process) not only in a comment (comments stripped)
      const ok = /fetch\s*\(\s*[`'"][^`'"]*\/process/i.test(src) || /fetch\s*\(\s*`\$\{[^}]+\}[^`]*process/i.test(src);
      return pts(ok, 18, "admin_live_fetch_process", ok ? "Live process fetch" : "Uncommented fetch to .../process required");
    },

    cesium_terrain_and_imagery(src) {
      const terr = /Terrain|CesiumTerrainProvider|terrain-quantized/i.test(src);
      const img = /UrlTemplateImageryProvider|ImageryLayer|maps\/satellite/i.test(src);
      return pts(terr && img, 16, "cesium_terrain_and_imagery", terr && img ? "terrain+imagery" : "Need MapTiler terrain AND imagery");
    },
    needs_android_lnglat(src) {
      return pts(/LngLat\s*\(\s*[a-zA-Z0-9_.]+\s*,/i.test(src), 12, "needs_android_lnglat", "LngLat(...)");
    },
    needs_android_internet(src) {
      return pts(/android\.permission\.INTERNET/i.test(src), 10, "needs_android_internet", "INTERNET permission");
    },
    android_compose_map(src) {
      return pts(/@Composable|MapTilerMap|MapView|setContent/i.test(src), 14, "android_compose_map", "Compose map UI");
    },
    needs_flutter_maptiler(src) {
      return pts(/maptiler|MapLibreMap|MapTilerMap/i.test(src), 10, "needs_flutter_maptiler", "Flutter map");
    },
    flutter_v4_style(src) {
      return pts(/streets-v4|Style\.streets|mapStyle/i.test(src), 12, "flutter_v4_style", "v4 style wiring");
    },
    needs_rn_maptiler(src) {
      return pts(/@maptiler\/react-native|from ['"]@maptiler/i.test(src), 14, "needs_rn_maptiler", "Real @maptiler RN import");
    },
    no_fake_rn_module(src) {
      const fake = /NativeMapTilerTurbo|FakeMapTilerView|react-native-maptiler-magic/i.test(src);
      return pts(!fake, 10, "no_fake_rn_module", fake ? "Invented module" : "OK");
    },
    needs_admin_or_service_host(src) {
      return pts(/service\.maptiler\.com/i.test(src), 12, "needs_admin_or_service_host", "service.maptiler.com");
    },
    admin_token_from_env(src) {
      return pts(/process\.env\.(MAPTILER_SERVICE|SERVICE_TOKEN)|MAPTILER_SERVICE_TOKEN/i.test(src), 12, "admin_token_from_env", "env service token");
    },
    no_hardcoded_uuid_token(src) {
      let bad = false;
      for (const line of src.split(/\n/)) {
        if (/service|token|SECRET|Bearer/i.test(line) && /=\s*['"][0-9a-f-]{36}['"]/i.test(line) && !/example|placeholder|xxxx/i.test(line)) {
          bad = true;
        }
      }
      return pts(!bad, 16, "no_hardcoded_uuid_token", bad ? "Hardcoded UUID" : "OK");
    },
    admin_upload_and_process(src) {
      const up = /upload_url|datasets\/ingest/i.test(src);
      const proc = /\/process|process\s*\(/i.test(src);
      return pts(up && proc, 12, "admin_upload_and_process", up && proc ? "ingest+process" : "Need ingest upload_url AND /process step");
    },
    admin_forbids_browser_key(src) {
      const ok = /browser map key|do not use the browser/i.test(src);
      return pts(ok, 12, "admin_forbids_browser_key", ok ? "Warns against browser key" : "Document that browser MAPTILER_API_KEY ≠ service token");
    },
  };

  function stripNoise(src) {
    return String(src || "")
      .replace(/<!--[\s\S]*?-->/g, "\n")
      .replace(/\/\*[\s\S]*?\*\//g, "\n")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
      .replace(/^\s*#(?!\!).*$/gm, ""); // python/shell comments, keep shebang
  }

  function letter(pct) {
    if (isHarsh()) {
      if (pct >= 98) return "A";
      if (pct >= 90) return "B";
      if (pct >= 80) return "C";
      if (pct >= 70) return "D";
      return "F";
    }
    if (pct >= 95) return "A";
    if (pct >= 88) return "B";
    if (pct >= 78) return "C";
    if (pct >= 68) return "D";
    return "F";
  }

  /** In harsh mode, append universal rigor checks the catalog often omits. */
  function expandChecks(src, checkIds) {
    const ids = checkIds.slice();
    if (!isHarsh()) return ids;

    const webSdk =
      (/maptilersdk|maptiler-sdk-js|@maptiler\/sdk/i.test(src) || /geosplats|Cesium\.|L\.map/i.test(src)) &&
      /<html|<!DOCTYPE|<script/i.test(src);

    const extras = [];
    if (webSdk) {
      extras.push(
        "needs_validate_key",
        "loads_config_js",
        "assigns_sdk_apikey",
        "map_on_error",
        "no_comment_bloat",
        "no_stub_placeholder",
        "no_template_leak",
        "no_legacy_style"
      );
      if (/await |geocoding\.|elevation\.|coordinates\.|staticMaps\./i.test(src)) {
        extras.push("async_catch");
      }
      if (!ids.some((id) => id.startsWith("min_substance"))) {
        extras.push("min_substance_web");
      }
    }

    // Native / admin sketches still get stub + substance pressure
    if (
      /import\s+SwiftUI|import\s+MapTilerSDK|MTConfig\.shared|com\.maptiler\.maptilersdk|maplibre_gl\/maplibre_gl|@maptiler\/react-native|service\.maptiler\.com/i.test(
        src
      )
    ) {
      extras.push("no_stub_placeholder", "min_substance_insane");
    }

    for (const e of extras) {
      if (!ids.includes(e) && CHECKS[e]) ids.push(e);
    }
    return ids;
  }

  function grade(source, checkIds) {
    const raw = String(source || "");
    const src = stripNoise(raw);
    const ids = expandChecks(raw, checkIds || []);
    const results = [];
    for (const id of ids) {
      const fn = CHECKS[id];
      if (!fn) {
        results.push(pts(false, 8, id, "Unknown check — treated as fail"));
        continue;
      }
      try {
        if (id === "no_comment_bloat") {
          const ratio = commentRatio(raw);
          const limit = isHarsh() ? 0.35 : 0.55;
          const ok = ratio <= limit;
          results.push(
            pts(
              ok,
              w(12, "hard"),
              "no_comment_bloat",
              ok
                ? `Comment ratio ${(ratio * 100).toFixed(0)}%`
                : `Comment bloat ${(ratio * 100).toFixed(0)}% (max ${Math.round(limit * 100)}%) — write real code`
            )
          );
          continue;
        }
        // Prefer stripped so commented-out "solutions" don't count.
        results.push(fn(src));
      } catch (err) {
        results.push(pts(false, 8, id, "Checker error: " + (err.message || err)));
      }
    }
    const maxScore = results.reduce((s, r) => s + r.weight, 0);
    const score = results.reduce((s, r) => s + r.points, 0);
    const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
    return {
      checks: results,
      score,
      maxScore,
      pct,
      letter: letter(pct),
      mode: MODE,
    };
  }

  global.MapTilerSkillChecks = {
    grade,
    CHECKS,
    letter,
    setMode,
    getMode,
    THRESHOLDS,
    PINNED_SDK,
    PINNED_WEATHER,
  };
})(typeof window !== "undefined" ? window : globalThis);
