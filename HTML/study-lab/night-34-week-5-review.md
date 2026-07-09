# Night 34 — Week 5 review + practice exam block

~2 hr warmup + **130 min timed mock** (separate block). **$0 AWS spend** for the review and in-repo quiz. Optional: run `night-34-lab-study-teardown.ps1` after the mock if pausing study for a week. Synthesizes Nights 30–33 and cross-week exam traps before Practice Exam 1.

---

## Plain language first

### What Week 5 was about

Week 4 answered **“how do we make it fast and route traffic?”** Week 5 answers **“how do we pay for the right capacity, orchestrate the pipeline, and explain the whole system to an interviewer?”**

| Night | Theme | GSA thread |
|-------|-------|------------|
| **30** | S3 lifecycle + cost tools | `iceland/` prefix transitions; Cost Explorer; Budgets |
| **31** | Fargate right-sizing | vCPU-GiB-second billing; Spot; Savings Plans; Compute Optimizer |
| **32** | Step Functions capstone | `runTask.sync` → SQS → Lambda → SNS; Catch/Retry |
| **33** | Architecture + Well-Architected | Six tiers; pillar wins; portfolio write-up |

Tonight you **close the loop** — one cost + orchestration decision tree, one full-stack + cost diagram, one in-repo quiz, one **external 65-question timed mock**, and one master teardown + portfolio checklist.

---

## Block 1 (~20 min) — Cost + orchestration decision tree

**Assignment:** Draw the tree below from memory. Time yourself: **12 minutes draw, 8 minutes explain aloud** using GSA examples for each leaf.

### Master tree — storage cost, compute cost, orchestration

```
What cost problem are you solving?
│
├─ Object storage aging / unknown access pattern
│     ├─ Predictable age tiers (90d IA, 365d Glacier)
│     │     → S3 lifecycle rules on prefix (Night 30)
│     ├─ Unpredictable hot/cold per object
│     │     → S3 Intelligent-Tiering
│     └─ Finance needs spend alert at $X
│           → AWS Budgets (not Cost Explorer alone)
│
├─ Container batch runs monthly, tolerates interrupt
│     ├─ Right-size CPU/memory first (p95 utilization)
│     │     → Lower task def revision (Night 31)
│     ├─ Then purchase model
│     │     → Fargate Spot for Iceland; Compute SP for steady mixed compute
│     └─ Idle VPC tax while batch is off
│           → NAT Gateway hourly — S3/ECR VPC endpoints (Nights 8–9, 31)
│
├─ Multi-step pipeline with per-step retry and operator visibility
│     ├─ Single cron → one API call
│     │     → EventBridge schedule (Night 12)
│     ├─ Ordered steps + Catch + audit history
│     │     → Step Functions Standard (Night 32)
│     └─ Sub-5-min millions of flows, history optional
│           → Step Functions Express (exam only — not Iceland)
│
└─ Explain design to interviewer / exam scenario
      → Six tiers + Well-Architected pillar per tier (Night 33)
```

### Cost tools map (draw second diagram)

```
                    Monthly bill question
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Cost Explorer      AWS Budgets          CUR
    "what spent?"      "alert at $X"    "line items to S3"
           │               │               │
           └───────────────┴───────────────┘
                           │
              GSA examples tonight
                           │
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
iceland/ lifecycle    Fargate task hours    NAT + ElastiCache idle
(Night 30)            (Night 31)            (Nights 9, 23, 31)
```

### Checklist — labels the SAA exam expects on your diagram

| Layer | Component | Must show |
|-------|-----------|-----------|
| **Cost** | S3 lifecycle | Minimum 30-day class duration; Glacier retrieval is separate $ |
| **Cost** | Fargate | vCPU-second + GiB-second; right-size before Savings Plan |
| **Cost** | NAT vs endpoints | Gateway endpoints for S3/ECR cut NAT GB — not all traffic |
| **Orchestration** | Step Functions Standard | `runTask.sync` waits STOPPED; failed exit → Catch |
| **Orchestration** | Legacy + SFN schedule | **Disable duplicate cron** — double RunTask risk (Night 32–33) |
| **Security** | Edge tier | Cognito JWT on mutating wiki methods — not “disable caching” |
| **Security** | S3 + CloudFront | OAC + private bucket — not public S3 with Config alarm only |
| **Reliability** | Pipeline | SQS DLQ; SNS failure fan-out; not SNS alone for durable handoff |
| **Portfolio** | Six tiers | Edge, app, OLTP, analytics, pipeline, network |

