# Night 28 — Integration services (EventBridge vs SQS vs Kinesis vs Step Functions)

~2 hr. **$0 AWS spend** — read-only audit of Nights 12–14 study resources + decision-tree drills. **No new deploy tonight** — synthesizes Week 2 integration labs before Night 32 Step Functions capstone.

---

## Plain language first

### What are “integration services”?

They move **signals and work** between parts of your system without hard-wiring every caller to every callee.

**Analogy:** A ski resort **lift ticket scanner** (producer) should not call every **cafeteria, rental shop, and patrol radio** directly when a guest checks in. You need:

| Resort role | AWS service | What it does |
|-------------|-------------|--------------|
| **Daily opening bell** at 8:00 | EventBridge schedule | “Run the snow report job now” |
| **Message board** staff check when ready | SQS queue | Buffer work — consumers pull when free |
| **PA announcement to all lodges** | SNS topic | One alert → many listeners at once |
| **Live GPS puck stream from every skier** | Kinesis Data Streams | High-volume ordered stream, many readers |
| **Escalation playbook** with retries | Step Functions | Multi-step workflow with branches |

Tonight you learn **which bell to ring** — not deploy a new stack.

### Master decision tree (memorize)

```
What are you trying to do?
│
├─ Run on a schedule OR route AWS service events?
│     → EventBridge (rule or Scheduler)
│     GSA: monthly Iceland cron (Night 12)
│
├─ Buffer work — producer faster than consumer, pull model?
│     → SQS standard (or FIFO if strict order + dedup)
│     GSA: completion queue (Night 13)
│
├─ Notify many subscribers — push, fan-out?
│     → SNS (+ SQS per team for durable fan-out)
│     GSA: failure alerts topic (Night 14)
│
├─ High-volume streaming data — replay, custom consumers?
│     → Kinesis Data Streams (or MSK for Kafka)
│
├─ Stream to S3/Redshift/OpenSearch — minimal consumer code?
│     → Kinesis Data Firehose
│
├─ Multi-step workflow — retries, Catch, human approval, visual state?
│     → Step Functions Standard (Express for high-volume short flows)
│     GSA: Night 32 capstone
│
└─ GraphQL API + real-time mobile subscriptions?
      → AppSync (awareness — not in GSA deploy)
```

---

## Block 1 (~50 min) — Comparison tables + GSA map

### Read `gsa-integration-map.md`

Trace the Iceland pipeline from EventBridge schedule through SQS success path and SNS failure path. Label every resource name on paper.

### EventBridge vs SQS vs SNS (exam core)

| | **EventBridge** | **SQS** | **SNS** |
|--|-----------------|---------|---------|
| **Model** | Router — match events, invoke targets | Queue — store until consumer deletes | Pub/sub — push to subscribers |
| **Delivery** | Push to targets (with retry/DLQ on some) | Pull — `ReceiveMessage` | Push — HTTP/Lambda/email/SQS |
| **Ordering** | No ordering guarantee across targets | Standard: best-effort; FIFO: strict | FIFO topic: strict |
| **Buffer** | Not a long-term work queue | **Yes** — core use case | No — fan-out, not backlog storage |
| **Schedule** | **Yes** — cron/rate | No | No |
| **Exam cue** | “Decouple microservices reacting to AWS events” | “Worker pool processes at its own pace” | “Email + Lambda + 3 queues from one event” |

**Classic combos (all in GSA study stack):**

1. `EventBridge schedule → ECS RunTask` (Night 12)
2. `EventBridge pattern → SQS → Lambda` (Night 13)
3. `EventBridge pattern → SNS → SQS inbox` (Night 14 fan-out)
4. `CloudWatch alarm → SNS` (Night 12 FailedInvocations)

### EventBridge traps (review from Nights 12–14)

