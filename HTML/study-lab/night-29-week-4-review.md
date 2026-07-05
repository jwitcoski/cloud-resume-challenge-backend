# Night 29 — Week 4 review: storage, analytics, edge, compute, integration

~2 hr. **$0 AWS spend** — paper architecture + timed quiz. No new deploy tonight. Synthesizes Nights 23–28 before Week 5 cost labs (S3 lifecycle, Fargate right-sizing, Step Functions capstone).

---

## Plain language first

### What Week 4 was about

Week 3 answered **“where does data live and how do we reach it?”** Week 4 answers **“how do we make it fast, query it at scale, route users intelligently, and move signals between services?”**

| Night | Theme | GSA thread |
|-------|-------|------------|
| **23** | ElastiCache Redis | Cache-aside `resort_stats` in Night 9 VPC; Redis vs Memcached vs CloudFront vs DAX |
| **24** | Athena + Iceberg | SQL on S3/Glue catalog; OLTP Aurora vs analytics lake |
| **25** | Route 53 routing | Weighted, failover, latency, geolocation; health checks; alias at apex |
| **26** | CloudFront + API GW | Path behaviors, throttling, edge vs origin cache layers |
| **27** | EC2 + EBS + Spot | gp3/io2/st1/sc1, EFS, Instance Store, Iceland compute cost |
| **28** | Integration services | EventBridge, SQS, SNS, Kinesis, Step Functions, AppSync awareness |

Tonight you **connect the dots** — one storage decision tree, one full-stack diagram, one quiz, one architecture-notes pass.

---

## Block 1 (~20 min) — Storage class decision tree (exam artifact)

**Assignment:** Draw the decision tree below from memory. Time yourself: **12 minutes draw, 8 minutes explain aloud** using GSA examples for each leaf.

### Master tree — S3 + block + file + ephemeral

```
What are you storing?
│
├─ Objects (files, images, pipeline output, analytics Parquet)
│     │
│     ├─ Frequent access, low latency GET/PUT
│     │     → S3 Standard
│     │     GSA: Iceland GeoJSON output, Night 24 Parquet, static site export
│     │
│     ├─ Unknown or changing access pattern
│     │     → S3 Intelligent-Tiering (small monitoring fee)
│     │
│     ├─ Infrequent access, still need ms retrieval
│     │     → S3 Standard-IA or One Zone-IA (cheaper, AZ risk on One Zone)
│     │
│     ├─ Archive — minutes to hours retrieval OK
│     │     → S3 Glacier Flexible Retrieval or Glacier Deep Archive
│     │
│     └─ Lifecycle automation across tiers
│           → S3 Lifecycle rules (Night 30 lab preview)
│
├─ Block disk for ONE EC2 instance (boot or data volume)
│     │
│     ├─ General SSD — boot, app disks, moderate IOPS
│     │     → EBS gp3 (right-size IOPS/throughput without bigger disk)
│     │
│     ├─ Highest random IOPS — database ON EC2 (not RDS/Aurora)
│     │     → EBS io2 / io2 Block Express
│     │
│     ├─ Big sequential scans — logs, throughput-bound HDD
│     │     → EBS st1 (not for boot/root on standard AMIs)
│     │
│     └─ Cheapest bulk HDD — rarely accessed
│           → EBS sc1
│
├─ Shared files across many EC2/Lambda (NFS, same content)
│     → Amazon EFS (regional NFS; scales with clients)
│     GSA: shared PMTiles build config across Batch workers (exam scenario)
│
├─ Temp scratch on ONE EC2 — OK to lose on stop/terminate
│     → EC2 Instance Store (ephemeral, highest local IOPS)
│     GSA: Iceland batch temp — durable output still goes to S3
│
└─ Managed SQL / NoSQL with ACID
      → Aurora/RDS or DynamoDB — NOT EBS as “database product”
      GSA: resort_stats in Aurora; wiki counters in DynamoDB
```

### Three-layer cache + analytics map (draw second diagram)

