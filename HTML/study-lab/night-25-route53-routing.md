# Night 25 — Lab 3C: Route 53 routing policies + health checks

~2 hr. **Low AWS spend** — one HTTPS health check (~$0.50/mo while running) + Route 53 queries on lab subdomains only. **Does not change** apex `witcoskitech.com` or `www` production records. Uses your existing Cloud Resume Challenge hosted zone.

---

## Plain language first

### What is Route 53 doing here?

**Amazon Route 53** is AWS’s **DNS service**. When someone types a hostname, Route 53 answers: **which IP or alias target should the browser use?**

You already use Route 53 for **simple routing** — one A/AAAA alias from `witcoskitech.com` → CloudFront. Tonight adds **routing policies**: rules that return **different answers** for the same logical hostname depending on weight, Region, geography, or health.

**Analogy:** A ski resort’s **phone tree**. Simple routing = one number for everyone. Weighted = 80% of callers get lift A, 20% get lift B. Failover = if lift A is closed, auto-transfer to lift B. Latency = route to the **nearest** lodge. Geolocation = US callers get the US number, EU callers get the EU number.

### Routing policies (exam table)

| Policy | When to use | Needs health check? | GSA / lab example |
|--------|-------------|---------------------|-------------------|
| **Simple** | One record, one target | No | `witcoskitech.com` → CloudFront |
| **Weighted** | Split traffic (blue/green, canary) | Optional | 90% new wiki API, 10% old |
| **Latency** | Lowest latency **per user Region** | Optional | `api.globalskiatlas.com` us-east-1 vs eu-west-1 |
| **Failover** | Active/passive DR | **Yes on PRIMARY** | Primary ALB + secondary S3 static site |
| **Geolocation** | Route by **user country/continent** | Optional | EU privacy banner origin vs US |
| **Geoproximity** | Route by **map bias** (shift traffic) | Optional | Bias traffic toward us-west-2 during storm |
| **Multivalue answer** | Return **multiple healthy** IPs (simple LB) | Optional per record | Not a replacement for ELB |

**Exam trap:** **Failover** without a health check on PRIMARY does **not** auto-fail — Route 53 keeps sending traffic to a dead endpoint. **Latency** picks the **lowest-latency Region among records you define** — it does not measure every AWS Region automatically.

### Health checks

Route 53 can **probe** an endpoint (HTTP/HTTPS/TCP) or **watch** another resource (e.g. CloudWatch alarm).

| Type | Tonight | Exam note |
|------|---------|-----------|
| **HTTPS** | `https://witcoskitech.com/HTML/index.html` | Match path + expected status |
| **Endpoint** on ALB | Child health checks optional | ALB has its **own** target health — Route 53 is **DNS-layer** |
| **Calculated** | — | AND/OR of multiple checks |
| **CloudWatch alarm** | — | Failover when metric breaches |

**DNS TTL vs health check:** When PRIMARY fails, Route 53 stops returning it — but clients may **cache** the old answer until TTL expires. Use **low TTL** (60 s) on failover records in production DR designs.

### What is the apex?

The **apex** (also **root domain** or **naked domain**) is your domain **with nothing in front of it**:

| Name | Apex? |
|------|-------|
| `witcoskitech.com` | **Yes** — the apex |
| `www.witcoskitech.com` | No — subdomain |
| `night25-simple.witcoskitech.com` | No — subdomain (tonight’s lab) |

**Analogy — building address:** The apex is the **street address** (`123 Main St` = `witcoskitech.com`). A subdomain is a **unit inside** (`Apt 4B` = `www.witcoskitech.com`). DNS treats the street address specially — that’s why CNAME rules differ at the apex.

### Alias vs CNAME (memorize)

| | **Alias (A/AAAA)** | **CNAME** |
|--|-------------------|-----------|
| **Apex domain** (`witcoskitech.com`) | **Yes** — alias to CloudFront/S3/ALB | **No** — CNAME not allowed at zone apex |
| **Targets** | CloudFront, ALB, API GW, S3 website, another R53 record | Any DNS name |
| **Cost** | No charge for alias queries to AWS targets | Standard query pricing |
| **Tonight** | All lab records alias to CloudFront | Avoid CNAME at apex |

**Analogy — mail forwarding:**

- **CNAME** = sticky note on a mailbox: *“Mail for this name → deliver to Bob’s address instead.”* Works for **subdomains** (`www` → CloudFront hostname). DNS forbids that sticky note on the **main front door** — the apex.
- **A alias** = smart front desk: *“This **is** the official address for `witcoskitech.com` — we hand visitors straight to CloudFront.”* Route 53 alias is **AWS-only**; it knows how to wire apex → CloudFront/ALB/S3 without breaking DNS rules.

**One-liner:** CNAME = “I’m a nickname for another hostname.” Alias = “I **am** the real name — but I point at an AWS target behind the scenes.”

**Your Cloud Resume Challenge site:**

```
witcoskitech.com  →  A alias  →  CloudFront   ✅  (apex — alias required)
www.witcoskitech.com  →  could be CNAME or alias  ✅  (subdomain — either works)
witcoskitech.com  →  CNAME  →  d1234.cloudfront.net   ❌  (illegal at apex)
```

