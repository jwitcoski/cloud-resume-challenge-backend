# Night 15 — RDS + Aurora deep dive

~2 hr, **no AWS spend**. Theory + paper diagram + quiz. Night 9 VPC can stay up for Night 16 Aurora lab; no RDS resources created tonight.

## Block 1 (~60 min) — Multi-AZ, replicas, Aurora

### The problem Night 14 leaves open

Night 13–14 decouple Iceland **completion** and **failure** events with SQS and SNS. A downstream **stats uploader** (aggregate resort metadata, run SQL reports, feed dashboards) needs durable relational storage — not another key-value row per resort in DynamoDB.

| Workload | Better fit | Why |
|----------|------------|-----|
| Wiki page views, simple counters | **DynamoDB** (GSA frontend today) | Key-value, massive scale, no joins |
| Resort stats with JOINs, ad-hoc SQL, ACID batches | **RDS / Aurora** | Relational model, transactions, complex queries |
| Monthly Iceland batch → aggregate rows | Either | SQS consumer can write DynamoDB **or** Postgres — pick by query pattern |

**Tonight:** when relational wins, and how AWS HA/read-scaling patterns differ.

---

## Plain English guide (read this first)

If database terms are new, start here. Think of your app as a restaurant:

| Service | Simple analogy | What it actually does |
|---------|----------------|----------------------|
| **RDS** | A managed kitchen (AWS runs the appliances) | A traditional SQL database (Postgres, MySQL, etc.) that AWS patches, backs up, and hosts for you |
| **Multi-AZ** | A backup kitchen in another building | Copy of your DB in a second AZ; if the first dies, AWS flips traffic automatically. **Not for extra customers** — standby is for emergencies only |
| **Read replica** | Extra waiters reading the menu aloud | A copy of your data for **read-only** traffic (reports, dashboards). Primary still handles writes. Slight delay (async) before copies update |
| **Aurora** | A fancier managed kitchen with auto-expanding pantry | AWS’s own Postgres/MySQL-compatible engine. Storage grows by itself (10 GB steps, up to 128 TB). Data copied 6× across 3 AZs. Up to 15 read replicas |
| **Aurora Serverless v2** | Pay-for-what-you-use kitchen hours | No fixed instance size — scales up/down in seconds based on load. **Never goes to zero** (minimum ACU always billed) so you avoid cold-start delays |
| **RDS Proxy** | A host who seats 1,000 guests at 50 tables | Sits between Lambda and your DB. Pools thousands of short-lived connections into a smaller number the DB can handle |
| **DynamoDB** | A giant filing cabinet with labeled drawers | No SQL tables or JOINs. Look up by key super fast at any scale. Great for counters, sessions, wiki views |
| **ElastiCache** | Sticky notes on the wall for popular orders | RAM cache in front of a slow database. “Hot” data served instantly; DB sees fewer repeat reads |
| **AWS Backup** | One calendar for all your safety copies | Single place to schedule backups for RDS, EBS, DynamoDB, etc. instead of configuring each service separately |

### 1. RDS Multi-AZ (high availability — “don’t go down”)

**What it is:** An option when you create RDS. AWS puts your primary database in one Availability Zone and keeps a **standby copy in another AZ**.

**How it works:** When you write data, it is copied to the standby **at the same time** (synchronous). If the primary crashes or the whole AZ has problems, AWS **automatically** points your app at the standby. You do not promote it yourself.

**Key takeaway:** This is for **surviving disasters**, not for speed. While the primary is healthy, you **cannot** read from or write to the standby. Do not send BI reports to Multi-AZ standby.

### 2. Read replicas (scalability — “too many readers”)

**What it is:** Extra copies of your database used only for **read** traffic — searches, profiles, reports, dashboards.

**How it works:** The primary sends updates to replicas **a moment later** (asynchronous). Your app does not wait for the copy to finish on every write, so writes stay fast.

**Key takeaway:** Use when **many people read at once** and the primary is getting tired. If the primary dies, you can **manually promote** a replica to become the new primary (disaster recovery), but that is not automatic like Multi-AZ.