```
                    Users (global)
                         │
                         ▼
              ┌──────────────────────┐
              │ CloudFront (Night 26)│  ← HTTP responses at edge
              │  static HTML cached  │
              │  api/wiki* no cache  │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    S3 static       API Gateway      Route 53 (Night 25)
    export          + Lambda wiki    weighted / failover /
                         │           latency policies
                         ▼
              ┌──────────────────────┐
              │ ElastiCache Redis    │  ← app objects in VPC (Night 23)
              │ cache-aside Aurora   │
              └──────────┬───────────┘
                         │ miss
                         ▼
              ┌──────────────────────┐
              │ Aurora OLTP          │  ← source of truth (Nights 16–17)
              └──────────┬───────────┘
                         │ snapshot / ETL
                         ▼
              ┌──────────────────────┐
              │ S3 + Glue + Iceberg  │  ← Athena SQL (Night 24)
              └──────────────────────┘

Side channel — Iceland pipeline (Nights 12–14, 27–28):
  EventBridge cron → ECS Fargate → S3 output
       success → EventBridge → SQS → Lambda uploader
       failure → EventBridge → SNS fan-out
```

### Checklist — labels the SAA exam expects on your diagram

| Layer | Component | Must show |
|-------|-----------|-----------|
| **Edge** | CloudFront | Path-based behaviors; **CachingDisabled** vs **CachingOptimized** |
| **Edge** | Route 53 | Failover needs **health check on PRIMARY**; alias at **apex** |
| **App cache** | ElastiCache | **Private subnets**; cache-aside; Aurora = source of truth |
| **OLTP** | Aurora | Millisecond transactions — **not** Athena for live writes |
| **Analytics** | Athena + S3 | Serverless SQL; pay per **TB scanned**; partition to cut cost |
| **Integration** | EventBridge / SQS / SNS | Schedule vs buffer vs fan-out — see `gsa-integration-map.md` |
| **Compute** | EC2 Spot / Fargate Spot | Interruptible batch; **S3** holds durable pipeline output |
| **Storage** | S3 vs EBS vs EFS | Object vs block vs shared NFS — pick from tree above |

### Three sentences to practice out loud

1. **“CloudFront caches HTTP at the edge; ElastiCache caches application objects inside the VPC; they solve different problems and stack — not replace each other.”**
2. **“Aurora serves live resort_stats; Athena queries Parquet/Iceberg snapshots in S3 — OLTP vs analytics, not either/or for the same workload.”**
3. **“Iceland pipeline durable output is S3; EBS on a batch worker is scratch; EventBridge schedules the job, SQS buffers success handoff, SNS fans out failures.”**

---

## Block 2 (~40 min) — Week 4 domain recap

### Caching ladder (Night 23 + 26)

```
Need to cache HTTP GET responses globally?
  └─ CloudFront (path behavior + cache policy + origin Cache-Control)

Need to cache DB query results near Lambda in VPC?
  └─ ElastiCache Redis — cache-aside (app populates on miss)

Need microsecond DynamoDB reads at scale?
  └─ DAX (not Redis — DynamoDB-specific)

Memcached vs Redis?
  └─ Redis → sessions, data structures, replication failover
  └─ Memcached → simplest horizontal string cache
```

| Trap | Correct mental model |
|------|---------------------|
| CloudFront replaces Redis | **No** — edge HTTP vs in-VPC object cache |
| Cache-aside = cache pulls DB on miss | **No** — **app** reads DB and writes cache on miss |
| Redis is source of truth | **No** — Aurora/DynamoDB is; Redis is ephemeral |
| Edge-cache authenticated GETs with shared cache key | **Risky** — anonymous public reads only unless key includes safe headers |

### Analytics ladder (Night 24)

```
App needs millisecond UPSERT with ACID?
  └─ Aurora/RDS (Nights 16–17)

Ad hoc SQL on S3 data lake, unpredictable volume?
  └─ Athena + Glue catalog

Petabyte warehouse, heavy BI concurrency?
  └─ Redshift

Live streaming ingest to S3 for later Athena?
  └─ Kinesis Data Firehose (awareness — GSA uses batch ECS today)

Need time travel / schema evolution on lake tables?
  └─ Iceberg format on S3
```

| Trap | Correct mental model |
|------|---------------------|
| Athena for live wiki counter updates | **No** — Athena is read-only analytics on S3 |
| Glue crawler required for every Athena query | **No** — catalog metadata suffices; crawlers optional |
| Forgetting partitions on 10 TB bucket | **Cost trap** — scan entire bucket every query |
| DynamoDB export JSON = easy Athena | **Awkward** — Parquet/Iceberg is the analytics path |

### DNS + edge ladder (Nights 25–26)

