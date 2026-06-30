# Night 23 — Lab 3A: ElastiCache (Redis) cache-aside in front of Aurora

~2 hr. **Low–moderate AWS spend** — single-node `cache.t4g.micro` Redis in Night 9 private subnets + VPC Lambda reader. Night 9 VPC and Night 16 Aurora (with `resort_stats` seed row) **must** be up.

---

## Plain language first

### What is ElastiCache?

**ElastiCache** is AWS’s managed **in-memory cache** — data lives in **RAM**, not on disk.

Your app checks the cache **before** hitting the database. A cache **hit** returns in milliseconds. A **miss** reads Aurora, stores the result in Redis with a **TTL** (time to live), and returns.

**Analogy:** A host’s **notepad by the phone** with today’s specials. Repeat callers get an instant answer. New questions get looked up in the full menu (Aurora), then scribbled on the notepad for the next caller.

**Not the source of truth.** If Redis restarts, data is gone — Aurora still has the real rows.

### Redis vs Memcached (exam table)

| | **Redis** | **Memcached** |
|--|-----------|-----------------|
| **Data structures** | Strings, hashes, lists, sets, sorted sets | Simple string key-value only |
| **Persistence** | Optional snapshots / AOF (awareness) | Pure cache — no persistence story |
| **Multi-AZ failover** | Replication groups with automatic failover | No native failover — client handles |
| **Typical use** | Sessions, leaderboards, pub/sub, complex caching | Simple object cache, horizontal scale-out |
| **GSA tonight** | **Redis** — JSON blob per `resort_id` with TTL | Would work for dumb key-value but fewer features |

**Exam pick Redis when:** sessions, sorted sets, persistence option, or replication group failover.  
**Pick Memcached when:** simplest horizontal cache, multithreaded throughput, no advanced types.

### Cache-aside (lazy loading) — tonight’s pattern

```
Lambda GET resort_stats(IS-001)
        │
        ▼
   Redis GET resort_stats:IS-001
        │
   ┌────┴────┐
   │ HIT?    │
   └────┬────┘
     yes│      no
        │       └──► SELECT … FROM resort_stats (Aurora)
        │                    │
        │                    └── SETEX key TTL json  (populate cache)
        ▼
   Return JSON + cache_hit flag
```

| Pattern | Who writes cache? | Exam note |
|---------|-------------------|-----------|
| **Cache-aside** (tonight) | App on miss | Most common; app owns invalidation |
| **Read-through** | Cache layer pulls from DB | App only talks to cache |
| **Write-through** | Every DB write also writes cache | Stronger consistency, more write latency |
| **Write-behind** | Cache batches async writes to DB | Throughput; consistency risk |

**Invalidation after Night 17 writes:** Stats uploader upserts Aurora but does **not** update Redis tonight. Cached row may be stale until **TTL expires** (300 s in lab) or you `DEL` the key. Production would delete/invalidate on write.

### ElastiCache vs CloudFront vs DAX

| Layer | Caches what? | GSA example |
|-------|--------------|-------------|
| **CloudFront** | HTTP responses at edge | Static wiki HTML, `/api/*` if cacheable |
| **ElastiCache** | App objects / query results near compute | `resort_stats` row JSON in VPC |
| **DAX** | DynamoDB item reads | Wiki `viewCount` hot keys — not tonight |

**Exam trap:** CloudFront does **not** replace a database cache inside your VPC. ElastiCache does **not** cache S3 objects at the edge.

### Lambda-in-VPC tradeoff (Nights 17 + 23)

| Benefit | Cost |
|---------|------|
| Reach **private** Aurora and **private** Redis | **ENI** attach on cold start (15–45 s first invoke) |
| Same `lambda-stats-sg` pattern as Night 17 | NAT charges if Redis/Aurora path misconfigured |
| Sub-ms cache hits after warm-up | Two network hops (Lambda → Redis → Aurora on miss) |

**Contrast Night 18:** DynamoDB + stream Lambda **without** VPC — no ENI delay, but you cannot reach private ElastiCache or Aurora by private IP.

---

