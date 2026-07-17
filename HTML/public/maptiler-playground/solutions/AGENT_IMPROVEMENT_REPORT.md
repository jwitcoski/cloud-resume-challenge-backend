# MapTiler Agent — Improvement Report

Challenges graded: **26** · Combined avg: **84%**
By tier — Core **96%** · Extreme **77%** · Insane **75%**

## How the agent should improve

### 1. Stop template paste (7×)
- **Skill area:** General / code hygiene
- **Do:** Generate only CSS used by this challenge. Do not copy a shared .split pane stylesheet into every file.
- **Why:** Unused boilerplate pads file size and signals the agent is cloning a shell instead of solving the prompt.
- **Seen on:** X1, X2, X3, X4, X5, X6, X7

### 2. Thin Insane / mobile sketches (4×)
- **Skill area:** Native + Cesium + Admin
- **Do:** Include real package imports, style URL wiring, permissions/manifest bits, and non-stub asset IDs — not a 20-line outline.
- **Why:** Insane tier grades whether the agent can leave the web SDK comfort zone with usable code.
- **Seen on:** I4, I5, I6, I7

### 3. API key hygiene (3×)
- **Skill area:** Authentication
- **Do:** Guard missing window.MAPTILER_API_KEY / env keys before constructing the map; throw or show a clear UI error.
- **Why:** Skill and Cloud docs assume keys are configured; silent empty maps hide setup failures.
- **Seen on:** C1, I1, X8

### 4. Production resilience (3×)
- **Skill area:** SDK JS events
- **Do:** Attach map.on('error', …) (and prefer try/catch around async Cloud calls).
- **Why:** Style/tile/key failures otherwise fail silently in demos.
- **Seen on:** I2, X1, X2

### 5. Async error handling (3×)
- **Skill area:** Geocoding / Elevation / Coordinates
- **Do:** Wrap await geocoding/elevation/coordinates calls in try/catch or .catch; surface errors in the UI.
- **Why:** Network and quota errors are expected; unhandled rejections are agent laziness.
- **Seen on:** X4, X5, X7

### 6. Thin Extreme solutions (3×)
- **Skill area:** Extreme stacking
- **Do:** Extreme challenges need layered behavior (reload hooks, UI, error paths), not a minimal happy-path Map.
- **Why:** After CSS is stripped, thin Extreme files still fail substance.
- **Seen on:** X6, X7, X8

### 7. Authenticated tile URLs (2×)
- **Skill area:** Tiles / Buildings / Outdoor / Contours
- **Do:** Append ?key= (or key= + apiKey) on every api.maptiler.com/tiles/… URL.
- **Why:** Vector tile JSON without a key 401s in the browser even when config.apiKey is set for styles.
- **Seen on:** X2, X6

### 8. Thin solutions (2×)
- **Skill area:** SDK JS basics
- **Do:** Ship a complete page: full-viewport map CSS, key assignment, Map constructor, and at least one real interaction or guard.
- **Why:** Keyword-only snippets pass soft graders but fail substance thresholds.
- **Seen on:** C1, C2

### 9. Layout completeness (2×)
- **Skill area:** SDK JS get-started
- **Do:** Style #map with height:100% / inset:0 / 100vh so the map actually fills the viewport.
- **Why:** Zero-height maps are a classic incomplete Hello Map.
- **Seen on:** C1, C2

### 10. Prefer SDK helpers (1×)
- **Skill area:** Helpers (point / heatmap)
- **Do:** Use helpers.addPoint({ cluster: true }) (or equivalent) instead of only hand-rolled cluster layers when the prompt asks for helpers.
- **Why:** Skill steers agents toward helpers for clustering/heatmap correctness.
- **Seen on:** X3

### 11. Weather is more than addLayer (1×)
- **Skill area:** Weather module
- **Do:** Add opacity, time, animation, or pickAt — not only WindLayer construction.
- **Why:** Extreme weather challenges expect the agent to use the weather package surface, not a one-liner.
- **Seen on:** X1

### 12. Elevation sampling quality (1×)
- **Skill area:** Elevation API
- **Do:** Densify the LineString (≥15 verts) or use fromLineString with sampling options — five vertices is not a profile.
- **Why:** min/max/gain on a 5-point polyline is meaningless.
- **Seen on:** X4

### 13. Geocode UX completeness (1×)
- **Skill area:** Geocoding
- **Do:** After forward geocode + flyTo, place a Marker (or setLngLat) on the hit.
- **Why:** Search-without-marker looks unfinished and is easy for graders to require.
- **Seen on:** X5