### Three sentences to practice out loud

1. **“Right-size Fargate before buying Savings Plans; lifecycle old `iceland/` months before debating Glacier Deep Archive for this month’s run.”**
2. **“Step Functions is the printed runbook; EventBridge cron is one line on the whiteboard — Iceland needs both history and Catch, so Standard wins.”**
3. **“CloudFront OAC and Cognito JWT are Security-pillar edge wins; NAT Gateway idle tax is the Cost-pillar network win — endpoints first, tear down NAT when labs pause.”**

---

## Block 2 (~40 min) — Week 5 + cross-week recap

### Cost optimization ladder (Nights 30–31)

```
Old pipeline prefixes read quarterly?
  └─ S3 lifecycle: Standard → Standard-IA (90d) → Glacier (365d)

Current month hot output?
  └─ S3 Standard — not One Zone-IA or Glacier on upload

Unpredictable per-object access?
  └─ Intelligent-Tiering (monitoring fee)

Email when forecast > 80% of budget?
  └─ AWS Budgets — not Cost Explorer saved report alone

Hourly billing export to Athena?
  └─ CUR to S3

Fargate p95 CPU 22%, memory 35% on 2 vCPU / 4 GiB?
  └─ New task def revision — then consider Spot / Savings Plan

Monthly batch, 2-min interrupt OK?
  └─ Fargate Spot — not 24/7 On-Demand service

Flexible 1-yr commit across Lambda + Fargate + EC2?
  └─ Compute Savings Plan — not RDS RI
```

| Trap | Correct mental model |
|------|---------------------|
| Lifecycle moves objects tonight | **No** — transitions run on **object age** |
| Glacier lifecycle = free retrieval | **No** — storage $ down; retrieval billed separately |
| Savings Plan before right-sizing | **Wrong order** — fix task size first |
| 2 vCPU + 512 MiB Fargate task | **Fails** — below Fargate CPU/memory pairing minimums |
| Public subnet Fargate for cost | **Security trap** — private subnet + endpoints |

### Orchestration ladder (Night 32)

| If exam says… | Pick |
|---------------|------|
| Cron only, one target | **EventBridge schedule** |
| Multi-step, different Retry/Catch per step | **Step Functions Standard** |
| Wait until ECS task STOPPED | **`ecs:runTask.sync`** |
| Millions of sub-5-min flows, no audit | **Step Functions Express** |
| `iam:PassRole` missing on RunTask | Step Functions execution role |
| Lambda returns `{ "error": "..." }` with HTTP 200 | Task **succeeds** — business logic ≠ integration failure |
| Legacy cron + SFN cron both enabled | **Double RunTask** — disable one |

### Well-Architected + tiers (Night 33)

| Pillar | GSA headline | Exam trap |
|--------|--------------|-----------|
| **Operational Excellence** | SFN execution history; CloudWatch dashboards | CachingDisabled is not an ops runbook |
| **Security** | Cognito JWT; OAC; private subnets | Public S3 “works with CloudFront” ≠ compliant |
| **Reliability** | Multi-AZ Aurora; SQS DLQ; Route 53 failover | FailedInvocations ≠ container exit 1 |
| **Performance** | CloudFront + Redis + Athena partitions | Redis is not source of truth |
| **Cost** | Lifecycle; Spot; VPC endpoints | NAT idle while labs paused |
| **Sustainability** | Serverless edge; scheduled batch | Awareness — right-sized tasks |

### Cross-week traps (mock exam favorites)

| Trap pairing | Correct pairing |
|--------------|-----------------|
| Live wiki UPSERT | **DynamoDB / Aurora** — not Athena |
| Historical “resorts per country” report | **Athena on Iceberg** — not ElastiCache GET all |
| Edge HTTP cache vs DB row cache | **CloudFront** vs **ElastiCache** — stack both |
| Route 53 failover | Health check on **PRIMARY** |
| Worker buffer | **SQS** — not empty EventBridge bus |
| ECS success durable handoff | **EventBridge → SQS** — not SNS alone |
| Spot batch durable output | **S3** — not Instance Store |
| DMS ongoing replication | **CDC task** — not one-time export only |

