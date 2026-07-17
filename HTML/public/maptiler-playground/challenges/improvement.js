/**
 * Map failed check IDs → agent improvement guidance.
 * Used by the scoreboard "Agent improvement report" export.
 */
(function (global) {
  const ADVICE = {
    no_cookiecutter_split_css: {
      theme: "Stop template paste",
      skill: "General / code hygiene",
      do: "Generate only CSS used by this challenge. Do not copy a shared .split pane stylesheet into every file.",
      why: "Unused boilerplate pads file size and signals the agent is cloning a shell instead of solving the prompt.",
    },
    loads_config_js: {
      theme: "API key wiring",
      skill: "Authentication",
      do: "Include <script src=\"../admin-boundaries/js/config.js\"> so window.MAPTILER_API_KEY is available.",
      why: "Browser demos without the playground config path fail silently for graders and users.",
    },
    assigns_sdk_apikey: {
      theme: "API key wiring",
      skill: "SDK JS config",
      do: "Assign maptilersdk.config.apiKey before constructing Map.",
      why: "Missing config.apiKey is the #1 empty-map failure.",
    },
    no_comment_bloat: {
      theme: "Thin solutions",
      skill: "General / code hygiene",
      do: "Prefer executable code over long comment essays; comments should not dominate the file.",
      why: "Harsh mode rejects comment-padded stubs that look long but do nothing.",
    },
    min_substance_web: {
      theme: "Thin solutions",
      skill: "SDK JS basics",
      do: "Ship a complete page: full-viewport map CSS, key assignment, Map constructor, and at least one real interaction or guard.",
      why: "Keyword-only snippets pass soft graders but fail substance thresholds.",
    },
    min_substance_extreme: {
      theme: "Thin Extreme solutions",
      skill: "Extreme stacking",
      do: "Extreme challenges need layered behavior (reload hooks, UI, error paths), not a minimal happy-path Map.",
      why: "After CSS is stripped, thin Extreme files still fail substance.",
    },
    min_substance_insane: {
      theme: "Thin Insane / mobile sketches",
      skill: "Native + Cesium + Admin",
      do: "Include real package imports, style URL wiring, permissions/manifest bits, and non-stub asset IDs — not a 20-line outline.",
      why: "Insane tier grades whether the agent can leave the web SDK comfort zone with usable code.",
    },
    needs_validate_key: {
      theme: "API key hygiene",
      skill: "Authentication",
      do: "Guard missing window.MAPTILER_API_KEY / env keys before constructing the map; throw or show a clear UI error.",
      why: "Skill and Cloud docs assume keys are configured; silent empty maps hide setup failures.",
    },
    cesium_cdn_loads: {
      theme: "Cesium CDN must actually load",
      skill: "Cesium",
      do: "Use jsDelivr or unpkg cesium@1.141.0 — not cesium.com/downloads/.../1.141.0 (that path 404s and yields a blank page).",
      why: "Pinning a version that never loads still looked like a pass under soft keyword checks.",
    },
    cesium_base_url: {
      theme: "Cesium static assets",
      skill: "Cesium",
      do: "Set window.CESIUM_BASE_URL to the CDN Build/Cesium/ folder before loading Cesium.js.",
      why: "Without BASE_URL, workers/Assets/Widgets fail and the globe stays blank.",
    },
    cesium_guards_load: {
      theme: "Visible Cesium failure UI",
      skill: "Cesium",
      do: "Detect missing Cesium global / init errors and show an on-page error, not a silent black div.",
      why: "Blank pages hide CDN and key failures from both users and agents.",
    },
    needs_full_viewport: {
      theme: "Layout completeness",
      skill: "SDK JS get-started",
      do: "Style #map with height:100% / inset:0 / 100vh so the map actually fills the viewport.",
      why: "Zero-height maps are a classic incomplete Hello Map.",
    },
    map_on_error: {
      theme: "Production resilience",
      skill: "SDK JS events",
      do: "Attach map.on('error', …) (and prefer try/catch around async Cloud calls).",
      why: "Style/tile/key failures otherwise fail silently in demos.",
    },
    async_catch: {
      theme: "Async error handling",
      skill: "Geocoding / Elevation / Coordinates",
      do: "Wrap await geocoding/elevation/coordinates calls in try/catch or .catch; surface errors in the UI.",
      why: "Network and quota errors are expected; unhandled rejections are agent laziness.",
    },
    tiles_url_with_key: {
      theme: "Authenticated tile URLs",
      skill: "Tiles / Buildings / Outdoor / Contours",
      do: "Append ?key= (or key= + apiKey) on every api.maptiler.com/tiles/… URL.",
      why: "Vector tile JSON without a key 401s in the browser even when config.apiKey is set for styles.",
    },
    weather_time_or_animate: {
      theme: "Weather is more than addLayer",
      skill: "Weather module",
      do: "Add opacity, time, animation, or pickAt — not only WindLayer construction.",
      why: "Extreme weather challenges expect the agent to use the weather package surface, not a one-liner.",
    },
    helpers_point_cluster: {
      theme: "Prefer SDK helpers",
      skill: "Helpers (point / heatmap)",
      do: "Use helpers.addPoint({ cluster: true }) (or equivalent) instead of only hand-rolled cluster layers when the prompt asks for helpers.",
      why: "Skill steers agents toward helpers for clustering/heatmap correctness.",
    },
    helpers_heatmap: {
      theme: "Prefer SDK helpers",
      skill: "Helpers (heatmap)",
      do: "Call helpers.addHeatmap(map, { data, … }) rather than inventing heatmap paint from scratch unless required.",
      why: "Helpers encode MapTiler-recommended defaults.",
    },
    route_dense_samples: {
      theme: "Elevation sampling quality",
      skill: "Elevation API",
      do: "Densify the LineString (≥15 verts) or use fromLineString with sampling options — five vertices is not a profile.",
      why: "min/max/gain on a 5-point polyline is meaningless.",
    },
    geocode_places_marker: {
      theme: "Geocode UX completeness",
      skill: "Geocoding",
      do: "After forward geocode + flyTo, place a Marker (or setLngLat) on the hit.",
      why: "Search-without-marker looks unfinished and is easy for graders to require.",
    },
    geosplats_real_asset: {
      theme: "No stub assets",
      skill: "GeoSplats",
      do: "Use a real MapTiler splat model id / URL; never ship YOUR_MAPTILER_SPLAT_MODEL placeholders.",
      why: "Insane GeoSplats is a WebGPU integration test — stubs are automatic fails.",
    },
    no_stub_placeholder: {
      theme: "No TODO stubs",
      skill: "All tiers",
      do: "Remove TODO/FIXME/placeholder model strings before considering the challenge done.",
      why: "Commented or stubbed 'solutions' must not score as complete.",
    },
    needs_android_internet: {
      theme: "Android manifest completeness",
      skill: "Android SDK",
      do: "Include android.permission.INTERNET in the manifest snippet.",
      why: "Maps cannot load tiles without it; omitting it is a classic incomplete Android answer.",
    },
    needs_rn_maptiler: {
      theme: "Real React Native package",
      skill: "React Native",
      do: "Import from @maptiler/react-native (or documented MapTiler RN APIs) — do not invent NativeMapTilerTurbo modules.",
      why: "Hallucinated native modules are a top skill-failure mode.",
    },
    admin_upload_and_process: {
      theme: "Admin ingest is two steps",
      skill: "Admin / Service API",
      do: "Implement datasets/ingest (upload_url) AND a live /process call — not comments-only outlines.",
      why: "Commented fetch(.../process) is stripped by graders and fails.",
    },
    admin_live_fetch_process: {
      theme: "Live Admin process call",
      skill: "Admin / Service API",
      do: "Keep an executable fetch(.../process) in the script body (env token), not only in comments.",
      why: "Static graders ignore comments so agents cannot hide unfinished work there.",
    },
    readd_layers_in_style_load: {
      theme: "Survive setStyle",
      skill: "Styles / buildings / weather",
      do: "Re-add custom layers / weather inside map.on('style.load', …) after setStyle.",
      why: "Style switches wipe custom layers; Extreme prompts explicitly test this.",
    },
    cluster_and_unclustered_layers: {
      theme: "Complete cluster stack",
      skill: "GeoJSON clustering",
      do: "Add both has point_count cluster layers and an unclustered / !has point_count layer.",
      why: "Clusters without unclustered points are incomplete store locators.",
    },
    pinned_sdk_version: {
      theme: "Pin versions from the catalog",
      skill: "SDK JS",
      do: "Use the pinned CDN/package version from the challenge catalog (e.g. maptiler-sdk-js/v4.0.2).",
      why: "Floating latest breaks reproducibility of the scoreboard.",
    },
    no_legacy_style: {
      theme: "v4 styles only",
      skill: "Map styles",
      do: "Use MapStyle.* / *-v4 ids — never streets-v2 / outdoor-v2 / etc.",
      why: "Legacy style ids are an explicit skill anti-pattern.",
    },
    sdk_not_maplibre: {
      theme: "Prefer @maptiler/sdk",
      skill: "SDK vs MapLibre",
      do: "Import MapTiler SDK for MapTiler Cloud apps; do not dual-import bare maplibre-gl unless the challenge is Leaflet/Cesium/deck.",
      why: "SDK wraps session billing, helpers, and Cloud services.",
    },
  };

  const THEME_ORDER = [
    "Stop template paste",
    "API key hygiene",
    "Authenticated tile URLs",
    "Production resilience",
    "Async error handling",
    "Prefer SDK helpers",
    "Weather is more than addLayer",
    "Elevation sampling quality",
    "Geocode UX completeness",
    "Survive setStyle",
    "No stub assets",
    "No TODO stubs",
    "Real React Native package",
    "Admin ingest is two steps",
    "Live Admin process call",
    "Android manifest completeness",
    "Thin solutions",
    "Thin Extreme solutions",
    "Thin Insane / mobile sketches",
    "Layout completeness",
    "Complete cluster stack",
    "Pin versions from the catalog",
    "v4 styles only",
    "Prefer @maptiler/sdk",
  ];

  function buildFromChecks(checkResults, context) {
    const fails = (checkResults || []).filter((c) => !c.pass);
    return fails.map((f) => {
      const tip = ADVICE[f.id] || {
        theme: "Unmapped check",
        skill: "MapTiler skill",
        do: f.detail || ("Fix check: " + f.id),
        why: "Failed a scoreboard static check.",
      };
      return {
        checkId: f.id,
        detail: f.detail || "",
        weight: f.weight || 0,
        challengeId: context?.challengeId || null,
        tier: context?.tier || null,
        ...tip,
      };
    });
  }

  /** Aggregate latest run per challenge → ranked improvement themes. */
  function buildReport(runs) {
    const latest = {};
    for (const r of runs || []) {
      if (!r.challengeId) continue;
      if (!latest[r.challengeId] || (r.timestamp || "") > (latest[r.challengeId].timestamp || "")) {
        latest[r.challengeId] = r;
      }
    }
    const rows = Object.values(latest);
    const byTier = { core: [], extreme: [], insane: [] };
    const failFreq = {};
    const tips = [];

    for (const r of rows) {
      if (byTier[r.tier]) byTier[r.tier].push(r.pct);
      const built = buildFromChecks(r.checks, { challengeId: r.challengeId, tier: r.tier });
      for (const t of built) {
        failFreq[t.checkId] = (failFreq[t.checkId] || 0) + 1;
        tips.push(t);
      }
    }

    function avg(arr) {
      if (!arr.length) return null;
      return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
    }

    const themeMap = {};
    for (const t of tips) {
      if (!themeMap[t.theme]) {
        themeMap[t.theme] = {
          theme: t.theme,
          skill: t.skill,
          do: t.do,
          why: t.why,
          count: 0,
          challenges: new Set(),
          checks: new Set(),
        };
      }
      const g = themeMap[t.theme];
      g.count++;
      if (t.challengeId) g.challenges.add(t.challengeId);
      g.checks.add(t.checkId);
    }

    const themes = Object.values(themeMap)
      .map((g) => ({
        theme: g.theme,
        skill: g.skill,
        do: g.do,
        why: g.why,
        count: g.count,
        challenges: [...g.challenges].sort(),
        checks: [...g.checks].sort(),
      }))
      .sort((a, b) => {
        const ai = THEME_ORDER.indexOf(a.theme);
        const bi = THEME_ORDER.indexOf(b.theme);
        if (a.count !== b.count) return b.count - a.count;
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });

    const summary = {
      challengesGraded: rows.length,
      avgPct: avg(rows.map((r) => r.pct)),
      byTier: {
        core: avg(byTier.core),
        extreme: avg(byTier.extreme),
        insane: avg(byTier.insane),
      },
      letterCounts: rows.reduce((acc, r) => {
        acc[r.letter] = (acc[r.letter] || 0) + 1;
        return acc;
      }, {}),
      topFails: Object.entries(failFreq)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, count, ...(ADVICE[id] || {}) })),
      themes,
      perChallenge: rows
        .map((r) => ({
          id: r.challengeId,
          tier: r.tier,
          pct: r.pct,
          letter: r.letter,
          fails: (r.checks || []).filter((c) => !c.pass).map((c) => c.id),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };

    return summary;
  }

  function toMarkdown(report) {
    const lines = [];
    lines.push("# MapTiler Agent — Improvement Report");
    lines.push("");
    lines.push(`Challenges graded: **${report.challengesGraded}** · Combined avg: **${report.avgPct ?? "—"}%**`);
    lines.push(
      `By tier — Core **${report.byTier.core ?? "—"}%** · Extreme **${report.byTier.extreme ?? "—"}%** · Insane **${report.byTier.insane ?? "—"}%**`
    );
    lines.push("");
    lines.push("## How the agent should improve");
    lines.push("");
    report.themes.forEach((t, i) => {
      lines.push(`### ${i + 1}. ${t.theme} (${t.count}×)`);
      lines.push(`- **Skill area:** ${t.skill}`);
      lines.push(`- **Do:** ${t.do}`);
      lines.push(`- **Why:** ${t.why}`);
      if (t.challenges.length) lines.push(`- **Seen on:** ${t.challenges.join(", ")}`);
      lines.push("");
    });
    lines.push("## Per-challenge scores");
    lines.push("");
    lines.push("| ID | Tier | Score | Letter | Failed checks |");
    lines.push("|----|------|------:|:------:|---------------|");
    for (const r of report.perChallenge) {
      lines.push(`| ${r.id} | ${r.tier} | ${r.pct}% | ${r.letter} | ${r.fails.join(", ") || "—"} |`);
    }
    lines.push("");
    lines.push("## Prompt / skill habits that would raise scores");
    lines.push("");
    lines.push("1. Always `@` the MapTiler skill and follow pinned versions from the challenge catalog.");
    lines.push("2. After drafting, self-check: key guard, `map.on('error')`, try/catch on Cloud awaits, `?key=` on tiles URLs.");
    lines.push("3. For Extreme: re-add layers on `style.load`; weather needs controls beyond `addLayer`.");
    lines.push("4. For Insane: no stubs, real package names, live Admin `/process`, INTERNET permission on Android.");
    lines.push("5. Delete unused cookie-cutter CSS; do not clone one HTML shell across all challenges.");
    lines.push("");
    return lines.join("\n");
  }

  global.MapTilerImprovement = { ADVICE, buildFromChecks, buildReport, toMarkdown };
})(typeof window !== "undefined" ? window : globalThis);