## Block 1 (~30 min) — Redis use cases + architecture sketch

### Extended GSA read path (study lab)

```
Internet (future ALB)
        │
        ▼
  saa-study-gsa-cache-reader  (Lambda, lambda-stats-sg, private subnets)
        │
        ├──► saa-study-gsa-redis  (ElastiCache, redis-sg, :6379)
        │         cache hit → return
        │
        └──► saa-study-gsa-aurora writer :5432  (on miss only)
                  resort_stats table (Night 16)

Parallel write path (unchanged from Night 17):
  SQS → saa-study-gsa-stats-uploader → Aurora UPSERT
  (does not invalidate Redis in this lab — TTL only)
```

### Security group wiring (draw this)

| SG | Inbound | Outbound |
|----|---------|----------|
| **redis-sg** | TCP **6379** from **lambda-stats-sg** | (default egress) |
| **lambda-stats-sg** | none (caller only) | TCP 6379 to redis-sg; TCP 5432 to aurora-sg |
| **aurora-sg** | TCP **5432** from **lambda-stats-sg** | (already from Night 16) |

**Exam trap:** ElastiCache must sit in **private subnets** with an **subnet group** — not public subnets with a public IP.

### Decision tree (memorize)

```
Need to reduce repeated reads on Aurora/RDS?
│
├─ Data is simple key-value, multithreaded scale-out, no failover?
│     → ElastiCache Memcached
│
├─ Need sessions, sorted sets, replication failover, or richer types?
│     → ElastiCache Redis (tonight)
│
├─ Need to cache DynamoDB reads specifically?
│     → DAX (not ElastiCache)
│
└─ Need to cache HTTP at the edge globally?
      → CloudFront (Night 26)
```

### Exam traps

- **Cache ≠ database** — plan for eviction, restart, and TTL staleness.
- **Redis replication group** — Multi-AZ with automatic failover; single-node cluster (tonight) is cheaper study deploy.
- **Auth** — production Redis often uses **AUTH token** + in-transit encryption; lab skips for simplicity.
- **Invalidation** — cache-aside means **your app** must delete/update keys on writes or accept stale reads until TTL.

---

## Block 2 (~60 min) — Lab: Redis + cache-aside Lambda

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| Night 9 VPC | `night-9-vpc-ids.json` exists |
| Night 16 Aurora + `resort_stats` | `aws rds describe-db-clusters --db-cluster-identifier saa-study-gsa-aurora` → `available` |
| AWS CLI + Python 3 | `aws sts get-caller-identity` ; `python --version` |

