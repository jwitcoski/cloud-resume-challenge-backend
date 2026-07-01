# Night 26 — CloudFront + API performance (cache behaviors, throttling, dashboard)

~2 hr. **Very low AWS spend** — CloudWatch dashboard (free tier) + optional isolated throttle-demo API. **Read-only on prod by default** — observes `globalskiatlas.com` CloudFront + wiki API Gateway; optional `-ApplyWikiCache` changes **one** cache behavior (`api/wiki*` only).

---

## Plain language first

### What is CloudFront doing for APIs?

**CloudFront** sits in front of your origins. For static files it caches aggressively at **edge locations** worldwide. For **`/api/*`** you choose per **cache behavior**:

| Behavior | Origin | Tonight’s prod setting |
|----------|--------|------------------------|
| Default `*` | S3 static site | **Cache** (CachingOptimized) |
| `api/wiki*` | Wiki API Gateway + Lambda | **Do not cache** (CachingDisabled) |
| `api/iceberg-stats` | Stats API Gateway + Lambda | **Do not cache** (CachingDisabled) — *may 404 in prod; behavior still in `cf-dist-config.json`* |

**Cache probe URL (lab):** `GET https://globalskiatlas.com/api/wiki/pages` → **200** with `X-Cache: Miss` while CachingDisabled.

**Analogy:** The resort’s **front desk brochure rack** (CloudFront) can hand out the same trail map (static HTML) all day. **Live lift status** (API JSON) needs a policy: either “never photocopy — always radio the mountain” (CachingDisabled) or “photocopy for 60 seconds if the mountain says that’s OK” (`Cache-Control` + custom cache policy).

### Cache hit vs origin load

```
Viewer GET https://globalskiatlas.com/api/wiki/pages
        │
        ▼
   CloudFront edge
        │
   ┌────┴────┐
   │ Cached? │── HIT ──► Return stored response (no API GW / Lambda)
   └────┬────┘
     MISS│
        ▼
   API Gateway → Lambda → response + Cache-Control headers
        │
        ▼
   Edge may store response (if policy + headers allow)
```

**Response headers to know:**

| Header | Meaning |
|--------|---------|
| `X-Cache: Hit from cloudfront` | Served from edge cache |
| `X-Cache: Miss from cloudfront` | Fetched from origin this time |
| `Age: N` | Seconds object has been in edge cache |

**Exam trap:** CachingDisabled = **always origin**. Switching to CachingOptimized without origin `Cache-Control` still may not cache dynamic APIs the way you expect — **cache policy + origin headers + cache key** (query strings, headers) all matter.

### Cache policies vs legacy forwarded values

Modern CloudFront uses **managed or custom cache policies** (not legacy `ForwardedValues`).

| Policy knob | Exam question it answers |
|-------------|--------------------------|
| **TTL** (min/default/max) | How long edge keeps object if origin is silent |
| **Headers in cache key** | Same URL different `Authorization` → different cache entries |
| **Query strings in cache key** | `?page=2` vs `?page=3` cached separately |
| **Cookies in cache key** | Logged-in vs anonymous variants |

**GSA wiki trap:** Caching `GET /api/wiki/pages` with `Authorization` in the cache key multiplies entries; caching **without** it risks serving one user’s draft to another — **anonymous public reads only** are safe edge-cache candidates.

### API Gateway throttling layers

| Layer | Scope | Symptom when exceeded |
|-------|-------|------------------------|
| **Account** | All APIs in Region | 429 across APIs |
| **Stage / route settings** | One API stage | 429 for that stage’s traffic |
| **Usage plan + API key** | Clients presenting key | 429 per key quota |
| **Lambda concurrency** | Function account limit | 429/503 from integration |

**Burst vs rate:** API Gateway allows **short bursts** above steady **rate** (token bucket). Exam scenarios often pair **usage plans** with **partner APIs**; **stage limits** protect your own backend from overload.

### CloudFront vs API Gateway caching vs ElastiCache (Night 23)

| Layer | Caches | GSA |
|-------|--------|-----|
| **CloudFront** | HTTP responses at edge | Static HTML, optional GET APIs |
| **API Gateway cache** | API responses at GW (exam awareness) | Rare on HTTP APIs; know REST stage cache |
| **ElastiCache** | App objects in VPC | Aurora `resort_stats` rows |

**Pick CloudFront** when global viewers hit **cacheable GETs**. **Pick ElastiCache** when Lambda in VPC needs **sub-ms** DB query cache. They stack: CloudFront → API GW → Lambda → ElastiCache → Aurora.