### 14. No stub assets (1×)
- **Skill area:** GeoSplats
- **Do:** Use a real MapTiler splat model id / URL; never ship YOUR_MAPTILER_SPLAT_MODEL placeholders.
- **Why:** Insane GeoSplats is a WebGPU integration test — stubs are automatic fails.
- **Seen on:** I3

### 15. No TODO stubs (1×)
- **Skill area:** All tiers
- **Do:** Remove TODO/FIXME/placeholder model strings before considering the challenge done.
- **Why:** Commented or stubbed 'solutions' must not score as complete.
- **Seen on:** I3

### 16. Real React Native package (1×)
- **Skill area:** React Native
- **Do:** Import from @maptiler/react-native (or documented MapTiler RN APIs) — do not invent NativeMapTilerTurbo modules.
- **Why:** Hallucinated native modules are a top skill-failure mode.
- **Seen on:** I7

### 17. Admin ingest is two steps (1×)
- **Skill area:** Admin / Service API
- **Do:** Implement datasets/ingest (upload_url) AND a live /process call — not comments-only outlines.
- **Why:** Commented fetch(.../process) is stripped by graders and fails.
- **Seen on:** I8

### 18. Live Admin process call (1×)
- **Skill area:** Admin / Service API
- **Do:** Keep an executable fetch(.../process) in the script body (env token), not only in comments.
- **Why:** Static graders ignore comments so agents cannot hide unfinished work there.
- **Seen on:** I8

### 19. Android manifest completeness (1×)
- **Skill area:** Android SDK
- **Do:** Include android.permission.INTERNET in the manifest snippet.
- **Why:** Maps cannot load tiles without it; omitting it is a classic incomplete Android answer.
- **Seen on:** I5

## Per-challenge scores

| ID | Tier | Score | Letter | Failed checks |
|----|------|------:|:------:|---------------|
| C1 | core | 79% | C | needs_full_viewport, needs_validate_key, min_substance_web |
| C10 | core | 100% | A | — |
| C2 | core | 84% | C | needs_full_viewport, min_substance_web |
| C3 | core | 100% | A | — |
| C4 | core | 100% | A | — |
| C5 | core | 100% | A | — |
| C6 | core | 100% | A | — |
| C7 | core | 100% | A | — |
| C8 | core | 100% | A | — |
| C9 | core | 100% | A | — |
| I1 | insane | 92% | B | needs_validate_key |
| I2 | insane | 88% | B | map_on_error |
| I3 | insane | 62% | F | geosplats_real_asset, no_stub_placeholder |
| I4 | insane | 87% | C | min_substance_insane |
| I5 | insane | 70% | D | needs_android_internet, min_substance_insane |
| I6 | insane | 80% | C | min_substance_insane |
| I7 | insane | 48% | F | needs_rn_maptiler, min_substance_insane |
| I8 | insane | 74% | D | admin_upload_and_process, admin_live_fetch_process |
| X1 | extreme | 86% | C | weather_time_or_animate, map_on_error, no_cookiecutter_split_css |
| X2 | extreme | 82% | C | tiles_url_with_key, map_on_error, no_cookiecutter_split_css |
| X3 | extreme | 85% | C | helpers_point_cluster, no_cookiecutter_split_css |
| X4 | extreme | 72% | D | route_dense_samples, async_catch, no_cookiecutter_split_css |
| X5 | extreme | 75% | D | geocode_places_marker, async_catch, no_cookiecutter_split_css |
| X6 | extreme | 66% | F | tiles_url_with_key, no_cookiecutter_split_css, min_substance_extreme |
| X7 | extreme | 69% | D | async_catch, no_cookiecutter_split_css, min_substance_extreme |
| X8 | extreme | 78% | C | needs_validate_key, min_substance_extreme |

## Prompt / skill habits that would raise scores

1. Always `@` the MapTiler skill and follow pinned versions from the challenge catalog.
2. After drafting, self-check: key guard, `map.on('error')`, try/catch on Cloud awaits, `?key=` on tiles URLs.
3. For Extreme: re-add layers on `style.load`; weather needs controls beyond `addLayer`.
4. For Insane: no stubs, real package names, live Admin `/process`, INTERNET permission on Android.
5. Delete unused cookie-cutter CSS; do not clone one HTML shell across all challenges.