---

## Block 3 (~20 min) — In-repo Week 5 quiz

**File:** `night-34-quiz.json` — **30** scenario questions (~48 min at 96 sec each, or ~35 min if warmed up).

Topics span Week 5 (lifecycle, Fargate cost, Step Functions, Well-Architected) plus cross-week synthesis traps from Nights 1–33. Answer without `night-34-quiz-answers.json` first.

Score on the study site: `/aws-solutions-architect-study/quiz/34/` (restart `npm run dev` after adding new quiz files).

**Target:** ≥24/30 (80%) before starting the external mock.

---

## Block 4 (~130 min) — Practice Exam 1 (external timed mock)

**Format:** Real SAA-C03 — **65 questions**, **130 minutes**, pass bar ~72% (47/65).

**Sources (pick one you already own):**

- Tutorials Dojo SAA-C03 practice exam
- Stephane Maarek / Neal Davis Udemy course — Practice Test 1
- AWS Skill Builder — Exam Prep Standard / Official Practice Question Set

**Rules:**

1. **No notes, no AWS console** — one sitting.
2. Mark every question: confident / guess / skipped.
3. After submit, **review every wrong answer** — write the trap in one line (same format as nightly quiz notes).
4. Log score in `saa-c03-exam-checklist.ts` when you update the study log.

**Domain mix check (SAA-C03 weights):**

| Domain | Weight | Weak-area flag if <70% in mock |
|--------|--------|--------------------------------|
| Secure architectures | 30% | IAM, KMS, WAF, Cognito, OAC |
| Resilient architectures | 26% | Multi-AZ, DR, SQS DLQ, Route 53 |
| High-performing | 24% | CloudFront, ElastiCache, Aurora, Athena |
| Cost-optimized | 20% | Lifecycle, Spot, Savings Plans, NAT |

**Target:** ≥49/65 (~75%) before Night 35 weak-area drill. If below 47/65, schedule Night 35 before Practice Exam 2 — do not rush the real exam.

---

## Block 5 (~15 min) — Portfolio checklist + teardown order

### Portfolio checklist (before scheduling real exam)

| Artifact | Status check |
|----------|--------------|
| Six-tier GSA diagram (user path, pipeline path, network box) | Night 33 write-up |
| One security / resilience / cost win per tier | Night 33 Block 2 |
| `wiki-api-production.md` — edge cache vs API paths | Nights 26, 33 |
| `gsa-architecture-map.md` linked from resume or study page | Portfolio |
| Iceland pipeline — single active schedule documented | Disable legacy OR SFN, not both |
| Study account Budget alert active | Night 30 optional `-CreateBudget` |
| Service checklist on study page — Week 5 categories checked | ExamChecklist |
| Two practice exams ≥75% | Nights 34 + 36 |

### Master teardown order (all study stacks)

**Run when pausing labs 1+ weeks** — saves NAT, Aurora, ElastiCache, idle EC2 charges.

**One command (calls scripts in safe order):**

```powershell
.\HTML\study-lab\night-34-lab-study-teardown.ps1
```

```bash
bash HTML/study-lab/night-34-lab-study-teardown.sh
```

Pass `-WhatIf` (PowerShell) to print steps without running.

| Step | Script | What it removes | What it keeps |
|------|--------|-----------------|---------------|
| 1 | `night-32-lab-stepfunctions-teardown` | SFN stack; re-enables legacy cron if disabled | Night 12–14 queues/topics |
| 2 | `night-30-lab-s3-lifecycle-teardown` | Rule `saa-study-night30-iceland-archive` only | Other bucket rules; objects |
| 3 | `night-27-lab-ec2-teardown` | gp3 demo volume, optional Spot instance | Night 9 VPC |
| 4 | `night-25-lab-route53-teardown` | `night25-*` lab records + health check | Apex prod DNS |
| 5 | `night-24-lab-athena-teardown` | Athena workgroup, Glue DB, Iceberg prefix | Migration bucket |
| 6 | `night-23-lab-elasticache-teardown` | Redis cluster, cache Lambda ENI path | Night 9 VPC, Aurora |
| 7 | `night-20-lab-migration-teardown` | Export artifacts (if done with lab) | DynamoDB prod tables |
| 8 | `night-19-lab-backup-teardown` | Backup vault/plan from lab | — |
| 9 | `night-17-lab-lambda-stats-teardown` | Study stats uploader stack | Wiki API prod |
| 10 | `night-16-lab-aurora-teardown` | Aurora study cluster | — |
| 11 | `night-14-lab-sns-teardown` | Study SNS subscriptions (if not used by prod) | — |
| 12 | `night-13-lab-sqs-teardown` | Study queues (if SFN torn down) | — |
| 13 | `night-12-lab-eventbridge-teardown` | Legacy Iceland cron (if fully on SFN or pausing) | — |
| 14 | `night-9-lab-vpc-teardown` | **NAT Gateway** — largest idle saver | Only when no private workloads needed |