| If exam says… | Pick |
|---------------|------|
| Split 90/10 canary between two ALBs | **Route 53 weighted** |
| Active/passive DR; auto flip when primary dies | **Route 53 failover** + health check on **PRIMARY** |
| Send each user to lowest-latency Region you operate | **Route 53 latency** (not geolocation) |
| EU users must hit EU endpoint for compliance | **Route 53 geolocation** |
| Apex domain → CloudFront | **Alias A/AAAA** — CNAME forbidden at apex |
| Static anycast IPs for TCP/UDP non-HTTP | **Global Accelerator** — not CloudFront |
| Per-partner API rate limits | **API Gateway usage plan + API key** |
| Throttle exceeded | **429** — not 502 |
| Protect origin from DDoS at HTTP layer | **WAF on CloudFront or REGIONAL on ALB** |

### Compute + storage ladder (Night 27)

| Workload | Pick |
|----------|------|
| Default EC2 boot / app disk | **gp3** |
| MySQL on EC2, max random IOPS | **io2** |
| 500 GB sequential log scan | **st1** |
| Cheapest cold HDD on EC2 | **sc1** |
| Shared config across 20 Batch instances | **EFS** |
| Temp encode scratch, OK to lose | **Instance Store** |
| Stateless batch, 2-min interrupt OK | **Spot** or **Fargate Spot** |
| Iceland pipeline system of record | **S3** — not EBS |

### Integration ladder (Night 28)

| If exam says… | Pick |
|---------------|------|
| Cron monthly job | **EventBridge schedule** |
| Worker slower than producer; pull buffer | **SQS standard** |
| Email + 3 team queues from one alert | **SNS → fan-out to SQS queues** |
| ECS task success → durable handoff | **EventBridge rule → SQS** (not SNS alone) |
| High-volume stream, custom consumers, replay | **Kinesis Data Streams** |
| Near-real-time to S3 without consumer code | **Kinesis Data Firehose** |
| Multi-step retry/Catch/Wait workflow | **Step Functions Standard** |
| Millions of short flows, no audit history | **Step Functions Express** |
| FailedInvocations alarm | Rule **could not invoke target** (IAM/config) |
| Container exit code 1 | Task **ran and failed** — different signal |
| Cross-account event routing | **EventBridge buses/rules** — not SQS |

---

## Block 3 (~60 min) — Timed quiz

**File:** `night-29-quiz.json` — **30** scenario questions (~48 min at 96 sec each, or ~40 min if warmed up).

Topics span all of Week 4 — ElastiCache, Athena/Iceberg, Route 53, CloudFront/API GW, EC2/EBS/EFS/Spot, integration services, plus storage-class synthesis. Answer without `night-29-quiz-answers.json` first.

Score on the study site: `/aws-solutions-architect-study/quiz/29/` (restart `npm run dev` after adding new quiz files).

**Target:** ≥24/30 (80%) before starting Night 30 S3 lifecycle lab.

---

## Block 4 (~15 min) — Update architecture notes

Add **one sentence per pillar** to your portfolio notes (or append to existing study-lab docs):

| Doc | Add tonight |
|-----|-------------|
| `wiki-api-production.md` | Which paths are edge-cached vs origin-only; throttling layer |
| `gsa-integration-map.md` | One-line Kinesis/Firehose “if we streamed live edits” |
| `iceland-pipeline-compute.md` | Spot/Fargate Spot vs On-Demand; S3 as durable output |
| Personal one-pager | Storage tree leaf you missed most on the quiz |

**Well-Architected framing (exam + portfolio):**

- **Performance:** CloudFront + ElastiCache layers; Athena partitions
- **Reliability:** Route 53 failover; SQS DLQ; Redis replication group
- **Cost:** gp3 over io2 when IOPS not needed; Athena scan minimization; Spot for batch
- **Operational excellence:** Step Functions visibility (Night 32 preview); CloudWatch dashboards (Night 26)

---

## Week 4 master map