---

## Block 1 (~30 min) — Behaviors + throttling on GSA

### Production map (read `wiki-api-production.md`)

```
                    ┌──────────────────────────────────────────┐
                    │  CloudFront — globalskiatlas.com         │
                    │  PriceClass_100 · HTTP/2 · ACM cert      │
                    └──────────────────────────────────────────┘
                          │              │                │
              default *   │   api/wiki*  │  api/iceberg-stats
                          ▼              ▼                ▼
                        S3          WikiApi GW        Stats GW
                     (static)    → wiki Lambda     → stats Lambda
                                  → DynamoDB           → S3 Iceberg
                                  → Cognito JWT
```

### Decision tree (memorize)

```
Need to reduce load on read-heavy HTTP API?
│
├─ Global users, cacheable GET, public or uniform response?
│     → CloudFront cache behavior + origin Cache-Control
│
├─ Same Region, Lambda needs DB row cache in VPC?
│     → ElastiCache cache-aside (Night 23)
│
├─ Protect backend from traffic spike / bill shock?
│     → API Gateway stage throttle + usage plans; WAF rate rules at edge
│
├─ Per-client API quota (partner, mobile app key)?
│     → Usage plan + API key
│
└─ Personalized response per Authorization header?
      → Do NOT cache at CloudFront without header in cache key — often skip edge cache
```

### Exam traps

- **POST/PUT/DELETE** are not in `CachedMethods` — only **GET/HEAD** (and OPTIONS for CORS) edge-cache.
- **CachingDisabled** on `api/wiki*` is correct while writes use Cognito — enable edge cache only for **anonymous GET** paths with explicit TTL.
- **CloudFront invalidation** costs money at scale — prefer **short TTL** for frequently updated JSON.
- **API Gateway HTTP API** vs **REST API** — throttling and caching features differ; GSA SAM uses **HTTP API** (know REST stage cache for exam).
- **Origin timeout** — `OriginReadTimeout` 30 s on API GW; slow Lambda → 504 at edge, not infinite wait.

---

## Block 2 (~60 min) — Lab: dashboard + cache probe + throttle demo

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| GSA CloudFront distribution | `aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items, 'globalskiatlas.com')].Id"` |
| Wiki API live | `curl -sI https://globalskiatlas.com/api/wiki/pages` → **200** + `X-Cache: Miss` |
| AWS CLI | `aws sts get-caller-identity` |

**Spend note:** Dashboard + cache policy metadata ≈ **$0**. Throttle demo API is pennies if left up — **teardown when done**.

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| CloudWatch dashboard | `saa-study-night26-api-perf` | CF `CacheHitRate`, API GW `Count`/`Latency` |
| Custom cache policy | `saa-study-night26-wiki-get` | Study TTL + `Cache-Control` respect (not attached by default) |
| Throttle demo API | `saa-study-night26-throttle` | Mock GET + stage burst=5 rate=2 → 429 drill |
| Result file | `night-26-cloudfront-result.json` | IDs for teardown + optional cache apply |