| Trap | Truth |
|------|-------|
| **FailedInvocations > 0, Invocations = 0** | Rule could not call target — IAM, PassRole, bad target config |
| **Container exit code 1** | Task ran and failed — **not** FailedInvocations; use ECS event → SNS (Night 14) |
| **SQS target fails** | Queue policy needs `events.amazonaws.com` + `aws:SourceArn` = rule ARN |
| **SNS target fails** | Topic policy needs `events.amazonaws.com` + `sns:Publish` + SourceArn |
| **Schedule vs decouple** | Cron on EventBridge ≠ replacement for SQS when consumer is slow |

### Kinesis family (new for Week 4 synthesis)

| Service | You write consumers? | Destinations | Exam when |
|---------|---------------------|--------------|-----------|
| **Kinesis Data Streams** | **Yes** — SDK, Lambda, KCL | Your code → anywhere | Real-time analytics, replay, custom aggregation |
| **Kinesis Data Firehose** | **No** — fully managed | S3, Redshift, OpenSearch, Splunk | “Near-real-time to data lake without managing shards” |
| **MSK** | Kafka clients | Kafka ecosystem | “Existing Kafka apps, managed cluster” |
| **Kinesis Video Streams** | Video-specific SDK | Rekognition, custom | IoT/camera ingest awareness |

**Streams vs Firehose — one line each:**

- **Streams:** “I need shard-level control, multiple custom consumers, replay from retention.”
- **Firehose:** “Land streaming records in S3 for Athena — AWS scales and batches for me.”

**GSA tie-in:** Night 24 Athena queries **batch** S3/Iceberg — Firehose would be the streaming **ingress** if live edit events needed a lake path. Iceland monthly batch uses **ECS + S3**, not Kinesis.

### Step Functions (preview Night 32)

| Type | Duration | History | Use case |
|------|----------|---------|----------|
| **Standard** | Up to 1 year | Full, auditable | Order workflows, human approval, ECS + Lambda chains |
| **Express** | Up to 5 min | Can be discarded | High-volume synchronous-ish orchestration |

**When Step Functions beats EventBridge + SQS alone:**

- Ordered **multi-step** with **different retry policies per step**
- **Catch** states routing failures to SNS vs DLQ vs alternate path
- **Wait** for external callback (human approve, task STOPPED)
- Visual workflow operators must see state in console

**When EventBridge + SQS is enough (GSA today):**

- Schedule fires one task
- Success/failure events route to queue or topic
- No cross-step compensation logic in one state machine

### AppSync (awareness)

| Need | Pick |
|------|------|
| REST CRUD behind CloudFront | **API Gateway + Lambda** (GSA wiki) |
| GraphQL + **WebSocket subscriptions** for live mobile UI | **AppSync** |
| Real-time pub/sub without GraphQL | IoT Core, WebSocket API, or AppSync subscriptions |

AppSync resolves fields from **DynamoDB, Lambda, HTTP, OpenSearch** — exam may pair it with mobile apps needing live lift status, not batch ETL.

### Integration vs analytics placement

```
                    INTEGRATION (Tonight)              ANALYTICS (Nights 24–25)
                    ─────────────────────              ─────────────────────────
Purpose             Decouple + route + orchestrate     Query + aggregate at rest
Examples            EventBridge, SQS, SNS, SFN         Athena, Glue, Kinesis→S3
GSA                 Iceland notify path                Iceberg resort counts SQL
Latency             Seconds to minutes                 Seconds to hours (batch)
```

---

## Block 2 (~40 min) — Lab: read-only integration audit

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| Nights 12–14 labs (optional) | Study rules/queues exist — script still runs if missing |

**Spend note:** **$0** — describe/list only; no creates.

### What the lab does

| Output | Purpose |
|--------|---------|
| Console report | Maps each study resource → integration pattern |
| `night-28-integration-result.json` | ARNs + found/missing flags for notes |
| Decision worksheet | You fill “why this service?” for each GSA step |