**Cost reminders:**

- **NAT Gateway** ~$32/mo + per-GB — step 14; biggest line item if VPC idle.
- **ElastiCache `cache.t4g.micro`** — step 6.
- **Aurora Serverless v2** — step 10; scales to min ACU while cluster exists.
- **Route 53 health check** — step 4.

**Do not tear down (production):**

- `globalskiatlas.com` / `witcoskitech.com` CloudFront, WAF, OAC
- Wiki API Lambda, Cognito pool, DynamoDB visitor tables
- `saa-study/gsa-wiki-cognito` secret until wiki code migrates off it
- Prod lifecycle rules and Budgets that protect spend

**Read-only lab artifacts** (local JSON only — no AWS):

- `night-33-lab-architecture-teardown` — removes `night-33-architecture-result.json`
- `night-31-lab-fargate-rightsizing-teardown` — removes `night-31-fargate-rightsizing-result.json`

---

## Week 5 master map

| Topic | One-liner | Night |
|-------|-----------|-------|
| **S3 lifecycle** | Automate Standard → IA → Glacier by prefix age | 30 |
| **Intelligent-Tiering** | Unknown access — monitoring fee | 30 |
| **Cost Explorer vs Budgets vs CUR** | History vs alert vs export | 30 |
| **Fargate billing** | vCPU-second + GiB-second while RUNNING | 31 |
| **Right-size before purchase** | Lower task def from p95 metrics | 31 |
| **Fargate Spot** | Interruptible monthly batch discount | 31 |
| **Compute Savings Plan** | Flexible 1–3 yr compute commit | 31 |
| **Step Functions Standard** | Multi-step Retry/Catch + audit | 32 |
| **`runTask.sync`** | Wait ECS STOPPED; exit ≠ 0 fails step | 32 |
| **Double schedule trap** | Legacy + SFN cron both on | 32–33 |
| **Six tiers** | Edge, app, OLTP, analytics, pipeline, network | 33 |
| **Well-Architected pillars** | Ops, security, reliability, performance, cost, sustainability | 33 |
| **OAC + private S3** | Security edge win vs public bucket | 33 |
| **Cognito JWT** | Mutating wiki methods — not cache policy | 33 |

---

## 5 flashcards (write tonight)

1. **Cost tree** — Current `iceland/2026-07/` vs 12-month-old prefix?  
   *(This month → Standard; lifecycle moves **aged** objects to IA/Glacier — Night 30.)*

2. **Fargate order** — p95 22% CPU on 2 vCPU / 4 GiB — Savings Plan or smaller task def first?  
   *(Right-size task def first; then Spot / Savings Plan — Night 31.)*

3. **Orchestration** — Iceland 2 hr, SQS on success, SNS on failure, per-step retry?  
   *(Step Functions Standard with `runTask.sync` — Night 32.)*

4. **Security pillar** — Strongest edge control on wiki POST?  
   *(Cognito JWT at API Gateway / Lambda — Night 33.)*

5. **Teardown** — Biggest idle study-VPC charge after pausing labs?  
   *(NAT Gateway — tear down Night 9 VPC last after dependents — Nights 8–9, 34.)*

---

## Night 35 preview

**Weak-area drill** — re-study top 3 missed domains from Practice Exam 1, **40 targeted questions**, redo 5 missed scenarios aloud. No new deploy.

---

## Reference links

- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [S3 lifecycle configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [Step Functions Standard workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- [SAA-C03 exam guide](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
