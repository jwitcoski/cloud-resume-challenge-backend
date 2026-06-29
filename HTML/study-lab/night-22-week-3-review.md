# Night 22 — Week 3 review: databases, DR, migration, hybrid networking

~2 hr. **$0–low spend** — paper architecture + timed quiz. No new AWS deploy tonight. Synthesizes Nights 15–21 before Week 4 (ElastiCache, Athena, Route 53).

---

## Plain language first

### What Week 3 was about

Week 3 moved from **“how do packets move in a VPC?”** (Week 2) to **“where does data live, how do we protect it, move it, and reach it from on-prem?”**

| Night | Theme | GSA thread |
|-------|-------|------------|
| **15** | RDS + Aurora theory | Multi-AZ, replicas, Serverless v2, RDS Proxy, DynamoDB vs SQL |
| **16** | Aurora lab | `saa-study-gsa-aurora` in Night 9 private subnets |
| **17** | Lambda → Aurora | SQS stats uploader, ENI, writer endpoint :5432 |
| **18** | DynamoDB resilience | PITR, Streams, stub stream Lambda on wiki counters |
| **19** | DR + AWS Backup | RTO/RPO ladder, vault/plan/tag selection |
| **20** | Migration | DMS CDC, export to S3, DataSync, Snowball |
| **21** | Hybrid networking | VPN, DX, TGW, peering, PrivateLink |

Tonight you **connect the dots** — one diagram, one quiz, one teardown decision.

---

## Block 1 (~20 min) — Draw the 3-tier stack (exam artifact)

**Assignment:** On one page (paper or Excalidraw), draw **GSA’s study stack** as a classic **three-tier web app in a 2-AZ VPC**. Label every box. Time yourself: **15 minutes draw, 5 minutes explain aloud**.

### Reference architecture (draw from memory, then compare)

```
                         Internet / users
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Route 53 (optional) │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │  VPC 10.0.0.0/16 (Night 9 — saa-study-gsa-vpc) │
         │                                                 │
         │  public-a / public-b (10.0.1.0/24, 10.0.2.0/24) │
         │       │ IGW route 0.0.0.0/0                      │
         │       ├── NAT Gateway (one AZ — exam cost trap)   │
         │       └── ALB (internet-facing) ────────────────┼──► WAF (optional, Night 4)
         │              │ listener :443                     │
         │              │ target group                       │
         │  private-a / private-b (10.0.11.0/24, 10.0.12.0/24) │
         │       │ route 0.0.0.0/0 → NAT (outbound only)    │
         │       ├── Fargate tasks OR Lambda (wiki API)      │
         │       │      SG: egress to Aurora :5432           │
         │       │      SG: egress to S3 via gateway endpoint│
         │       ├── Aurora Serverless v2 cluster            │
         │       │      subnet group → both private subnets  │
         │       │      aurora-sg ← lambda-stats-sg :5432    │
         │       │      no public accessibility              │
         │       └── (prod) DynamoDB — regional, no VPC ENI  │
         │                                                 │
         │  S3 gateway endpoint on private route table     │
         │  (Night 8/10 — skip NAT for S3)                   │
         └─────────────────────────────────────────────────┘

Optional hybrid overlay (Night 21 — annotate in a second color):
  On-prem 192.168.0.0/16 ──DX or Site-to-Site VPN──► TGW or VGW ──► same VPC
```

### Checklist — every label the SAA exam expects

| Layer | Component | Must show |
|-------|-----------|-----------|
| **Edge** | IGW | Attached to VPC; **public** subnet route `0.0.0.0/0` → IGW |
| **Edge** | NAT Gateway | In **public** subnet; **private** subnet route `0.0.0.0/0` → NAT |
| **Tier 1** | ALB | Internet-facing; listeners + target group; spans **≥2 AZs** |
| **Tier 2** | Compute | Fargate/Lambda/EC2 in **private** subnets; no public IP on app tier |
| **Tier 3** | Aurora | **Private** subnets; DB subnet group; SG reference from app SG |
| **Tier 3** | DynamoDB | **Outside** VPC (managed); API over AWS network — contrast with Aurora ENI path |
| **Security** | SG vs NACL | SG = stateful, instance/LB level; NACL = stateless subnet edge (mention once) |
| **Read path** | Reader endpoint | Optional second AZ reader for reports — **writes still go to writer** |
| **Hybrid** | VPN or DX | On-prem CIDR must **not overlap** VPC CIDR |