| Topic | One-liner | Night |
|-------|-----------|-------|
| **Cache-aside** | App GET Redis → miss → Aurora → SETEX | 23 |
| **Redis vs Memcached** | Redis = structures + failover; Memcached = simple scale-out | 23 |
| **CloudFront vs ElastiCache** | Edge HTTP vs in-VPC objects | 23, 26 |
| **Athena** | Serverless SQL on S3; pay per scan | 24 |
| **Iceberg** | Snapshots, schema evolution, hidden partitions | 24 |
| **Athena vs Aurora** | Analytics lake vs OLTP | 24 |
| **Route 53 weighted** | Canary / blue-green traffic split | 25 |
| **Route 53 failover** | Active/passive + PRIMARY health check | 25 |
| **Route 53 latency** | Lowest latency among **your** Regions | 25 |
| **Alias at apex** | A/AAAA to CloudFront — not CNAME | 25 |
| **CloudFront behaviors** | Path pattern picks origin + cache policy | 26 |
| **API GW throttling** | Account, stage, usage plan layers | 26 |
| **gp3 / io2 / st1 / sc1** | General / IOPS / throughput HDD / cold HDD | 27 |
| **EFS vs EBS** | Shared NFS vs single-instance block | 27 |
| **Spot / Fargate Spot** | Interruptible batch discount | 27 |
| **EventBridge vs SQS vs SNS** | Schedule/route vs buffer vs fan-out | 28 |
| **Kinesis Streams vs Firehose** | Custom consumers vs managed S3 delivery | 28 |
| **Step Functions Standard vs Express** | Auditable workflows vs high-volume short | 28 |

---

## Teardown checklist (Week 4 labs)

**Keep running** if you plan Night 30–32 labs that reuse Night 9 VPC, Route 53 records, or integration stacks.

**Tear down in order** when pausing study for a week:

| Step | Script | What it removes | What it keeps |
|------|--------|-----------------|---------------|
| 1 | `night-23-lab-elasticache-teardown.ps1` / `.sh` | Redis, cache Lambda | Night 9 VPC, Night 16 Aurora |
| 2 | `night-24-lab-athena-teardown.ps1` / `.sh` | Athena workgroup, Glue DB, Iceberg prefix | Night 20 migration bucket |
| 3 | `night-25-lab-route53-teardown.ps1` / `.sh` | `night25-*` lab records + health check | Apex `witcoskitech.com` prod records |
| 4 | `night-27-lab-ec2-teardown.ps1` / `.sh` | gp3 demo volume, optional Spot instance | Night 9 VPC |
| — | Night 26 dashboard | Delete CloudWatch dashboard manually if desired | Prod CloudFront unchanged |
| — | Night 28 audit | Read-only — nothing to tear down | Integration stack |

**Cost reminders:**

- **ElastiCache `cache.t4g.micro`** bills while cluster exists — Night 23 teardown stops it.
- **Route 53 health check** ~$0.50/mo while enabled — Night 25 teardown removes lab check.
- **EBS gp3** demo volume — pennies/day; Night 27 teardown deletes it.
- **NAT Gateway** (Night 9) still the biggest idle cost if VPC stays up — see Night 22 teardown order.

**Do not tear down** (production / other weeks):

- `globalskiatlas.com` CloudFront, wiki API, Cognito
- Night 12–14 EventBridge / SQS / SNS if continuing to Night 32 capstone
- Night 16 Aurora if Week 5 labs still reference it

---

## 5 flashcards (write tonight)

1. **Storage tree** — Iceland pipeline final GeoJSON lands where? EBS scratch vs S3?  
   *(Durable output → S3 Standard; EBS/Instance Store = temp local scratch only.)*

2. **Cache layers** — Wiki static HTML vs `resort_stats` JSON in VPC?  
   *(CloudFront edge for HTTP static; ElastiCache Redis cache-aside for DB rows.)*

3. **OLTP vs analytics** — Live UPSERT vs “resorts per country” report?  
   *(Aurora OLTP; Athena on S3/Iceberg snapshot.)*

4. **Route 53 failover** — PRIMARY ALB unhealthy — what must exist on PRIMARY record?  
   *(Health check on PRIMARY; low TTL helps clients flip faster.)*

5. **Integration trio** — Monthly cron vs slow worker buffer vs email three teams?  
   *(EventBridge schedule; SQS; SNS fan-out to SQS queues.)*

---

## Night 30 preview

**Lab 4A — S3 lifecycle + cost** — lifecycle rules on old pipeline prefixes, Cost Explorer top services, AWS Budget alert. Applies the storage class tree from Block 1 to real GSA buckets.

---

## Reference links

- [S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [EBS volume types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)
- [Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html)
- [Athena best practices](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html)
- [Route 53 routing policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)
- [CloudFront cache behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html)
- [Amazon ElastiCache best practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/BestPractices.html)