**Production safety:** Default run **does not** change `globalskiatlas.com` distribution. `-ApplyWikiCache` updates **only** the `api/wiki*` behavior to use the study cache policy.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-26-lab-cloudfront-setup.ps1
.\HTML\study-lab\night-26-lab-cloudfront-setup.ps1 -TestCache -CreateThrottleDemo
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-26-lab-cloudfront-setup.sh
bash HTML/study-lab/night-26-lab-cloudfront-setup.sh --test-cache --create-throttle-demo
```

| Flag | What happens |
|------|----------------|
| `-TestCache` / `--test-cache` | Two `curl -sI` to `api/wiki/pages`; prints `X-Cache` lines |
| `-CreateThrottleDemo` / `--create-throttle-demo` | Deploy mock REST API + usage plan for 429 drill |
| `-ApplyWikiCache` / `--apply-wiki-cache` | Attach study cache policy to `api/wiki*` behavior (**prod change**) |

CloudFront distribution updates take **5–15 min** to deploy when `-ApplyWikiCache` is used.

### End-to-end validation

1. **Result file:** `night-26-cloudfront-result.json` — distribution ID, dashboard name, cache policy ID, optional demo API URL.

2. **CloudWatch:** Open `saa-study-night26-api-perf` → confirm CloudFront and API Gateway widgets (may need traffic or 5 min for first points).

3. **Cache probe (`-TestCache`):**
   ```powershell
   curl.exe -sI https://globalskiatlas.com/api/wiki/pages | findstr /i x-cache age
   ```
   With **CachingDisabled** on `api/wiki*`: expect **Miss** on every request (origin still hit). After `-ApplyWikiCache` + origin `Cache-Control`: second request may show **Hit**.

4. **Throttle demo (`-CreateThrottleDemo`):** Script prints demo URL + API key. Run rapid GETs until **429**:
   ```powershell
   1..10 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code} " -H "x-api-key: YOUR_KEY" "DEMO_URL" }
   ```

5. **Console reading:** CloudFront → your distribution → **Behaviors** tab → compare Default vs `api/wiki*` vs `api/iceberg-stats` cache policies.

**Troubleshoot in this order:**

1. No GSA distribution? Wrong account — distribution must include `globalskiatlas.com` alias.
2. Dashboard empty? Generate traffic (`curl` the site); wait 5 min — CloudFront metrics lag slightly.
3. Always `X-Cache: Miss`? **Expected** with CachingDisabled on `api/wiki*` — not an error. Use `-ApplyWikiCache` + origin headers to experiment with Hits.
4. `X-Cache: Error from cloudfront`? Wrong path (e.g. `/api/iceberg-stats` may 404) — probe `api/wiki/pages` instead.
5. Throttle demo 200 every time? Confirm `x-api-key` header and usage plan association on stage.

### Compare layers (write in notes)

| Question | CloudFront edge | API GW throttle | Lambda |
|----------|-----------------|-----------------|--------|
| Cuts DynamoDB reads? | Only if response cached at edge | No | Yes — when request reaches function |
| Stops traffic flood? | WAF / Shield (Night 4) | Stage + usage plan | Concurrency limit |
| Global latency win? | **Yes** — edge POP | Regional | Per invoke |

### Reference files

- `night-26-lab-cloudfront-setup.ps1` / `.sh` — dashboard + cache policy + optional demo
- `night-26-cloudfront-result.json` — IDs for teardown
- `wiki-api-production.md` — prod origin/behavior map
- `cf-dist-config.json` — exported distribution snapshot

### Teardown

```powershell
.\HTML\study-lab\night-26-lab-cloudfront-teardown.ps1
```

```bash
bash HTML/study-lab/night-26-lab-cloudfront-teardown.sh
```

Deletes dashboard, study cache policy, throttle demo API, and **reverts** `api/wiki*` to CachingDisabled if you applied the study policy. **Does not** delete CloudFront distribution, S3, wiki Lambda, or API Gateway prod APIs.

---

## Block 3 (~30 min) — Quiz + console reading

**File:** `night-26-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=26`.

**Console reading (5 min):**

- CloudFront → **Policies** → **Cache** → open `saa-study-night26-wiki-get` (if created) → note TTL bounds and **Cache key** settings.
- API Gateway → wiki HTTP API → **Stages** → **Metrics** / throttle settings (if exposed).
- CloudWatch → `saa-study-night26-api-perf` → hover a spike — correlate with deploy or traffic burst.

---

## Week 4 map (continued)

| Topic | Night |
|-------|-------|
| ElastiCache Redis cache-aside | 23 |
| Athena on S3 / Iceberg | 24 |
| Route 53 routing policies | 25 |
| **CloudFront API caching + throttling** | **Tonight (26)** |
| EC2 + EBS + Spot | 27 |

---

## 5 flashcards (write tonight)

1. **CachingDisabled on api/wiki*** — Why is this the safe default while Cognito protects writes?  
   *(Avoid edge-caching authenticated or personalized GET variants; mutating methods must reach origin.)*

2. **X-Cache: Hit** — What did not run on a cache hit?  
   *(Origin fetch — API Gateway and Lambda were skipped for that GET/HEAD.)*

3. **Usage plan vs stage throttle** — One-line difference?  
   *(Usage plan = per API key quota; stage throttle = all traffic on that stage unless plan overrides.)*

4. **CloudFront vs ElastiCache** — Which caches HTTP at the edge for global users?  
   *(CloudFront — ElastiCache is in-VPC near compute.)*

5. **Origin Cache-Control** — Who must set `max-age` for CloudFront to cache API JSON?  
   *(Origin/Lambda response — cache policy alone does not make stale data fresh.)*

---

## Night 27 preview

**EC2 + EBS + Spot** — volume types (gp3/io2/st1/sc1), when Spot Fargate/EC2 beats on-demand for the Iceland pipeline, cost table from backend deployment docs.