### Three sentences to practice out loud

1. **“Users hit the ALB in public subnets; application tier runs private; database tier runs private with no public accessibility.”**
2. **“Lambda in the VPC needs NAT (or VPC endpoints) to reach Secrets Manager and the internet; S3 uses a gateway endpoint so traffic stays on the AWS backbone.”**
3. **“Wiki counters live in DynamoDB for scale; relational `resort_stats` with JOINs live in Aurora — different access patterns, different stores.”**

---

## Block 2 (~40 min) — Week 3 domain recap

### Database ladder (Nights 15–18)

```
Need SQL JOINs + ACID?
  └─ Aurora/RDS in private subnets (Nights 15–17)

Need simple key-value counter at huge scale?
  └─ DynamoDB (Night 18)

Too many Lambda → DB connections?
  └─ RDS Proxy (Night 15 theory)

Spiky dev workload, PostgreSQL compatible?
  └─ Aurora Serverless v2 — min ACU still billed (not scale-to-zero)

Cross-Region sub-second RPO on Aurora?
  └─ Aurora Global Database — not “promote read replica” alone
```

| Trap | Correct mental model |
|------|---------------------|
| Multi-AZ standby serves analytics | **No** — standby is for HA; use **read replicas** for read scale |
| DynamoDB PITR overwrites table | **No** — restore creates a **new** table |
| Lambda → Aurora without VPC | **No** — Aurora in private subnets requires Lambda **in VPC + ENI** |
| DynamoDB export = live CDC | **No** — export is **point-in-time snapshot** to S3; CDC is **DMS** |

### DR ladder (Night 19)

Slowest/cheapest → fastest/most expensive:

**Backup & restore → Pilot light → Warm standby → Multi-site active-active**

| Metric | Meaning | Example |
|--------|---------|---------|
| **RPO** | Max **data loss** (time) | “We can lose 15 min of wiki counts” |
| **RTO** | Max **downtime** | “Site back in 4 hours” |

**AWS Backup** = one plan + vault + tag selection across DynamoDB, RDS, EBS. **PITR** (DynamoDB) = continuous second-level restore — different job, can coexist.

### Migration ladder (Night 20)

| Tool | When |
|------|------|
| **DMS** full load + **CDC** | Live database cutover with minimal downtime |
| **DynamoDB export → S3** | Bulk analytics snapshot — not ongoing replication |
| **DataSync** | File/object sync between NFS/S3/EFS |
| **Snowball** | Terabytes offline — no sustained network |
| **SCT** | Heterogeneous schema conversion (Oracle → Postgres) |

**Cutover:** stop writes → wait for CDC lag ≈ 0 → point apps at target.

### Hybrid ladder (Night 21)

| If exam says… | Pick |
|---------------|------|
| Hybrid **this week**, encrypted over internet | **Site-to-Site VPN** |
| Stable bandwidth, low jitter, dedicated path | **Direct Connect** |
| DX failed — need backup | **VPN to same TGW/VGW** |
| Many VPCs + on-prem | **Transit Gateway** |
| Two VPCs, full private IP | **VPC peering** (non-transitive!) |
| Vendor SaaS API, no public internet | **PrivateLink** |
| Fargate → S3 in private subnet | **S3 gateway endpoint** |

---

## Block 3 (~60 min) — Timed quiz

**File:** `night-22-quiz.json` — **30** scenario questions (~48 min at 96 sec each, or ~40 min if you are warmed up).

Topics span all of Week 3 — database, Aurora lab patterns, DynamoDB, DR, migration, hybrid. Answer without `night-22-quiz-answers.json` first.

Score on the study site: `/aws-solutions-architect-study/quiz/22/` (restart `npm run dev` after adding new quiz files).

**Target:** ≥24/30 (80%) before starting Night 23 ElastiCache lab.

---

## Week 3 master map