**Multi-AZ vs read replica in one sentence:** Multi-AZ = automatic failover for uptime; read replica = extra copies for read traffic.

### 3. Amazon Aurora (the upgraded relational engine)

**What it is:** AWS’s own high-performance database that **speaks** MySQL or PostgreSQL but works differently under the hood.

**How it works:** You do not pick a disk size and hope it is enough — **storage grows automatically** in 10 GB chunks. AWS keeps **6 copies** of your data across **3 AZs**. Failover is usually faster than standard RDS Multi-AZ.

**Extra features worth knowing:**
- Up to **15 read replicas** (standard RDS often caps at 5)
- **Global Database** — copy to other Regions worldwide for local reads and global DR (sub-second lag)
- **Backtrack** (MySQL-compatible Aurora only) — “undo” a bad UPDATE without a full restore
- **Cloning** — fast copy for dev/test

### 4. Aurora Serverless v2 (scale with demand)

**What it is:** Aurora that **sizes itself** instead of you picking `db.r6g.xlarge`.

**How it works:** Capacity is measured in **ACUs** (Aurora Capacity Units). You set a min and max; Aurora scales inside that range in fractions of a second.

**Key takeaway:** Great for **spiky or dev** workloads. You pay for what you use within your min/max. **v2 does not scale to zero** — there is always a minimum ACU running (avoids cold start). For a dev DB you only need occasionally, **stop/start RDS** or tear down the stack instead.

### 5. RDS Proxy (the connection helper)

**What it is:** A managed middle layer between your app and RDS/Aurora.

**Why you need it:** Lambda can spin up **thousands** of copies instantly. If each opens its own database connection, the database runs out of connection slots and crashes.

**How it works:** Proxy **pools** connections — many Lambdas share fewer real DB connections. It also helps during failover by handling reconnects.

**Exam cue:** “500 concurrent Lambdas hitting Postgres” → **RDS Proxy**, not “bigger instance” or Multi-AZ.

### 6. DynamoDB (NoSQL — different animal)

**What it is:** Not SQL. A **key-value / document** store built for speed at huge scale.

**How it works:** You design around **keys** (e.g. `pageId`, `userId`), not JOINs across tables. Reads and writes stay fast whether you have 100 users or 100 million.

**Key takeaway:** Perfect for **simple lookups and counters** (wiki page views, shopping carts, sessions). Bad fit when you need `JOIN resort_dimension ON monthly_agg` — that is relational (RDS/Aurora).

**GSA split:** DynamoDB for wiki counters today; Aurora for relational stats with JOINs (Night 16 lab).

### 7. ElastiCache (speed booster — Night 22)

**What it is:** Data held in **RAM** (Redis or Memcached), not on disk.

**How it works:** App checks cache first. If the data is there, return instantly. If not, read from RDS and optionally store in cache for next time.

**Key takeaway:** Protects your database from the same read being hammered over and over. **Not** your primary data store — cache can be emptied; RDS/Aurora stays source of truth.

### 8. AWS Backup (one schedule for everything — Night 19)

**What it is:** Central backup scheduler for many AWS services.

**Why it matters:** Instead of setting RDS backups here, EBS snapshots there, and DynamoDB backups somewhere else, you write **one policy** (“backup nightly, keep 30 days”) and attach resources to it.

### Backups & PITR (you missed this on the quiz)

| Term | Plain English |
|------|---------------|
| **Automated backup** | AWS snapshots your DB daily and keeps transaction logs. Restore window: **1–35 days** (max **35**, not 365) |
| **PITR** (Point-In-Time Recovery) | “Restore my database to **Tuesday at 3:47 PM**” — any second inside the backup window |
| **Manual snapshot** | A photo you take on demand; you keep it until you delete it; good for before big migrations |
| **RPO** | How much data you might lose in a disaster (Recovery Point Objective) |
| **RTO** | How long until you are back online (Recovery Time Objective) |

---