**Spend note:** `cache.t4g.micro` bills while running (~$0.02/hr). **Teardown when done.**

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| Cache subnet group | `saa-study-gsa-redis-subnets` | Private subnets from Night 9 |
| Security group | `saa-study-gsa-redis-sg` | Redis :6379 from lambda-stats-sg |
| ElastiCache cluster | `saa-study-gsa-redis` | Single-node Redis 7.x |
| IAM role | `saa-study-gsa-cache-reader-role` | VPC ENI + Secrets Manager + logs |
| Lambda | `saa-study-gsa-cache-reader` | Cache-aside GET for `resort_stats` |

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-23-lab-elasticache-setup.ps1
.\HTML\study-lab\night-23-lab-elasticache-setup.ps1 -BenchLatency
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-23-lab-elasticache-setup.sh
bash HTML/study-lab/night-23-lab-elasticache-setup.sh --bench-latency
```

| Flag | What happens |
|------|----------------|
| `-BenchLatency` / `--bench-latency` | Invoke with `action=bench` — cold miss (Aurora) then warm hit (Redis) |
| `-TestInvoke` / `--test-invoke` | Single GET for `IS-001` without clearing cache |

**First invoke** may take **15–45 s** (VPC ENI cold start). Redis cluster creation takes **5–10 min**.

### End-to-end validation

1. **Redis available:**  
   `aws elasticache describe-cache-clusters --cache-cluster-id saa-study-gsa-redis --show-cache-node-info --region us-east-1 --query 'CacheClusters[0].CacheClusterStatus'`  
   → `available`

2. **Bench output** (after `-BenchLatency`):  
   - `cold.cache_hit` = `false`, `source` = `aurora`  
   - `warm.cache_hit` = `true`, `source` = `elasticache`  
   - `warm.latency_ms` typically **lower** than `cold.latency_ms`

3. **Result file:** `night-23-elasticache-result.json` in `study-lab/`.

4. **CloudWatch** (optional): Lambda log stream shows `cache_hit` in response body; compare `REPORT` `Duration` across cold vs warm invokes.

**Troubleshoot in this order:**

1. Redis cluster still `creating`? Wait — Lambda will timeout on `REDIS_HOST`.
2. **redis-sg** allows **6379** from **lambda-stats-sg** (not CIDR `10.0.0.0/16` unless you choose that anti-pattern).
3. Lambda subnets = **private** subnets (same as Night 17).
4. Aurora row missing? Re-run Night 16 with `-InitSchema` or Night 17 `-TestInvoke`.
5. Second invoke still `cache_hit: false`? Check `REDIS_HOST` env matches cluster endpoint; verify SG rules.

### Compare edge cache (read-only)

GSA prod wiki HTML is cached at **CloudFront** with TTL headers. Tonight caches **relational query results** inside the VPC — different layer, same “don’t hammer the origin” goal.

| Question | CloudFront | ElastiCache (Tonight) |
|----------|------------|----------------------|
| Where? | Edge POPs worldwide | Same Region as Aurora/Lambda |
| Caches | HTTP responses | App-chosen keys (JSON blobs) |
| Invalidation | Path/prefix invalidation | `DEL` key or TTL expiry |
| Needs VPC? | No | Yes for private cluster |

### Reference files

- `night-23-lab-cache-handler.py` — cache-aside + bench action
- `night-23-elasticache-result.json` — Redis endpoint, Lambda ARN, SG IDs
- `night-16-aurora-result.json` — Aurora writer (if present)
- `night-17-lambda-stats-result.json` — write path contrast

### Teardown

```powershell
.\HTML\study-lab\night-23-lab-elasticache-teardown.ps1
```

```bash
bash HTML/study-lab/night-23-lab-elasticache-teardown.sh
```

Deletes Redis cluster, subnet group, redis-sg, cache-reader Lambda, and IAM role. **Does not** delete Night 9 VPC, Night 16 Aurora, or Night 17 stats uploader.

---

## Block 3 (~30 min) — Quiz + latency reading

**File:** `night-23-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=23`.

**CloudWatch reading (5 min):**

- Open `/aws/lambda/saa-study-gsa-cache-reader` → compare `Duration` on bench cold vs warm invokes.
- Note: cold includes Aurora TCP + optional ENI; warm is mostly Redis GET.

---

## Week 4 map (start)

| Topic | Night |
|-------|-------|
| **ElastiCache Redis cache-aside** | **Tonight (23)** |
| Athena on S3 / Iceberg | 24 |
| Route 53 routing policies | 25 |
| CloudFront API caching | 26 |

---

## 5 flashcards (write tonight)

1. **Cache-aside on miss** — What two steps after Aurora returns a row?  
   *(Return to client; SET key with TTL in Redis.)*

2. **Redis vs Memcached** — One feature Redis has that Memcached lacks?  
   *(e.g. replication group failover, data structures, optional persistence.)*

3. **redis-sg inbound** — Port and source for tonight’s Lambda?  
   *(TCP 6379 from lambda-stats-sg.)*

4. **Stale cache after Night 17 write** — Why might GET show old `monthly_runs`?  
   *(Cache-aside without invalidation — TTL not expired yet.)*

5. **CloudFront vs ElastiCache** — One sentence each for GSA.  
   *(CloudFront: edge HTTP. ElastiCache: in-VPC object cache for DB reads.)*

---

## Night 24 preview

**Lab 3B — Athena on Iceberg** — SQL analytics on wiki export in S3 (`night-20` export path). Glue catalog, workgroup, `resort counts by country` query. Contrast Athena serverless SQL vs Aurora OLTP.