**Production safety:** Read-only — does not modify EventBridge, SQS, SNS, ECS, or Iceland task definitions.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-28-lab-integration-audit.ps1
.\HTML\study-lab\night-28-lab-integration-audit.ps1 -PrintDecisionTree
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-28-lab-integration-audit.sh
bash HTML/study-lab/night-28-lab-integration-audit.sh --print-decision-tree
```

| Flag | What happens |
|------|----------------|
| `-PrintDecisionTree` / `--print-decision-tree` | Prints master decision tree after audit |

### End-to-end validation

1. **Result file:** `night-28-integration-result.json` — each resource `found: true/false`.

2. **Expected found (if Nights 12–14 still up):**
   - Rule `saa-study-gsa-iceland-monthly`
   - Rule `saa-study-gsa-iceland-success-to-sqs`
   - Rule `saa-study-gsa-iceland-failure-to-sns`
   - Queue `saa-study-gsa-iceland-completion` + DLQ
   - Topic `saa-study-gsa-iceland-alerts`

3. **Worksheet (5 min on paper):** For each missing resource, write which Night lab recreates it.

4. **Night 32 sketch:** Draw Step Functions states connecting ECS → SQS → Lambda → SNS using `gsa-integration-map.md` capstone diagram.

**Troubleshoot in this order:**

1. All `found: false`? Wrong AWS account/Region — study stack is `us-east-1`.
2. Schedule rule missing but SQS exists? Re-run Night 12 setup script only.
3. FailedInvocations alarm missing? Night 12/14 — alarm is optional for audit pass.
4. Script errors on jq? PowerShell path uses native JSON — Bash needs `aws` only.

### Draw exercise (10 min — exam artifact)

On one page, draw **two** flows without looking at notes:

**Flow A — Success path:** Schedule → ECS → (event) → ? → consumer  
**Flow B — Failure path:** ECS exit 1 → ? → email + inbox queue

Label **EventBridge**, **SQS**, **SNS** on the correct arrows.

### Reference files

- `night-28-lab-integration-audit.ps1` / `.sh` — read-only audit
- `night-28-integration-result.json` — audit output
- `gsa-integration-map.md` — full GSA integration reference
- `night-12-eventbridge-schedule.md`, `night-13-sqs-decoupling.md`, `night-14-sns-fanout.md` — Week 2 deep dives

---

## Block 3 (~30 min) — Quiz + console reading

**File:** `night-28-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=28`.

**Console reading (5 min):**

- EventBridge → **Rules** → open `saa-study-gsa-iceland-monthly` → **Targets** tab → note IAM role.
- SQS → `saa-study-gsa-iceland-completion` → **Dead-letter queue** + **Access policy**.
- SNS → `saa-study-gsa-iceland-alerts` → **Subscriptions** → note SQS protocol + PendingConfirmation on email.

---

## Week 4 map (continued)

| Topic | Night |
|-------|-------|
| ElastiCache Redis cache-aside | 23 |
| Athena on S3 / Iceberg | 24 |
| Route 53 routing policies | 25 |
| CloudFront API caching + throttling | 26 |
| EC2 + EBS + Spot | 27 |
| **Integration services decision tree** | **Tonight (28)** |
| Week 4 review | 29 |

---

## 5 flashcards (write tonight)

1. **EventBridge vs SQS** — One-line when to pick each?  
   *(EventBridge: schedule/route AWS events to targets; SQS: durable pull buffer for workers.)*

2. **SNS vs SQS** — Push or pull?  
   *(SNS push fan-out; SQS pull buffer — often SNS → multiple SQS queues.)*

3. **Kinesis Streams vs Firehose** — Who writes the consumer?  
   *(Streams: you/custom Lambda; Firehose: AWS delivers to S3/Redshift/OpenSearch.)*

4. **FailedInvocations vs exit code 1** — What failed?  
   *(FailedInvocations: rule could not invoke target; exit 1: container ran and failed.)*

5. **Step Functions vs EventBridge+SQS** — When upgrade to SFN?  
   *(Multi-step orchestration with per-step retry/Catch/Wait — Night 32 capstone.)*

---

## Night 29 preview

**Week 4 review** — Storage class decision tree (S3/EBS/EFS), integration + analytics synthesis, 30-question timed drill, architecture notes update before Week 5 cost labs.