| Topic | One-liner | Night |
|-------|-----------|-------|
| **RDS Multi-AZ** | Sync standby, auto failover | 15 |
| **Read replicas** | Async read scale; promote for DR | 15 |
| **Aurora storage** | Auto-scales — no manual provision | 15 |
| **Aurora Serverless v2** | Variable ACU; minimum always on | 15–16 |
| **RDS Proxy** | Pool connections for Lambda bursts | 15 |
| **Lambda → Aurora** | VPC ENI, writer :5432, SG reference | 17 |
| **DynamoDB PITR** | Restore to any second in 35 days → new table | 18 |
| **DynamoDB Streams** | Ordered change log → Lambda | 18 |
| **AWS Backup** | Central vault + plan + tag selection | 19 |
| **RTO / RPO** | Downtime vs data-loss budgets | 19 |
| **DMS CDC** | Full load then tail transaction log | 20 |
| **DynamoDB export** | Snapshot to S3 — not live CDC | 20 |
| **Site-to-Site VPN** | IPSec hybrid over internet | 21 |
| **Direct Connect** | Dedicated circuit; not encrypted by default | 21 |
| **Transit Gateway** | Transitive hub for VPCs + on-prem | 21 |
| **PrivateLink** | Consumer endpoint → provider service | 21 |

---

## Teardown checklist (if you are done with Aurora labs)

**Keep running** if you plan Night 23+ labs that reuse Night 9 VPC, Aurora, or Lambda stats uploader.

**Tear down in order** when finished studying the database track:

| Step | Script | What it removes | What it keeps |
|------|--------|-----------------|---------------|
| 1 | `night-17-lab-lambda-stats-teardown.ps1` / `.sh` | Lambda, IAM role, SQS mapping, log group | Aurora, SQS queue, VPC |
| 2 | `night-16-lab-aurora-teardown.ps1` / `.sh` | Aurora cluster, DB subnet group, aurora SGs | Night 9 VPC + NAT |
| 3 | `night-18-lab-dynamodb-teardown.ps1` / `.sh` | Study wiki table, stream Lambda (if deployed) | Prod wiki tables |
| 4 | `night-19-lab-backup-teardown.ps1` / `.sh` | Backup vault, plan, recovery points | Night 18 table |
| 5 | `night-20-lab-migration-teardown.ps1` / `.sh` | Migration S3 bucket contents | Night 19 vault (already gone) |
| 6 | `night-9-lab-vpc-teardown.ps1` / `.sh` | **NAT Gateway** (biggest recurring cost), VPC | Nothing in that VPC |

**Cost reminders:**

- **NAT Gateway** bills hourly + per GB even when idle — delete if you are pausing study for a week.
- **Aurora Serverless v2** bills minimum ACU while cluster exists — Night 16 teardown stops that meter.
- **DynamoDB on-demand** with a few study rows is pennies — low urgency unless you want a clean account.

**Do not tear down** (production / other weeks):

- Global Ski Atlas prod wiki tables, CloudFront, or Cognito
- Night 12–14 EventBridge / SQS / SNS stacks if you are continuing Week 2 integration labs
- `night-9-vpc-ids.json` — back it up before VPC teardown; Night 16–17 setup reads it

---

## 5 flashcards (write tonight)

1. **Three-tier VPC** — Which subnets host ALB, app tier, and Aurora?  
   *(ALB → public (or private with internal ALB); app + DB → private; DB has no public accessibility.)*

2. **RPO vs RTO** — “We can lose 5 minutes of data but must be online in 1 hour.”  
   *(RPO = 5 min; RTO = 1 hour.)*

3. **DMS cutover** — What do you check right before switching DNS to the target?  
   *(CDC replication lag ≈ 0 after stopping writes to source.)*

4. **VPC peering vs TGW** — Dev, Staging, Logging VPCs all need to talk.  
   *(TGW transitive hub — peering is non-transitive and does not scale to full mesh.)*

5. **DynamoDB vs Aurora for GSA** — wiki `viewCount` vs `resort_stats` monthly JOIN reports.  
   *(DynamoDB counter; Aurora relational SQL.)*

---

## Night 23 preview

**Lab 3A — ElastiCache (Redis)** — cache hot wiki reads in front of Aurora or compare CloudFront TTL at the edge. Redis vs Memcached, cache-aside pattern, and the Lambda-in-VPC tradeoff when the cache lives inside the same Night 9 VPC.

---

## Reference links

- [Aurora best practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html)
- [DynamoDB PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html)
- [AWS Backup getting started](https://docs.aws.amazon.com/aws-backup/latest/devguide/getting-started.html)
- [DMS task types](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html)
- [Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html)