```
Need a managed relational database?
│
├─ Highest availability + auto failover for writes in one Region?
│     → RDS Multi-AZ (sync standby) or Aurora (6-way storage, fast failover)
│
├─ Scale read traffic (reports, BI) without touching the writer?
│     → Read replicas (RDS) or Aurora replicas (up to 15)
│
├─ Intermittent / spiky / dev DB (cost-sensitive)?
│     → Aurora Serverless v2 (min ACU > 0) or stop/start RDS dev instance
│
├─ Lambda / serverless fleet opening thousands of DB connections?
│     → RDS Proxy (pooling) in front of RDS or Aurora
│
├─ Cross-Region DR with sub-second RPO on Aurora?
│     → Aurora Global Database (1 primary + up to 5 secondary Regions)
│
└─ Simple key-value, no joins, millions of writes/sec?
      → DynamoDB (Night 18) — not RDS
```

### RDS Multi-AZ vs read replicas (exam core)

| | **Multi-AZ** | **Read replica** |
|---|--------------|------------------|
| **Purpose** | High availability — automatic failover | Read scaling |
| **Replication** | **Synchronous** to standby in another AZ | **Asynchronous** |
| **Readable?** | Standby **not** readable (RDS); Aurora reader endpoints are separate | **Yes** — offload SELECT traffic |
| **Failover** | Automatic — new DNS to standby (~60–120 s typical) | Manual **promote** replica → standalone primary |
| **Cross-Region** | Same Region only | Yes — cross-Region replicas supported |
| **App connection** | One endpoint (writer) | Writer + optional replica endpoint(s) |

**Exam trap:** Multi-AZ is **not** a read-scaling solution. Read replicas do **not** auto-failover the primary (unless you promote one).

### Amazon Aurora (why it is a separate exam topic)

| Feature | Detail |
|---------|--------|
| **Engines** | Aurora MySQL, Aurora PostgreSQL (compatible, not identical) |
| **Storage** | Auto-scales in 10 GB increments up to 128 TiB; **6 copies across 3 AZs** |
| **Replicas** | Up to **15** Aurora replicas; shared storage volume; low replica lag |
| **Failover** | Typically **< 30 s** — faster than RDS Multi-AZ |
| **Endpoints** | **Cluster** (writer), **Reader** (load-balanced replicas), custom endpoints |
| **Serverless v2** | Scales ACUs continuously; **minimum capacity > 0** (does not scale to zero) |
| **Global Database** | Primary Region + up to 5 secondary; **< 1 s** cross-Region replication lag |
| **Backtrack** | Rewind Aurora **MySQL** without restore (not PostgreSQL) |
| **Cloning** | Fast copy-on-write clone for dev/test |

**Aurora Serverless v1 vs v2 (exam):**

| | v1 | v2 |
|---|----|----|
| Scale to zero | Could pause | **No** — min ACU always billed |
| Use case | Rare, legacy | **Current choice** — variable workloads with faster scale |

### RDS Proxy (Lambda + Aurora/RDS)

```
Lambda (1000 concurrent) ──► RDS Proxy ──► Aurora cluster
         │                        │
    many short-lived          pooled connections
    TCP connections           to DB instance
```

| Problem | Without proxy | With RDS Proxy |
|---------|---------------|----------------|
| Connection storm | Each Lambda opens DB connection → exhaust `max_connections` | Multiplexes onto fewer DB connections |
| Failover | Apps hold stale connections | Proxy handles failover pinning |
| IAM auth | App manages secrets | Optional IAM database authentication via proxy |

**Exam cue:** “Thousands of Lambda functions in a VPC need Postgres” → **RDS Proxy**, not “bigger instance.”

### Backups, snapshots, RPO/RTO

| Mechanism | RPO | Notes |
|-----------|-----|-------|
| **Automated backups** | Up to **5 min** (transaction log) | 1–35 day retention; enables PITR |
| **Manual snapshot** | Point of snapshot | Cross-Region copy for DR |
| **Multi-AZ failover** | Near-zero data loss (sync) | RTO ~1–2 min |
| **Promote read replica** | Minutes of async lag possible | RTO longer; cross-Region DR pattern |
| **Aurora Global Database** | **< 1 s** lag to secondary | Unplanned failover to secondary Region |

