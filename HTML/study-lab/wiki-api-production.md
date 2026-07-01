# Global Ski Atlas — wiki API + CloudFront production map

Read-only reference for **Night 26** and portfolio docs. Source of truth in AWS may drift — refresh with `aws cloudfront get-distribution-config` when debugging.

---

## Traffic path

```
Browser → globalskiatlas.com (Route 53 → CloudFront)
              │
              ├── Default (*)           → S3 static Next.js export
              │                           Cache policy: CachingOptimized
              │                           CloudFront Function: redirect-to-canonical
              │
              ├── api/wiki*             → API Gateway (WikiApi) → Lambda wiki-api
              │                           Methods: GET/HEAD/OPTIONS + mutating verbs
              │                           Cache policy: CachingDisabled (4135ea2d…)
              │                           Cognito JWT on writes
              │
              └── api/iceberg-stats     → API Gateway → Lambda stats (may 404 — legacy behavior in cf-dist-config)
                                          Methods: GET/HEAD/OPTIONS only
                                          Cache policy: CachingDisabled (4135ea2d…)
```

**Exam lens:** Three origins on one distribution; **path-based cache behaviors** choose origin + cache rules. Default behavior does not apply to `/api/*` when a more specific behavior matches.

---

## Origins (from `cf-dist-config.json`)

| Origin ID | Domain | Role |
|-----------|--------|------|
| `globalskiatlas.com.s3.us-east-1.amazonaws.com` | S3 | Static site |
| `WikiApi` | `w2mmi37kb9.execute-api.us-east-1.amazonaws.com` | Wiki CRUD + reads |
| `8mxfupvy54.execute-api.us-east-1.amazonaws.com` | API GW | Iceberg stats JSON |

All API origins use **CustomOriginConfig** with `OriginProtocolPolicy: https-only`.

---

## Auth boundary

| Path | Anonymous | Authenticated |
|------|-----------|---------------|
| `GET /api/wiki/pages` (list/read) | Allowed | — |
| `POST/PUT/PATCH/DELETE /api/wiki*` | Blocked at Lambda | Cognito JWT in `Authorization` |

**CloudFront caching trap:** If you cache `GET /api/wiki/pages` at the edge, **do not** include `Authorization` in the cache key unless every cached variant is safe for anonymous viewers. Mutating methods are not in `CachedMethods` — only GET/HEAD can be edge-cached.

---

## Cache-Control (origin responsibility)

CloudFront honors origin **`Cache-Control`** and **`Expires`** when the **cache policy** allows caching. Tonight’s prod behaviors use **CachingDisabled** — every request goes to API Gateway regardless of origin headers.

To enable edge hits on read-heavy wiki GETs:

1. Lambda returns e.g. `Cache-Control: public, max-age=60` on anonymous page reads.
2. CloudFront behavior switches from CachingDisabled to a **custom cache policy** (TTL bounds + which headers/query strings are in the cache key).
3. Invalidate or short TTL when content changes (`POST` publish should not be cached).

**Contrast Night 23:** ElastiCache caches **database rows inside the VPC**. CloudFront caches **HTTP responses at the edge** — different layer, both reduce origin load.

---

## API Gateway throttling (exam)

| Layer | What it limits | GSA note |
|-------|----------------|----------|
| **Account** | Regional steady + burst across all APIs | Shared ceiling |
| **Stage** | `defaultRouteSettings` or stage settings on REST; HTTP API has `defaultRouteSettings` | Prod wiki stage — check console |
| **Usage plan + API key** | Per-key quota and throttle | Partner/mobile clients |
| **WAF rate-based rule** | HTTP flood at edge | Night 4 pattern (torn down) |

**429 Too Many Requests** when throttle exceeded. **Exam:** Usage plan throttling is **per API key**; stage throttling applies to **all** callers unless usage plan overrides.

---

## CloudWatch metrics to watch

| Service | Namespace | Useful metrics |
|---------|-----------|----------------|
| CloudFront | `AWS/CloudFront` | `CacheHitRate`, `Requests`, `4xxErrorRate`, `OriginLatency` |
| API Gateway | `AWS/ApiGateway` | `Count`, `Latency`, `4XXError`, `5XXError` |
| Lambda | `AWS/Lambda` | `Duration`, `ConcurrentExecutions`, `Throttles` |

CloudFront metrics are viewed in **us-east-1** with `Region = Global`.

---

## Night 26 lab artifacts (safe)

| Resource | Purpose | Touches prod? |
|----------|---------|---------------|
| `saa-study-night26-api-perf` dashboard | Visualize CF + API GW metrics | Read-only metrics |
| `saa-study-night26-wiki-get` cache policy | Study policy for exam TTL/header rules | Created only; attach optional |
| `saa-study-night26-throttle` REST API | Throttle demo (burst/rate + 429) | Isolated mock API |
| `-ApplyWikiCache` flag | Attach study policy to `api/wiki*` only | **Optional** — changes one behavior |
| Cache probe | `GET /api/wiki/pages` | **200** + `X-Cache: Miss` with CachingDisabled |

**Does not modify** wiki Lambda code, DynamoDB, or default S3 behavior unless you explicitly pass `-ApplyIcebergCache`.

---

## Related files

- `study-lab/cf-dist-config.json` — exported distribution snapshot
- `study-lab/night-26-cloudfront-api-caching.md` — tonight’s guide
- `study-lab/week1-security-architecture.md` — Site A diagram
- `study-lab/night-4-quiz.json` — WAF on same distribution (historical)