**Non-AWS targets (exam awareness):** Route 53 can point anywhere, but **alias only works for AWS**. Pointing at **Azure/GCP/on-prem**:

| Record | When |
|--------|------|
| **CNAME** | Subdomain → Azure hostname (e.g. `www` → `myapp.azurewebsites.net`) |
| **A / AAAA** | Apex or when the provider gives you a fixed IP |
| **Alias** | AWS targets only — not Azure Front Door, etc. |

**CloudFront hosted zone ID (alias):** `Z2FDTNDATAQYW2` (global constant for all distributions).

### Route 53 vs ELB health vs CloudFront vs Global Accelerator

| Layer | What fails over? | GSA |
|-------|------------------|-----|
| **ALB target group** | Unhealthy **EC2/Fargate tasks** | Future service behind ALB |
| **Route 53 failover** | Unhealthy **DNS target** (whole Region/site) | `globalskiatlas.com` DR to static S3 |
| **CloudFront** | Origin errors — retries, custom error pages | Wiki static + API origins |
| **Global Accelerator** | Anycast IP — steers to healthy **endpoint groups** | Exam contrast to latency routing |

**Exam trap:** ALB is **inherently multi-AZ** — clients using ALB DNS survive one AZ loss **without** Route 53 failover. Route 53 failover matters for **whole-Region** or **primary/secondary stack** cutover.

---

## Block 1 (~30 min) — Policies + GSA DR sketch

### Extended GSA DNS (study + prod)

```
                    ┌─────────────────────────────────────┐
                    │  Route 53 — globalskiatlas.com      │
                    │  Simple: apex → CloudFront          │
                    │  /api/wiki* → API GW (origin path)  │
                    └─────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        CloudFront (static)     API Gateway + Lambda      (future ALB service)
        S3 export               DynamoDB wiki tables

DR pattern (exam paper — not deployed tonight):
  Failover PRIMARY:   api.globalskiatlas.com → ALB us-east-1  + health check
  Failover SECONDARY: static maintenance page → S3 website eu-west-1
```

### Cloud Resume Challenge — tonight’s safe lab zone

```
Route 53 hosted zone witcoskitech.com
  │
  ├── witcoskitech.com / www        ← UNTOUCHED (production)
  │
  └── night25-*.witcoskitech.com    ← lab subdomains only
        ├── night25-simple          simple → CloudFront
        ├── night25-weighted        80/20 weighted → CloudFront
        ├── night25-failover        PRIMARY + health check → CF; SECONDARY → www
        ├── night25-latency         latency (us-east-1) → CloudFront
        └── night25-geo             geolocation US vs default → CloudFront
```

### Decision tree (memorize)

```
Need DNS to split or steer traffic?
│
├─ One target only?
│     → Simple routing
│
├─ Active/passive DR (primary down → secondary)?
│     → Failover + health check on PRIMARY
│
├─ Canary or blue/green % split?
│     → Weighted routing
│
├─ Users worldwide — pick closest Region you deployed?
│     → Latency routing (record per Region)
│
├─ Compliance / content by user country?
│     → Geolocation routing
│
├─ Shift traffic toward or away from a geography on a map?
│     → Geoproximity (Route 53 Traffic Flow / routing policies)
│
└─ Return multiple healthy A records for client-side pick?
      → Multivalue answer (up to 8) — not a full ELB replacement
```

### Exam traps

- **Failover SECONDARY** record must **not** have the PRIMARY health check — only PRIMARY is evaluated for failover flip.
- **Weighted** does **not** guarantee exact percentages on every client — DNS resolvers cache; long TTL smooths distribution.
- **Latency routing** requires a **latency record in each Region** you want in the pool — one record is pointless.
- **Private hosted zone** — DNS for VPC only; associate with VPCs; split-horizon with public zone (exam awareness).
- **Route 53 Resolver** — DNS between VPC and on-prem — different from **routing policies** (Night 21 hybrid).

---

## Block 2 (~60 min) — Lab: witcoskitech.com subdomain routing

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| Hosted zone `witcoskitech.com` | `aws route53 list-hosted-zones-by-name --dns-name witcoskitech.com` |
| CloudFront serves site | `curl -I https://witcoskitech.com/HTML/index.html` → 200 |
| AWS CLI | `aws sts get-caller-identity` |

**Spend note:** One HTTPS health check ≈ **$0.50/month**. Teardown when done. Lab DNS record changes are pennies.

### What the lab creates

| Resource | Name / pattern | Purpose |
|----------|----------------|---------|
| Health check | `saa-study-night25-witco-https` | HTTPS probe of production index page |
| Simple record | `night25-simple.witcoskitech.com` | Baseline alias to CloudFront |
| Weighted records | `night25-weighted.witcoskitech.com` | 80/20 split (two SetIds) |
| Failover records | `night25-failover.witcoskitech.com` | PRIMARY (health check) + SECONDARY |
| Latency record | `night25-latency.witcoskitech.com` | `us-east-1` latency alias |
| Geolocation records | `night25-geo.witcoskitech.com` | US vs `*` default |