### Engine choice (awareness)

| Engine | Exam note |
|--------|-----------|
| **PostgreSQL / MySQL** | Common SAA answers; open-source on RDS |
| **Aurora PostgreSQL** | GSA stats layer candidate — JSON support, extensions |
| **MariaDB** | MySQL fork on RDS |
| **Oracle / SQL Server** | License-included or BYOL; higher cost |

### Global Ski Atlas — where relational fits

```
Iceland batch (S3 Iceberg)
        │
        ▼
Night 13 SQS completion ──► stats uploader (Lambda / ECS)
        │
        ├── DynamoDB: visitor counters, wiki sessions (already in prod)
        │
        └── Aurora (Night 16 lab): resort_dimension, monthly_agg
                SQL JOINs, BI tools, transactional updates
```

**Pick Aurora/RDS when:** JOINs across tables, `GROUP BY` reports, foreign keys, migrations from on-prem Postgres.

**Pick DynamoDB when:** partition-key access, unpredictable scale, no cross-item transactions needed.

### Exam traps

- **Multi-AZ standby is not a read endpoint** on standard RDS — do not route reports to it.
- **Read replica lag** — async; promoted replica may be missing last minutes of writes.
- **Aurora storage** — you do not provision GB upfront; it grows automatically.
- **Aurora Serverless v2** — does **not** scale to zero; use stop/start RDS for dev cost savings instead.
- **RDS in private subnet** — no public accessibility; Lambda/ECS need **SG rule on DB SG** (source = app SG, port 5432/3306).
- **Encryption** — enable at creation; KMS at rest; SSL in transit.
- **Aurora Backtrack** — MySQL-compatible Aurora only, not PostgreSQL.

---

## Block 2 (~30 min) — Paper diagram + flashcards

### Paper diagram (15 min)

Extend `week2-vpc-plan.md` private subnets with:

```
private-a / private-b
        │
        ├── Aurora cluster (writer in AZ-a, reader in AZ-b)
        │       └── subnet group spans both private subnets
        │
        ├── RDS Proxy (same VPC, private subnets)
        │
        └── Lambda stats-uploader SG ──► Aurora SG :5432
```

Label: Multi-AZ at storage layer (Aurora), Reader endpoint for reports, Proxy between Lambda and cluster.

### 5 flashcards (write tonight)

1. **Multi-AZ vs read replica** — sync HA vs async read scale?
2. **Aurora vs RDS Multi-AZ** — shared storage, replica count, failover speed?
3. **RDS Proxy** — what problem does pooling solve for Lambda?
4. **Aurora Serverless v2** — scale to zero?
5. **DynamoDB vs Aurora** — when does GSA stats uploader need SQL JOINs?

---

## Block 3 (~30 min) — Quiz

**File:** `night-15-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-15-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz/15/` (restart `npm run dev` after adding new quiz files, or use `/aws-solutions-architect-study/quiz/?night=15`).

---

## Database domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| **RDS Multi-AZ** | Sync standby, auto failover — **tonight** |
| **Read replicas** | Async read scale; promote for DR |
| **Aurora** | Auto storage, 15 replicas, Global Database |
| **Aurora Serverless v2** | Variable ACU; min capacity always on |
| **RDS Proxy** | Pool connections for serverless → RDS/Aurora |
| **DynamoDB** | Key-value, wiki tables — Night 18 |
| **ElastiCache** | Cache hot reads off RDS — Night 22 |
| **AWS Backup** | Centralized policy across RDS, EBS, DynamoDB — Night 19 |

---

## Night 16 preview

Lab 2D part 1 — deploy Aurora Serverless v2 in Night 9 private subnets, security group Lambda → Aurora on 5432, sample `resort_stats` table. Hands-on compare one relational row vs DynamoDB visitor counter.
