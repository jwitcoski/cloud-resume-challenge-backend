/**
 * Static graders for Map Agent Royal Rumble skills.
 */
(function (global) {
  const LETTERS = [
    { min: 94, letter: "A" },
    { min: 86, letter: "B" },
    { min: 76, letter: "C" },
    { min: 65, letter: "D" },
    { min: 0, letter: "F" },
  ];

  function pts(pass, weight, id, detail) {
    return { pass: !!pass, weight, id, detail: detail || id };
  }

  function substanceLen(src) {
    let s = String(src || "");
    s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
    s = s.replace(/<!--[\s\S]*?-->/g, "");
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");
    s = s.replace(/(^|[^:])\/\/.*$/gm, "$1");
    return s.replace(/\s+/g, " ").trim().length;
  }

  function minSubstance(src, n, id) {
    const len = substanceLen(src);
    const ok = len >= n;
    return pts(ok, 10, id || "min_substance", ok ? `substance ${len}` : `Need ~${n}+ chars of substance (got ${len})`);
  }

  const CHECKS = {
    uses_mapbox(src) {
      const ok = /mapbox-gl|mapboxgl|new\s+mapboxgl\.Map/i.test(src);
      return pts(ok, 12, "uses_mapbox", ok ? "mapbox-gl" : "Use Mapbox GL JS");
    },
    pinned_mapbox(src) {
      const ok = /mapbox-gl-js\/v3\.9\.0|mapbox-gl[@/]3\.9\.0/i.test(src);
      return pts(ok, 8, "pinned_mapbox", ok ? "v3.9.0" : "Pin mapbox-gl v3.9.0");
    },
    uses_maptiler(src) {
      const ok = /maptilersdk|@maptiler\/sdk|maptiler-sdk/i.test(src);
      return pts(ok, 12, "uses_maptiler", ok ? "MapTiler SDK" : "Use MapTiler SDK");
    },
    pinned_maptiler(src) {
      const ok = /maptiler-sdk-js\/v4\.0\.2|@maptiler\/sdk[@/]4\.0\.2/i.test(src);
      return pts(ok, 8, "pinned_maptiler", ok ? "v4.0.2" : "Pin MapTiler SDK v4.0.2");
    },
    uses_maplibre(src) {
      const ok = /maplibre-gl|maplibregl|new\s+maplibregl\.Map/i.test(src);
      return pts(ok, 12, "uses_maplibre", ok ? "MapLibre" : "Use MapLibre GL JS");
    },
    loads_config(src) {
      const ok = /admin-boundaries\/js\/config\.js/i.test(src);
      return pts(ok, 10, "loads_config", ok ? "config.js" : "Load config.js");
    },
    token_hygiene(src) {
      const bad = /mapboxgl\.accessToken\s*=\s*["']pk\./i.test(src) || /MAPBOX_ACCESS_TOKEN\s*=\s*["']pk\./i.test(src);
      return pts(!bad, 14, "token_hygiene", bad ? "Hardcoded pk." : "OK");
    },
    key_hygiene(src) {
      const bad = /MAPTILER_API_KEY\s*=\s*["'][A-Za-z0-9]{10,}["']/i.test(src) && !/window\.MAPTILER_API_KEY/.test(src);
      const hard = /apiKey\s*=\s*["'][A-Za-z0-9_-]{16,}["']/i.test(src);
      return pts(!bad && !hard, 14, "key_hygiene", hard || bad ? "Hardcoded key" : "OK");
    },
    no_commercial_key(src) {
      const bad =
        /pk\.eyJ|MAPBOX_ACCESS_TOKEN|MAPTILER_API_KEY|arcgis.*[Aa]pi[Kk]ey|googleapis\.com\/maps/i.test(src);
      return pts(!bad, 16, "no_commercial_key", bad ? "Commercial key/SDK leak" : "No commercial keys");
    },
    open_style(src) {
      const ok =
        /demotiles\.maplibre\.org|openfreemap\.org|tiles\.openfreemap|protomaps|osm-bright|positron/i.test(src);
      return pts(ok, 10, "open_style", ok ? "Open style" : "Use open/demo tiles style URL");
    },
    token_guard(src) {
      const ok = /MAPBOX_ACCESS_TOKEN/.test(src) && /(!\s*token|!window\.MAPBOX|missing|throw)/i.test(src);
      return pts(ok, 10, "token_guard", ok ? "Guard" : "Missing-token guard");
    },
    key_guard(src) {
      const ok = /MAPTILER_API_KEY/.test(src) && /(!\s*key|!window\.MAPTILER|missing|throw)/i.test(src);
      return pts(ok, 10, "key_guard", ok ? "Guard" : "Missing-key guard");
    },
    prague_center(src) {
      const ok = /\[\s*14\.4178\s*,\s*50\.1167\s*\]/.test(src);
      return pts(ok, 10, "prague_center", ok ? "Prague" : "Center Prague [14.4178, 50.1167]");
    },
    full_viewport(src) {
      const ok = /#map/.test(src) && /height:\s*100%|inset:\s*0|100vh/.test(src);
      return pts(ok, 8, "full_viewport", ok ? "Full viewport" : "Full-viewport #map");
    },
    has_markers(src) {
      const ctor = (src.match(/new\s+(?:mapboxgl|maplibregl|maptilersdk)\.Marker\s*\(/g) || []).length;
      const coords = (src.match(/\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+/g) || []).length;
      const looped =
        /\.forEach/.test(src) &&
        /Marker/.test(src) &&
        !/Only one/.test(src) &&
        coords >= 3;
      const ok = ctor >= 3 || looped;
      return pts(ok, 12, "has_markers", ok ? `Markers (ctors=${ctor}, coords=${coords})` : "Need ≥3 markers/points");
    },
    has_popup(src) {
      const ok = /Popup|popup|setPopup|infoWindow|bindPopup/i.test(src);
      return pts(ok, 10, "has_popup", ok ? "Popup" : "Need popups/info UI");
    },
    style_switcher(src) {
      const dataStyles = src.match(/data-style="[^"]+"/g) || [];
      const unique = new Set(dataStyles);
      const mapStyles = (src.match(/MapStyle\.\w+/g) || []).length;
      const ok = unique.size >= 3 || mapStyles >= 3;
      return pts(ok, 12, "style_switcher", ok ? `≥3 styles (${unique.size || mapStyles})` : "Need ≥3 distinct style controls");
    },
    set_style(src) {
      const ok = /setStyle|style\s*=/i.test(src);
      return pts(ok, 8, "set_style", ok ? "setStyle" : "Call setStyle / change style");
    },
    has_atmosphere(src) {
      const ok = /setFog|lightPreset|halo|space|atmosphere|fog/i.test(src);
      return pts(ok, 14, "has_atmosphere", ok ? "Atmosphere" : "Fog/lights/globe mood");
    },
    geocode_forward(src) {
      const ok = /geocod|searchbox|nominatim|forward|\/search\?/i.test(src);
      return pts(ok, 12, "geocode_forward", ok ? "Forward geocode" : "Forward geocode/search");
    },
    geocode_reverse(src) {
      const omitted = /click reverse omitted|reverse omitted|TODO reverse/i.test(src);
      const ok =
        !omitted &&
        (/\/reverse\b|reverse\?|method:\s*['"]reverse['"]/i.test(src) ||
          (/map\.on\(\s*['"]click['"]/i.test(src) &&
            /geocod|nominatim/i.test(src) &&
            /lngLat\.(lng|lon)|e\.lngLat/i.test(src)));
      return pts(ok, 12, "geocode_reverse", ok ? "Reverse" : "Reverse geocode on click");
    },
    has_debounce(src) {
      const ok = /debounc|setTimeout\s*\(|throttle/i.test(src);
      return pts(ok, 8, "has_debounce", ok ? "Debounce" : "Debounce search input");
    },
    has_flyto(src) {
      const ok = /flyTo|easeTo|goTo|setView|animateTo/i.test(src);
      return pts(ok, 12, "has_flyto", ok ? "Camera move" : "flyTo/easeTo sequence");
    },
    has_pitch_or_bearing(src) {
      const ok = /pitch|bearing/i.test(src);
      return pts(ok, 10, "has_pitch_or_bearing", ok ? "Pitch/bearing" : "Change pitch or bearing");
    },
    has_inset(src) {
      const ok = /inset|#overview|overview-map|minimap/i.test(src);
      return pts(ok, 14, "has_inset", ok ? "Inset" : "Need inset/overview map");
    },
    extent_rect(src) {
      const ok = /extent|bounds|getBounds|rectangle|bbox/i.test(src);
      return pts(ok, 10, "extent_rect", ok ? "Extent" : "Show main extent on inset");
    },
    has_extrusion(src) {
      const ok = /fill-extrusion|extrusion|3d.?building|building.*height/i.test(src);
      return pts(ok, 14, "has_extrusion", ok ? "Extrusion" : "3D buildings / fill-extrusion");
    },
    has_terrain(src) {
      const ok = /setTerrain|terrain-dem|terrain\s*:\s*true|exaggeration/i.test(src);
      return pts(ok, 14, "has_terrain", ok ? "Terrain" : "Enable terrain/DEM");
    },
    has_terrain_or_honest(src) {
      const ok = /setTerrain|terrain-dem|terrain\s*:\s*true|exaggeration|no terrain|honest|hillshade|pitch:\s*6/i.test(src);
      return pts(ok, 12, "has_terrain_or_honest", ok ? "Terrain or honest fallback" : "Terrain or documented fallback");
    },
    has_cluster(src) {
      const ok = /cluster\s*:\s*true|clustered|supercluster|clusterMaxZoom/i.test(src);
      return pts(ok, 14, "has_cluster", ok ? "Cluster" : "Enable clustering");
    },
    has_story_chapters(src) {
      const ok = /chapter|story|scrolly|section.*fly|data-chapter/i.test(src);
      return pts(ok, 14, "has_story_chapters", ok ? "Chapters" : "Multi-chapter story UI");
    },
    has_legend(src) {
      const ok =
        /id=["']legend["']|class=["'][^"']*legend[^"']*["']/i.test(src) &&
        /legend[\s\S]{0,200}(Heat|Corridor|Sites|layer|fill|line|point)/i.test(src);
      return pts(ok, 12, "has_legend", ok ? "Legend" : "Need legend with layer labels");
    },
    has_layer_toggles(src) {
      const ok = /toggle|opacity|checkbox|setLayoutProperty|setPaintProperty|filter/i.test(src);
      return pts(ok, 12, "has_layer_toggles", ok ? "Toggles" : "Layer toggles/opacity/filter");
    },
    has_swipe(src) {
      const ui = /swipe|compare|clip-path|splitter|map-compare/i.test(src);
      // Swipe compare must keep maps geographically synced while dragging/panning
      const synced =
        /function\s+bind\s*\([^)]*\)\s*\{[^}]*jumpTo|function\s+bind\s*\([^)]*\)\s*\{[^}]*setCenter|on\(\s*["']move["'][\s\S]{0,200}(jumpTo|easeTo|setCenter)/i.test(
          src
        ) && !/maps not synced/i.test(src);
      const ok = ui && synced;
      return pts(ok, 14, "has_swipe", ok ? "Swipe + sync" : ui ? "Swipe UI but maps not synced" : "Swipe/compare control");
    },
    has_playback(src) {
      const ok = /play|pause|scrubber|timeline|time-travel|currentTime|frame/i.test(src);
      return pts(ok, 12, "has_playback", ok ? "Playback" : "Play/pause or scrubber");
    },
    has_raf_or_interval(src) {
      // Must actually loop: raf/interval inside the tick/loop body, not only a one-shot start
      const looped =
        /function\s+(tick|loop)\s*\([^)]*\)\s*\{[\s\S]*?requestAnimationFrame\s*\(\s*(tick|loop)\s*\)/i.test(src) ||
        /requestAnimationFrame\s*\(\s*function[\s\S]{0,300}requestAnimationFrame/i.test(src) ||
        /setInterval\s*\(/i.test(src);
      const broken = /no raf loop/i.test(src);
      const ok = looped && !broken;
      return pts(ok, 10, "has_raf_or_interval", ok ? "Animation loop" : "Need recurring raf/interval loop (not one-shot)");
    },
    has_game_controls(src) {
      const ok = /keydown|ArrowUp|wasd|pointerdown|gamepad/i.test(src);
      return pts(ok, 12, "has_game_controls", ok ? "Controls" : "Keyboard/pointer controls");
    },
    has_follow_cam(src) {
      const ok = /follow|setCenter|easeTo|jumpTo|camera.*car|car.*camera/i.test(src);
      return pts(ok, 10, "has_follow_cam", ok ? "Follow cam" : "Camera follows vehicle");
    },
    has_track(src) {
      const ok = /track|LineString|race|street|route\.geometry/i.test(src);
      return pts(ok, 10, "has_track", ok ? "Track layer" : "Visible street/track LineString");
    },
    real_street_route(src) {
      const ok =
        /directions\/v5|map matching|map-matching|router\.project-osrm\.org\/route|\/match\/v1|geometries=geojson/i.test(src) &&
        !/hand-?drawn rectangle|fake track|toy oval/i.test(src);
      return pts(ok, 16, "real_street_route", ok ? "Routed street geometry" : "Load track from Directions/OSRM/map-matching (real street)");
    },
    road_constrained(src) {
      const constrained =
        /along|distanceAlong|nearestPointOnLine|snap|progress|interpolate|pointAlong|getCoordinate|arcLength|distAlong|t\s*\+=|metersAlong/i.test(
          src
        ) && !/free.?driv|off.?road|not constrained|drives anywhere/i.test(src);
      // Free 2D heading integration without projecting back onto the line fails
      const freeFly =
        /car\.(lng|lon)\s*\+=\s*Math\.sin/i.test(src) &&
        !/along|nearestPoint|snap|progress|pointAlong|distAlong/i.test(src);
      const ok = constrained && !freeFly;
      return pts(ok, 18, "road_constrained", ok ? "On-street only" : "Car must stay on street centerline (no free off-road drive)");
    },
    has_directions(src) {
      const ok = /directions|routing|osrm|\/route\/v1/i.test(src);
      return pts(ok, 14, "has_directions", ok ? "Directions" : "Directions/routing API");
    },
    has_line_layer(src) {
      const ok = /line|LineString|addLayer.*line/i.test(src);
      return pts(ok, 10, "has_line_layer", ok ? "Line" : "Draw route line");
    },
    has_isochrone(src) {
      const ok = /isochrone|reachability|contour|table\/v1/i.test(src);
      return pts(ok, 14, "has_isochrone", ok ? "Isochrone" : "Reachability/isochrone");
    },
    has_responsive(src) {
      const ok = /max-width|@media|viewport|touch-action|clamp\(/i.test(src);
      return pts(ok, 10, "has_responsive", ok ? "Responsive" : "Responsive CSS / media");
    },
    has_touch_friendly(src) {
      const ok = /touch|min-height:\s*(44|48)|padding:\s*1[2-9]|button/i.test(src);
      return pts(ok, 8, "has_touch_friendly", ok ? "Touch UI" : "Touch-friendly controls");
    },
    has_geolocation(src) {
      const ok = /geolocation|getCurrentPosition|GeolocateControl|locate/i.test(src);
      return pts(ok, 14, "has_geolocation", ok ? "Geolocation" : "Locate me / geolocation");
    },
    no_stub_placeholder(src) {
      const bad = /\/\*\s*omitted|TODO:|FIXME|not implemented|skill gap|coming soon|implement me/i.test(src);
      return pts(!bad, 14, "no_stub_placeholder", bad ? "Stub/omitted/TODO left in source" : "No stub markers");
    },
    style_reload_hook(src) {
      const ok = /style\.load|on\(['"]load['"].*setStyle|styledata/i.test(src);
      return pts(ok, 10, "style_reload_hook", ok ? "style.load hook" : "Re-bind after setStyle (style.load)");
    },
    extrusion_height_expr(src) {
      const ok = /fill-extrusion-height["']?\s*:\s*\[[\s\S]*?get|interpolate/i.test(src);
      return pts(ok, 12, "extrusion_height_expr", ok ? "Data-driven height" : "Use data-driven extrusion height expression");
    },
    cluster_volume(src) {
      const m = src.match(/for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*(\d+)/);
      const n = m ? Number(m[1]) : 0;
      const ok = n >= 4000 || /5000/.test(src);
      return pts(ok, 10, "cluster_volume", ok ? `~${n || 5000} points` : "Need ~5k points for cluster storm");
    },
    min_substance(src) {
      return minSubstance(src, 400, "min_substance");
    },
    min_substance_med(src) {
      return minSubstance(src, 700, "min_substance_med");
    },
    min_substance_hard(src) {
      return minSubstance(src, 1000, "min_substance_hard");
    },
  };

  /** Human labels for the grading rubric UI (what we look for). */
  const CHECK_LABELS = {
    uses_mapbox: "Uses Mapbox GL JS",
    pinned_mapbox: "Pinned mapbox-gl v3.9.0",
    uses_maptiler: "Uses MapTiler SDK",
    pinned_maptiler: "Pinned MapTiler SDK v4.0.2",
    uses_maplibre: "Uses MapLibre GL JS",
    loads_config: "Loads config.js for keys",
    token_hygiene: "No hardcoded Mapbox pk. token",
    key_hygiene: "No hardcoded MapTiler key",
    no_commercial_key: "No commercial SDK/key leak",
    open_style: "Open/demo tiles style URL",
    token_guard: "Missing-token guard",
    key_guard: "Missing-key guard",
    prague_center: "Center Prague [14.4178, 50.1167]",
    full_viewport: "Full-viewport #map",
    has_markers: "Markers / points (≥3 expected in prompt)",
    has_popup: "Popups or info UI",
    style_switcher: "≥3 style / basemap controls",
    set_style: "Calls setStyle / style change",
    has_atmosphere: "Fog, lights, globe, or mood controls",
    geocode_forward: "Forward geocode / search",
    geocode_reverse: "Reverse geocode on click",
    has_debounce: "Debounced search input",
    has_flyto: "flyTo / easeTo camera move",
    has_pitch_or_bearing: "Pitch or bearing change",
    has_inset: "Inset / overview map",
    extent_rect: "Main extent shown on inset",
    has_extrusion: "3D buildings / fill-extrusion",
    has_terrain: "Terrain / DEM + exaggeration",
    has_terrain_or_honest: "Terrain or honest open-tiles fallback",
    has_cluster: "Point clustering enabled",
    has_story_chapters: "Multi-chapter story UI",
    has_legend: "Legend for thematic layers",
    has_layer_toggles: "Layer toggles / opacity / filter",
    has_swipe: "Swipe or split compare",
    has_playback: "Play/pause or time scrubber",
    has_raf_or_interval: "Animation loop (raf / interval)",
    has_game_controls: "Keyboard / pointer game controls",
    has_follow_cam: "Camera follows vehicle",
    has_track: "Track / street LineString layer",
    real_street_route: "Track loaded from real routing (Directions / OSRM / map-matching)",
    road_constrained: "Car stays on street centerline (progress/snap along line)",
    has_directions: "Directions / routing API",
    has_line_layer: "Route drawn as line layer",
    has_isochrone: "Reachability / isochrone polygons",
    has_responsive: "Responsive / narrow-width CSS",
    has_touch_friendly: "Touch-friendly control sizes",
    has_geolocation: "Geolocation / locate-me",
    placeholder_or_esri: "Esri SDK or awaiting-API placeholder",
    no_stub_placeholder: "No TODO/omitted/skill-gap stubs in source",
    style_reload_hook: "Re-attach handlers after setStyle (style.load)",
    extrusion_height_expr: "Data-driven fill-extrusion height",
    cluster_volume: "~5k points for cluster storm",
    min_substance: "Minimum code substance (easy)",
    min_substance_med: "Minimum code substance (medium)",
    min_substance_hard: "Minimum code substance (hard/insane)",
  };

  /** Why this check exists — shown in the agent brief / rubric. */
  const CHECK_WHY = {
    uses_mapbox: "Confirms the fighter used the Mapbox stack, not a substitute library.",
    pinned_mapbox: "Pins a known-good CDN version so demos don't silently break on major upgrades.",
    uses_maptiler: "Confirms MapTiler SDK (not raw MapLibre-only) when grading the MapTiler seat.",
    pinned_maptiler: "Same version-pinning idea for MapTiler SDK.",
    uses_maplibre: "No Agent must stay on open MapLibre — not a commercial SDK in disguise.",
    loads_config: "Tokens/keys belong in config, not pasted into agent output.",
    token_hygiene: "Hardcoded pk. tokens get leaked into git and screenshots.",
    key_hygiene: "Same leak risk for MapTiler API keys.",
    no_commercial_key: "Impartial baseline fails if it sneaks Mapbox/MapTiler/Esri/Google credentials.",
    open_style: "No Agent must render a real open basemap (OpenFreeMap, etc.), not an empty canvas.",
    token_guard: "Missing-token UX prevents a blank white crash for end users.",
    key_guard: "Same for MapTiler API key.",
    prague_center: "Shared geographic fixture — also catches classic [lat,lng] vs [lng,lat] swaps.",
    full_viewport: "A 'hello map' that is a tiny div fails the product brief.",
    has_markers: "Pins & popups is useless without multiple interactive points.",
    has_popup: "Clicking a pin should reveal information.",
    style_switcher: "Basemap switching is a core display skill — need real choices, not one button.",
    set_style: "UI without calling setStyle doesn't actually switch maps.",
    has_atmosphere: "Mood/fog/globe separates a polished map from a flat default.",
    geocode_forward: "Search must resolve text → coordinates on the map.",
    geocode_reverse: "Click-the-map → address proves reverse geocoding, not just a marker drop.",
    has_debounce: "Without debounce, every keystroke hammers the geocoder.",
    has_flyto: "Camera choreography requires animated camera moves, not only setCenter.",
    has_pitch_or_bearing: "A tour that never tilts/rotates is a weak choreography.",
    has_inset: "Inset maps need a second map instance (overview), not a CSS thumbnail.",
    extent_rect: "Overview must show where the main map is looking.",
    has_extrusion: "3D buildings need extrusion (or vendor 3D buildings), not just pitch.",
    has_terrain: "Terrain fly needs DEM + exaggeration, not only a mountain center.",
    has_terrain_or_honest: "Open stacks may lack DEM — document an honest fallback instead of faking it.",
    has_cluster: "5k raw circles without clustering will tank performance.",
    has_story_chapters: "Story maps need narrative chapters that drive the map.",
    has_legend: "Thematic layers without a legend fail cartography basics.",
    has_layer_toggles: "Layer studio must let users turn layers on/off or filter them.",
    has_swipe: "Compare views need a swipe/clip interaction with geographic sync between maps.",
    has_playback: "Time-travel needs play/pause or a scrubber, not a single frame.",
    has_raf_or_interval: "Animation must keep looping (raf inside tick / setInterval) — a one-shot start is a fail.",
    has_game_controls: "Racecar without input isn't a game.",
    has_follow_cam: "Camera should track the vehicle.",
    has_track: "Need a visible street/track LineString to race on.",
    real_street_route: "Toy ovals fail — the track must come from real road routing between map points.",
    road_constrained: "The car may only move along that street — free off-road driving is a fail.",
    has_directions: "Navigation track requires a real router (Directions / OSRM).",
    has_line_layer: "A route JSON without drawing the line fails the display brief.",
    has_isochrone: "Reachability must show polygons, not just a point.",
    has_responsive: "Mobile web maps must work at narrow widths.",
    has_touch_friendly: "Tiny hover-only controls fail on phones.",
    has_geolocation: "Locate-me needs the Geolocation API / control + permission UX.",
    placeholder_or_esri: "Esri seat stays honest until API packs exist.",
    no_stub_placeholder: "Skill agents often leave /* omitted */ / TODO — that is a real fail, same spirit as individual graders.",
    style_reload_hook: "After setStyle, layers/handlers die unless re-bound on style.load.",
    extrusion_height_expr: "Hardcoded extrusion height is a common first-pass miss vs data-driven height.",
    cluster_volume: "Under-sampling (hundreds instead of ~5k) is a typical skill-pass shortcut.",
    min_substance: "Filters empty stubs and one-liner fakes.",
    min_substance_med: "Medium skills need real implementation mass.",
    min_substance_hard: "Hard/insane skills need substantial working code.",
  };

  function letterFor(pct) {
    for (const row of LETTERS) {
      if (pct >= row.min) return row.letter;
    }
    return "F";
  }

  /**
   * Rubric for a list of check ids — weights + what we grade (no source needed).
   */
  function rubric(checkIds) {
    const ids = Array.isArray(checkIds) ? checkIds : [];
    const rows = ids.map((id) => {
      const fn = CHECKS[id];
      if (!fn) {
        return { id, weight: 0, label: `Unknown check ${id}`, known: false };
      }
      // Probe weight via empty source (pass/fail ignored)
      const sample = fn("");
      return {
        id,
        weight: sample.weight,
        label: CHECK_LABELS[id] || sample.detail || id,
        why: CHECK_WHY[id] || "",
        known: true,
      };
    });
    const possible = rows.reduce((s, r) => s + r.weight, 0);
    return {
      checks: rows,
      possible,
      letters: LETTERS.slice(),
      note: "Harsh letter cutoffs: A≥94 · B≥86 · C≥76 · D≥65 · else F. Score = earned weights / possible.",
    };
  }

  function grade(source, checkIds) {
    const ids = Array.isArray(checkIds) ? checkIds : [];
    if (!ids.length) {
      return { earned: 0, possible: 0, pct: 0, letter: "N/A", checks: [], na: true };
    }
    const checks = ids.map((id) => {
      const fn = CHECKS[id];
      if (!fn) return pts(false, 0, id, `Unknown check ${id}`);
      return fn(source || "");
    });
    const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
    const possible = checks.reduce((s, c) => s + c.weight, 0);
    const pct = possible ? Math.round((1000 * earned) / possible) / 10 : 0;
    return {
      earned,
      possible,
      pct,
      letter: letterFor(pct),
      checks,
      score: earned,
      maxScore: possible,
      na: false,
    };
  }

  function canAttempt(fighter, skill) {
    const reqs = skill.requires || [];
    if (!reqs.length) return true;
    const caps = (fighter && fighter.capabilities) || {};
    return reqs.every((r) => caps[r]);
  }

  global.RumbleChecks = {
    grade,
    rubric,
    letterFor,
    canAttempt,
    CHECKS,
    CHECK_LABELS,
    CHECK_WHY,
    LETTERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