**Production safety:** Script only **UPSERTs** `night25-*` names. Apex and `www` are never modified.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-25-lab-route53-setup.ps1
.\HTML\study-lab\night-25-lab-route53-setup.ps1 -TestDns
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-25-lab-route53-setup.sh
bash HTML/study-lab/night-25-lab-route53-setup.sh --test-dns
```

| Flag | What happens |
|------|----------------|
| `-TestDns` / `--test-dns` | `nslookup` each lab subdomain after UPSERT |
| `-SkipHealthCheck` / `--skip-health-check` | Records only — no $0.50/mo health check (failover demo incomplete) |

Health check creation takes **1–2 min** to reach Healthy status.

### End-to-end validation

1. **Result file:** `night-25-route53-result.json` — hosted zone ID, health check ID, CloudFront domain, record FQDNs.

2. **Console:** Route 53 → Health checks → status **Healthy** for `witcoskitech.com`.

3. **DNS lookup:**
   ```powershell
   nslookup night25-weighted.witcoskitech.com
   nslookup night25-failover.witcoskitech.com
   ```
   All lab names should resolve to CloudFront edge (same target tonight — policy mechanics differ).

4. **Weighted distribution (optional):** Run `nslookup` 10× on `night25-weighted` — with 80/20 you may see both SetIds’ targets if secondary differs; tonight both alias same distribution so answers look identical (policy still configured).

5. **Failover drill (awareness):** In console, temporarily **disable** the health check → PRIMARY stops receiving traffic → SECONDARY (`www` alias) answers. **Re-enable** after test.

**Troubleshoot in this order:**

1. Hosted zone not found? Domain must be registered in this account.
2. CloudFront alias fails? Distribution must include `*.witcoskitech.com` **or** lab names use a cert that covers them — if HTTPS fails on lab subdomain, add alternate domain name to distribution (optional advanced step) or test with `-SkipHealthCheck` and DNS-only validation.
3. Health check **Unhealthy**? Verify `https://witcoskitech.com/HTML/index.html` returns 200 from your network.
4. NXDOMAIN on lab name? Wait 60 s for propagation; confirm UPSERT succeeded in `night-25-route53-result.json`.

### Compare globalskiatlas.com (read-only)

| Question | witcoskitech.com (tonight) | globalskiatlas.com (prod) |
|----------|----------------------------|---------------------------|
| Routing policy | Lab subdomains exercise policies | Simple apex → CloudFront |
| Health check | HTTPS on static index | Would use `/api/wiki` or ALB for app DR |
| Failover secondary | `www` alias (same site) | Exam answer: S3 static maintenance bucket |

### Reference files

- `night-25-lab-route53-setup.ps1` / `.sh` — UPSERT lab records + health check
- `night-25-route53-result.json` — IDs for teardown
- `witco-cf.json` — CloudFront distribution reference
- `week1-security-architecture.md` — Site A diagram

### Teardown

```powershell
.\HTML\study-lab\night-25-lab-route53-teardown.ps1
```

```bash
bash HTML/study-lab/night-25-lab-route53-teardown.sh
```

Deletes **night25-*** record sets and the **night-25 health check** only. **Does not** delete hosted zone, apex records, CloudFront, or S3.

---

## Block 3 (~30 min) — Quiz + health-check reading

**File:** `night-25-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=25`.

**Console reading (5 min):**

- Route 53 → Health checks → open tonight’s check → note **Request interval**, **Failure threshold**, and **Health checker locations** (global probes).
- Hosted zone → `night25-failover` → compare PRIMARY (health check ID) vs SECONDARY (no check).

---

## Week 4 map (continued)

| Topic | Night |
|-------|-------|
| ElastiCache Redis cache-aside | 23 |
| Athena on S3 / Iceberg | 24 |
| **Route 53 routing policies** | **Tonight (25)** |
| CloudFront API caching | 26 |

---

## 5 flashcards (write tonight)

1. **Failover routing** — What must exist on the PRIMARY record for automatic DNS failover?  
   *(Route 53 health check — without it, PRIMARY stays in answers even when dead.)*

2. **Alias vs CNAME at apex** — Why is `witcoskitech.com` an A alias, not a CNAME?  
   *(CNAME forbidden at zone apex; alias to CloudFront is required.)*

3. **Weighted vs latency** — One-line difference?  
   *(Weighted = % split you configure; latency = lowest-latency Region among defined records.)*

4. **ALB multi-AZ vs Route 53 failover** — When is ALB enough without R53 failover?  
   *(Single-Region AZ failure — ALB DNS still reaches healthy AZs; R53 for whole-stack/Region DR.)*

5. **Night 25 teardown** — What stays in Route 53?  
   *(Apex `witcoskitech.com`, `www`, hosted zone — only `night25-*` lab records and health check removed.)*

---

## Night 26 preview

**CloudFront + API performance** — cache behaviors for `/api/*`, TTL headers, API Gateway throttling, CloudWatch dashboard. Tie wiki `Cache-Control` to edge hits vs origin load.
