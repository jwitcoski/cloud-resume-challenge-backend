/**
 * Static graders for Mapbox agent skill challenges.
 */
(function (global) {
  let MODE = "harsh";

  const THRESHOLDS = {
    normal: { web: 400, extreme: 900, insane: 450 },
    harsh: { web: 700, extreme: 1400, insane: 600 },
  };

  const PRAGUE_OK_RE = /\[\s*14\.4178\s*,\s*50\.1167\s*\]/;
  const PRAGUE_SWAPPED_RE = /\[\s*50\.1167\s*,\s*14\.4178\s*\]/;
  const NYC_SWAPPED_RE = /\[\s*40\.7\d*\s*,\s*-74\.0\d*\s*\]/;
  const STUB_RE =
    /TODO:|FIXME|not implemented|coming soon|implement me|lorem ipsum|pk\.eyJ[A-Za-z0-9_-]{20,}/i;

  function pts(pass, weight, id, detail) {
    return { pass: !!pass, weight, id, detail: detail || id };
  }

  function w(n, when) {
    if (when === "hard" && MODE !== "harsh") return Math.max(4, Math.round(n * 0.55));
    return n;
  }

  function stripCss(src) {
    return src.replace(/<style[\s\S]*?<\/style>/gi, "");
  }

  function substanceLen(src) {
    let s = stripCss(src);
    s = s.replace(/<!--[\s\S]*?-->/g, "");
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");
    s = s.replace(/(^|[^:])\/\/.*$/gm, "$1");
    return s.replace(/\s+/g, " ").trim().length;
  }

  function countMatches(src, re) {
    const m = src.match(re);
    return m ? m.length : 0;
  }

  const CHECKS = {
    uses_mapbox_gl(src) {
      const ok = /mapbox-gl|mapboxgl|new\s+mapboxgl\.Map/i.test(src);
      return pts(ok, 12, "uses_mapbox_gl", ok ? "mapbox-gl" : "Use mapbox-gl / mapboxgl.Map");
    },

    pinned_gl_version(src) {
      if (!/mapbox-gl/i.test(src)) return pts(true, 4, "pinned_gl_version", "N/A");
      const ok = /mapbox-gl-js\/v3\.9\.0|mapbox-gl[@/]3\.9\.0/i.test(src);
      return pts(ok, w(10, "hard"), "pinned_gl_version", ok ? "v3.9.0" : "Pin mapbox-gl v3.9.0 CDN");
    },

    no_template_leak(src) {
      const bad = /\{\{|\}\}|site\.versions|YOUR_TOKEN_HERE(?![\s\S]*MAPBOX_ACCESS_TOKEN)/.test(src);
      return pts(!bad, 12, "no_template_leak", bad ? "Template leak" : "OK");
    },

    api_token_hygiene(src) {
      const hard =
        /(?:MAPBOX_ACCESS_TOKEN|accessToken)\s*=\s*["']pk\.[A-Za-z0-9._-]+["']/i.test(src) ||
        /mapboxgl\.accessToken\s*=\s*["']pk\./i.test(src);
      if (hard) return pts(false, 16, "api_token_hygiene", "Hardcoded pk. token");
      return pts(true, 10, "api_token_hygiene", "OK");
    },

    loads_config_js(src) {
      // Require real HTML document tags — not TS generics like useRef<HTMLDivElement>
      if (!/<!DOCTYPE\s+html\b|<html[\s>]|<script[\s>]/i.test(src)) {
        return pts(true, 4, "loads_config_js", "N/A");
      }
      const ok = /admin-boundaries\/js\/config\.js/i.test(src);
      return pts(ok, w(12, "hard"), "loads_config_js", ok ? "config.js loaded" : "Load ../admin-boundaries/js/config.js");
    },

    assigns_access_token(src) {
      if (!/mapboxgl|mapbox-gl/i.test(src)) return pts(true, 4, "assigns_access_token", "N/A");
      const ok = /mapboxgl\.accessToken\s*=/i.test(src) || /accessToken\s*:\s*/i.test(src);
      return pts(ok, w(12, "hard"), "assigns_access_token", ok ? "accessToken set" : "Set mapboxgl.accessToken");
    },

    needs_validate_token(src) {
      const ok =
        /MAPBOX_ACCESS_TOKEN|accessToken/.test(src) &&
        /(missing|YOUR_MAPBOX|!token|!window\.MAPBOX|throw new Error|if\s*\(\s*!)/i.test(src);
      return pts(ok, w(14, "hard"), "needs_validate_token", ok ? "Token guard" : "Add missing-token guard");
    },

    needs_full_viewport(src) {
      const ok = /#map/.test(src) && /height:\s*100%|inset:\s*0|100vh/.test(src);
      return pts(ok, w(10, "hard"), "needs_full_viewport", ok ? "Full viewport" : "Need full-viewport #map CSS");
    },

    lng_lat_order(src) {
      if (PRAGUE_SWAPPED_RE.test(src) || NYC_SWAPPED_RE.test(src)) {
        return pts(false, 16, "lng_lat_order", "Swapped [lat,lng] fixture");
      }
      return pts(true, 10, "lng_lat_order", "No classic swap");
    },

    no_stub_placeholder(src) {
      const bad = STUB_RE.test(src);
      return pts(!bad, w(18, "hard"), "no_stub_placeholder", bad ? "Stub/placeholder left" : "No stubs");
    },

    min_substance_web(src) {
      const need = THRESHOLDS[MODE].web;
      const n = substanceLen(src);
      return pts(n >= need, w(12, "hard"), "min_substance_web", n >= need ? `${n} chars` : `Too thin (${n}, need ≥${need})`);
    },

    min_substance_extreme(src) {
      const need = THRESHOLDS[MODE].extreme;
      const n = substanceLen(src);
      return pts(n >= need, w(18, "hard"), "min_substance_extreme", n >= need ? `${n} chars` : `Too thin (${n}, need ≥${need})`);
    },

    min_substance_insane(src) {
      const need = THRESHOLDS[MODE].insane;
      const n = substanceLen(src);
      return pts(n >= need, w(16, "hard"), "min_substance_insane", n >= need ? `${n} chars` : `Too thin (${n}, need ≥${need})`);
    },

    needs_standard_style(src) {
      return pts(/mapbox:\/\/styles\/mapbox\/standard|styles\/mapbox\/standard/i.test(src), 10, "needs_standard_style", "Standard style");
    },

    needs_prague_center(src) {
      return pts(PRAGUE_OK_RE.test(src) || /14\.4178[\s\S]{0,40}50\.1167/.test(src), 10, "needs_prague_center", "Prague [lng,lat]");
    },

    needs_fog(src) {
      return pts(/\.setFog\s*\(|fog\s*:/i.test(src), 12, "needs_fog", "setFog / fog");
    },

    needs_lights_or_preset(src) {
      const ok = /lightPreset|setLights|\.setConfigProperty\s*\(\s*['"]basemap['"]\s*,\s*['"]lightPreset/i.test(src)
        || /lights\s*:\s*\[/i.test(src);
      return pts(ok, 12, "needs_lights_or_preset", ok ? "lights/preset" : "Need lightPreset or setLights");
    },

    needs_terrain_dem(src) {
      return pts(/mapbox-terrain-dem|terrain-dem-v1|raster-dem/i.test(src), 12, "needs_terrain_dem", "terrain-dem source");
    },

    needs_set_terrain(src) {
      return pts(/\.setTerrain\s*\(/i.test(src), 10, "needs_set_terrain", "setTerrain");
    },

    needs_flyto(src) {
      return pts(/\.flyTo\s*\(/.test(src), 8, "needs_flyto", "flyTo");
    },

    flyto_alps(src) {
      const ok =
        /flyTo\s*\(\s*\{[\s\S]{0,160}center\s*:\s*\[\s*8\.\d+\s*,\s*46\.\d+/i.test(src) ||
        /center\s*:\s*\[\s*8\.6\s*,\s*46\.5\s*\]/i.test(src);
      return pts(ok, 16, "flyto_alps", ok ? "Alps flyTo" : "flyTo Alps (~[8.6, 46.5])");
    },

    needs_setstyle(src) {
      return pts(/\.setStyle\s*\(/.test(src), 8, "needs_setstyle", "setStyle");
    },

    needs_style_reload_hook(src) {
      return pts(/style\.load|styledata|once\(\s*['"]style/i.test(src), 14, "needs_style_reload_hook", "style reload hook");
    },

    style_switcher_at_least_3(src) {
      const n = countMatches(src, /mapbox:\/\/styles\/mapbox\/[a-z0-9-]+/gi);
      return pts(n >= 3, 14, "style_switcher_at_least_3", n >= 3 ? `${n} styles` : `Need ≥3 style URLs (found ${n})`);
    },

    needs_geocode_forward(src) {
      const ok = /geocoding\/v5|search\/searchbox|forwardGeocode|geocode\(|&autocomplete=/i.test(src)
        || /api\.mapbox\.com\/(geocoding|search)/i.test(src);
      return pts(ok, 12, "needs_geocode_forward", ok ? "forward geocode" : "Call Mapbox Geocoding/Search");
    },

    needs_geocode_reverse(src) {
      const ok = /\/reverse\.|reverseGeocode|types=address.*reverse|geocoding\/v5\/mapbox\.places\/[^"'`]+\.json/i.test(src)
        || (/geocoding\/v5/i.test(src) && /reverse|click/i.test(src));
      return pts(ok, 12, "needs_geocode_reverse", ok ? "reverse geocode" : "Reverse geocode on click");
    },

    geocode_ui_input(src) {
      return pts(/<input|getElementById\s*\(\s*['"]q['"]/i.test(src), 10, "geocode_ui_input", "Search input UI");
    },

    geocode_two_inputs(src) {
      const n = countMatches(src, /<input/gi);
      return pts(n >= 2, 12, "geocode_two_inputs", n >= 2 ? `${n} inputs` : "Need origin + destination inputs");
    },

    needs_debounce(src) {
      return pts(/debounc|throttle|clearTimeout/i.test(src), 6, "needs_debounce", "debounce");
    },

    debounce_cleartimeout(src) {
      const ok = /clearTimeout/i.test(src) && /setTimeout/i.test(src);
      return pts(ok, 16, "debounce_cleartimeout", ok ? "clearTimeout debounce" : "Debounce with clearTimeout+setTimeout");
    },

    async_catch(src) {
      const ok = /try\s*\{[\s\S]*await[\s\S]*catch|\.catch\s*\(/i.test(src);
      return pts(ok, w(12, "hard"), "async_catch", ok ? "async error handling" : "try/catch or .catch around fetches");
    },

    needs_directions_api(src) {
      return pts(/directions\/v5|api\.mapbox\.com\/directions/i.test(src), 14, "needs_directions_api", "Directions API");
    },

    needs_line_layer(src) {
      const ok = /type\s*:\s*['"]line['"]|addLayer\s*\(\s*\{[\s\S]*line/i.test(src);
      return pts(ok, 12, "needs_line_layer", ok ? "line layer" : "Add GeoJSON line layer");
    },

    needs_fill_extrusion(src) {
      return pts(/fill-extrusion|'fill-extrusion'/i.test(src), 10, "needs_fill_extrusion", "fill-extrusion");
    },

    extrusion_height_expr(src) {
      const ok =
        /fill-extrusion-height['"`]?\s*:\s*\[[\s\S]*?get/i.test(src) ||
        /'fill-extrusion-height'\s*:\s*\[[\s\S]*?\['get'/i.test(src);
      return pts(ok, 16, "extrusion_height_expr", ok ? "height expression" : "Data-driven fill-extrusion-height");
    },

    five_thousand_points(src) {
      const ok = /i\s*<\s*5000|5000\s*;|length\s*=\s*5000|new Array\(\s*5000/i.test(src);
      return pts(ok, 16, "five_thousand_points", ok ? "5000 loop" : "Generate ~5000 features");
    },

    needs_cluster_true(src) {
      return pts(/cluster\s*:\s*true/i.test(src), 10, "needs_cluster_true", "cluster:true");
    },

    cluster_and_unclustered_layers(src) {
      const clustered = /\[\s*['"]has['"]\s*,\s*['"]point_count['"]\s*\]/i.test(src);
      const unclustered =
        /unclustered/i.test(src) ||
        /\[\s*['"]!['"]\s*,\s*\[\s*['"]has['"]\s*,\s*['"]point_count['"]/i.test(src);
      const ok = clustered && unclustered && /addLayer/.test(src);
      return pts(ok, 16, "cluster_and_unclustered_layers", ok ? "Cluster + unclustered" : "Need has point_count and unclustered layers");
    },

    needs_popup_or_click(src) {
      return pts(/new\s+mapboxgl\.Popup|\.on\(\s*['"]click['"]/i.test(src), 8, "needs_popup_or_click", "click/popup");
    },

    store_list_ui(src) {
      const ok = /<ul|<ol|store-list|getElementById\s*\(\s*['"]list/i.test(src) && /flyTo|Marker/i.test(src);
      return pts(ok, 14, "store_list_ui", ok ? "store list" : "List UI + flyTo/Marker");
    },

    route_stats_ui(src) {
      const ok =
        /\.distance\b/.test(src) &&
        /\.duration\b/.test(src) &&
        /(textContent|innerHTML|innerText)/i.test(src) &&
        /\b(km|mi|miles)\b/i.test(src) &&
        /\bmin(ute)?s?\b/i.test(src);
      return pts(ok, 14, "route_stats_ui", ok ? "route stats UI" : "Show real route.distance + route.duration as km/min");
    },

    uses_route_distance_duration(src) {
      const ok = /(?:r|route)\.distance/.test(src) && /(?:r|route)\.duration/.test(src);
      return pts(ok, 16, "uses_route_distance_duration", ok ? "Uses API distance/duration" : "Read distance & duration from Directions route object");
    },

    no_fake_route_stats(src) {
      const fake =
        /\bLen\b/.test(src) ||
        /Math\.round\(\s*120\s*\/\s*60\s*\)/.test(src) ||
        /durationSec\s*=\s*120\b/.test(src) ||
        /\|\|\s*120\b/.test(src) && /duration/i.test(src);
      return pts(!fake, 14, "no_fake_route_stats", fake ? "Fake/hardcoded route stats" : "OK");
    },

    geocode_proximity_bias(src) {
      const ok = /[?&]proximity=/.test(src) || /proximity\s*:/.test(src);
      return pts(ok, 14, "geocode_proximity_bias", ok ? "proximity bias" : "Bias geocode with proximity= (e.g. DC) so Lincoln Memorial ≠ Illinois");
    },

    needs_matrix_api(src) {
      return pts(/directions-matrix|\/matrix\/|api\.mapbox\.com\/directions-matrix/i.test(src), 14, "needs_matrix_api", "Matrix API");
    },

    matrix_destinations_5(src) {
      const named = countMatches(src, /name\s*:\s*["'][^"']+["']/g);
      const coords = countMatches(src, /\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\]/g);
      const ok = /directions-matrix|\/matrix\//i.test(src) && (named >= 5 || coords >= 6);
      return pts(ok, 12, "matrix_destinations_5", ok ? "≥5 destinations" : "Need ≥5 destination points");
    },

    eta_table_ui(src) {
      return pts(/<table|eta|duration/i.test(src) && /(textContent|innerHTML|<td)/i.test(src), 12, "eta_table_ui", "ETA table UI");
    },

    needs_isochrone_api(src) {
      return pts(/isochrone\/v1|api\.mapbox\.com\/isochrone/i.test(src), 14, "needs_isochrone_api", "Isochrone API");
    },

    isochrone_multi_contour(src) {
      const ok = /contours_minutes=15(%2C|,)30(%2C|,)60/i.test(src);
      return pts(ok, 14, "isochrone_multi_contour", ok ? "multi contours" : "Request contours_minutes=15,30,60");
    },

    needs_fill_layer(src) {
      return pts(/type\s*:\s*['"]fill['"]/i.test(src), 10, "needs_fill_layer", "fill layer");
    },

    needs_map_remove(src) {
      return pts(/\.remove\s*\(\s*\)/i.test(src) && /map/i.test(src), 12, "needs_map_remove", "map.remove()");
    },

    perf_checklist_mention(src) {
      const ok = /cluster|symbol|HTML Marker|performance|debounce/i.test(src);
      return pts(ok, 10, "perf_checklist_mention", ok ? "perf patterns mentioned" : "Document perf patterns used");
    },

    mentions_maplibre(src) {
      return pts(/maplibre/i.test(src), 12, "mentions_maplibre", "MapLibre mention");
    },

    mentions_access_token_diff(src) {
      const ok = /accessToken|access token/i.test(src) && /(maplibre|no token|not required)/i.test(src);
      return pts(ok, 12, "mentions_access_token_diff", ok ? "token diff noted" : "Explain Mapbox token vs MapLibre");
    },

    mentions_style_url_diff(src) {
      const ok = /mapbox:\/\//i.test(src) && /(open|osm|style\.json|maptiler|demotiles)/i.test(src);
      return pts(ok, 12, "mentions_style_url_diff", ok ? "style URL diff" : "Contrast mapbox:// vs open styles");
    },

    map_on_error(src) {
      return pts(/\.on\(\s*['"]error['"]/i.test(src), 8, "map_on_error", "map.on('error')");
    },

    no_comment_bloat(src) {
      return pts(true, w(10, "hard"), "no_comment_bloat", "OK");
    },

    // ——— Insane ———
    needs_react(src) {
      const ok = /from\s+['"]react['"]|require\(['"]react['"]\)/.test(src) && /useRef|useEffect/.test(src);
      return pts(ok, 14, "needs_react", ok ? "React hooks" : "React useRef/useEffect map component");
    },
    needs_use_effect(src) {
      return pts(/useEffect\s*\(/.test(src), 10, "needs_use_effect", "useEffect");
    },
    react_env_token(src) {
      const ok =
        /import\.meta\.env\.|process\.env\.(NEXT_PUBLIC_)?MAPBOX|VITE_MAPBOX_ACCESS_TOKEN|NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN/i.test(src);
      return pts(ok, 14, "react_env_token", ok ? "env token" : "Load token from Vite/Next env");
    },

    needs_deckgl(src) {
      return pts(/deck\.gl|@deck\.gl|ScatterplotLayer|HexagonLayer|Deck\b/i.test(src), 14, "needs_deckgl", "deck.gl");
    },
    deck_mapbox_overlay(src) {
      const ok = /MapboxOverlay|@deck\.gl\/mapbox/i.test(src);
      return pts(ok, 16, "deck_mapbox_overlay", ok ? "MapboxOverlay" : "Wire @deck.gl/mapbox MapboxOverlay");
    },
    /** Fail the jsDelivr +esm @deck.gl pattern that throws makeBatchFromTable at runtime. */
    deck_stable_cdn(src) {
      const broken = /jsdelivr\.net\/npm\/@deck\.gl\/[^"' )\n]+\/?\+esm/i.test(src);
      return pts(
        !broken,
        16,
        "deck_stable_cdn",
        broken
          ? "jsDelivr +esm @deck.gl breaks (makeBatchFromTable) — use unpkg deck.gl UMD or esm.sh"
          : "OK deck.gl CDN"
      );
    },

    needs_mapbox_draw(src) {
      return pts(/mapbox-gl-draw|MapboxDraw/i.test(src), 14, "needs_mapbox_draw", "mapbox-gl-draw");
    },
    draw_create_handler(src) {
      // Must be a real listener, not a comment that happens to mention the event name
      const ok =
        /map\.on\s*\(\s*["']draw\.create["']/.test(src) ||
        /\.on\s*\(\s*["']draw\.create["']/.test(src);
      return pts(ok, 12, "draw_create_handler", ok ? "draw.create handler" : "Listen for draw.create and update the UI");
    },

    needs_swift_mapbox(src) {
      return pts(/import\s+MapboxMaps|MapboxMaps/i.test(src), 14, "needs_swift_mapbox", "MapboxMaps import");
    },
    needs_swiftui_map(src) {
      return pts(/SwiftUI|struct\s+\w+\s*:\s*View|Map\s*\(/i.test(src), 12, "needs_swiftui_map", "SwiftUI Map");
    },
    ios_style_uri(src) {
      const ok = /mapbox:\/\/styles\/mapbox\/|StyleURI|\.streets|\.standard/i.test(src);
      return pts(ok, 12, "ios_style_uri", ok ? "style URI" : "Mapbox style URI");
    },
    ios_token_not_hardcoded(src) {
      const hard = /pk\.eyJ[A-Za-z0-9_-]{20,}/.test(src);
      return pts(!hard, 16, "ios_token_not_hardcoded", hard ? "Hardcoded pk. token" : "OK");
    },
    ios_annotation_or_marker(src) {
      const ok = /MapViewAnnotation|PointAnnotation|Marker|MapboxMapContent/i.test(src);
      return pts(ok, 10, "ios_annotation_or_marker", ok ? "annotation" : "Add Marker/MapViewAnnotation");
    },

    needs_android_mapbox(src) {
      return pts(/com\.mapbox\.|mapbox\.maps|MapboxMap/i.test(src), 14, "needs_android_mapbox", "Mapbox Android");
    },
    android_compose_map(src) {
      return pts(/@Composable|MapboxMap\s*\(|MapViewportState/i.test(src), 12, "android_compose_map", "Compose MapboxMap");
    },
    android_point_lng_lat(src) {
      const ok = /Point\s*\(\s*-?\d|Point\.fromLngLat|longitude|lng\s*,/i.test(src);
      return pts(ok, 12, "android_point_lng_lat", ok ? "lng/lat Point" : "Use lng,lat Point order");
    },
    needs_android_internet(src) {
      return pts(/android\.permission\.INTERNET|uses-permission[^>]*INTERNET/i.test(src), 12, "needs_android_internet", "INTERNET permission");
    },
    android_style_uri(src) {
      return pts(/mapbox:\/\/styles\/mapbox\/|Style\.MAPBOX_STREETS|styleUri/i.test(src), 10, "android_style_uri", "Android style URI");
    },

    needs_flutter_mapbox(src) {
      return pts(/mapbox_maps_flutter|package:mapbox/i.test(src), 14, "needs_flutter_mapbox", "mapbox_maps_flutter");
    },
    flutter_map_widget(src) {
      return pts(/MapWidget\s*\(/i.test(src), 12, "flutter_map_widget", "MapWidget");
    },
    flutter_style_uri(src) {
      return pts(/MapboxStyles|styleURI|mapbox:\/\/styles/i.test(src), 10, "flutter_style_uri", "Flutter style");
    },
    flutter_token_env(src) {
      const ok = /fromEnvironment|String\.fromEnvironment|ACCESS_TOKEN|MAPBOX_ACCESS_TOKEN/i.test(src);
      return pts(ok, 12, "flutter_token_env", ok ? "token env" : "Token via fromEnvironment / config");
    },

    needs_rn_mapbox(src) {
      return pts(/@rnmapbox\/maps|rnmapbox/i.test(src), 14, "needs_rn_mapbox", "@rnmapbox/maps");
    },
    rn_mapview(src) {
      return pts(/<MapView|MapView\s*\//i.test(src), 12, "rn_mapview", "MapView");
    },
    rn_set_access_token(src) {
      return pts(/setAccessToken|MapboxGL\.setAccessToken|Mapbox\.setAccessToken/i.test(src), 12, "rn_set_access_token", "setAccessToken");
    },
    rn_style_url(src) {
      return pts(/StyleURL|styleURL|mapbox:\/\/styles/i.test(src), 10, "rn_style_url", "RN style URL");
    },

    mentions_google_maps(src) {
      return pts(/google\.maps|Google Maps|@react-google-maps/i.test(src), 12, "mentions_google_maps", "Google Maps mention");
    },
    mentions_latlng_trap(src) {
      const ok = /lat\s*,\s*lng|LatLng|lng\/lat|longitude.+latitude|\[lng,\s*lat\]/i.test(src);
      return pts(ok, 14, "mentions_latlng_trap", ok ? "lat/lng order called out" : "Document LatLng vs [lng,lat] trap");
    },
    google_equiv_directions_or_places(src) {
      const ok = /DirectionsService|places|Geocoder|Directions API|Search Box|geocoding/i.test(src);
      return pts(ok, 12, "google_equiv_directions_or_places", ok ? "API equivalents" : "Map Directions/Places → Mapbox APIs");
    },
  };

  function grade(source, checkIds) {
    const ids = checkIds.slice();
    if (MODE === "harsh") {
      for (const extra of ["no_stub_placeholder", "loads_config_js", "api_token_hygiene"]) {
        if (!ids.includes(extra) && CHECKS[extra]) ids.push(extra);
      }
    }

    const results = [];
    let earned = 0;
    let possible = 0;

    for (const id of ids) {
      const fn = CHECKS[id];
      if (!fn) {
        results.push({ pass: false, weight: 0, id, detail: "Unknown check" });
        continue;
      }
      let r = fn(source);
      if (id === "no_comment_bloat") {
        const raw = source.length || 1;
        const comments = (source.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).join("").length;
        const ratio = comments / raw;
        const ok = ratio < (MODE === "harsh" ? 0.45 : 0.6);
        r = pts(ok, w(10, "hard"), "no_comment_bloat", ok ? "Comment ratio OK" : "Comment bloat");
      }
      results.push(r);
      possible += r.weight;
      if (r.pass) earned += r.weight;
    }

    const pct = possible ? Math.round((earned / possible) * 100) : 0;
    let letter = "F";
    if (MODE === "harsh") {
      if (pct >= 94) letter = "A";
      else if (pct >= 86) letter = "B";
      else if (pct >= 76) letter = "C";
      else if (pct >= 65) letter = "D";
    } else {
      if (pct >= 90) letter = "A";
      else if (pct >= 80) letter = "B";
      else if (pct >= 70) letter = "C";
      else if (pct >= 60) letter = "D";
    }

    return { pct, letter, earned, possible, checks: results, mode: MODE };
  }

  function letterThresholds() {
    if (MODE === "harsh") {
      return {
        mode: "harsh",
        bands: [
          { letter: "A", min: 94 },
          { letter: "B", min: 86 },
          { letter: "C", min: 76 },
          { letter: "D", min: 65 },
          { letter: "F", min: 0 },
        ],
        harshExtras: ["no_stub_placeholder", "loads_config_js", "api_token_hygiene"],
        note: "Score = sum(passed check weights) / sum(all weights). Harsh mode adds extra rigor checks and stricter letter cutoffs.",
      };
    }
    return {
      mode: "normal",
      bands: [
        { letter: "A", min: 90 },
        { letter: "B", min: 80 },
        { letter: "C", min: 70 },
        { letter: "D", min: 60 },
        { letter: "F", min: 0 },
      ],
      harshExtras: [],
      note: "Score = sum(passed check weights) / sum(all weights).",
    };
  }

  function humanizeCheckId(id) {
    return String(id || "")
      .replace(/^needs_/, "")
      .replace(/_/g, " ");
  }

  /** Build visible rubric for a challenge (weights from live checkers). */
  function rubric(checkIds) {
    const ids = (checkIds || []).slice();
    if (MODE === "harsh") {
      for (const extra of ["no_stub_placeholder", "loads_config_js", "api_token_hygiene"]) {
        if (!ids.includes(extra) && CHECKS[extra]) ids.push(extra);
      }
    }
    const catalogSet = new Set(checkIds || []);
    const rows = [];
    for (const id of ids) {
      const fn = CHECKS[id];
      if (!fn) {
        rows.push({ id, weight: 0, label: humanizeCheckId(id), hint: "Unknown check", extra: false });
        continue;
      }
      let sample;
      try {
        sample = fn("");
      } catch {
        sample = { weight: 0, detail: humanizeCheckId(id) };
      }
      rows.push({
        id,
        weight: sample.weight || 0,
        label: humanizeCheckId(id),
        hint: sample.detail || humanizeCheckId(id),
        extra: !catalogSet.has(id),
      });
    }
    const totalWeight = rows.reduce((s, r) => s + (r.weight || 0), 0);
    return { mode: MODE, totalWeight, checks: rows, letters: letterThresholds() };
  }

  global.MapboxSkillChecks = {
    grade,
    setMode(m) {
      MODE = m === "normal" ? "normal" : "harsh";
    },
    getMode() {
      return MODE;
    },
    CHECKS,
    rubric,
    letterThresholds,
  };
})(typeof window !== "undefined" ? window : globalThis);
