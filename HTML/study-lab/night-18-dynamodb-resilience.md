# Night 18 — DynamoDB resilience: PITR + Streams + stub stream Lambda

~2 hr. **Very low AWS spend** — on-demand DynamoDB with a handful of wiki counter rows + a tiny Lambda. No VPC required tonight. Compare to Night 17’s Aurora TCP path.

---

## Plain language first

### What is PITR?

**Point-in-time recovery (PITR)** is DynamoDB’s **undo button for the whole table**.

- AWS continuously backs up your table data in the background.
- You can restore the table to **any second within the last 35 days** (exam number).
- Restore creates a **new table** — it does not overwrite the original.
- Works on **on-demand and provisioned** billing modes.

**Analogy:** Git history for your table — pick a timestamp, clone to a new repo, leave the original alone.

**Not the same as:**

| Feature | What it does |
|---------|----------------|
| **PITR** | Restore table to any second in last 35 days → **new table** |
| **On-demand backup** | Manual snapshot you name and keep until you delete it |
| **AWS Backup** (Night 19) | One policy schedules backups across DynamoDB, RDS, EBS, etc. |

### What are DynamoDB Streams?

A **DynamoDB Stream** is an **ordered log of row changes** on a table.

Every `INSERT`, `MODIFY`, or `REMOVE` can emit a stream record. Other AWS services (usually **Lambda**) subscribe and react — audit log, replicate to OpenSearch, fan-out to SQS, etc.

```
Wiki API Lambda ──UpdateItem ADD viewCount──► saa-study-gsa-wiki-views
                                                      │
                                                      │ stream record
                                                      ▼
                                        saa-study-gsa-wiki-stream-processor
                                        (stub — prints old/new viewCount)
```

**Stream view types** (what data appears in each record):

| View type | In the record | Use when |
|-----------|---------------|----------|
| **KEYS_ONLY** | Partition/sort keys only | You only need to know *which* item changed |
| **NEW_IMAGE** | Item after the change | Forward the new state somewhere |
| **OLD_IMAGE** | Item before the change | Audit “what was deleted” |
| **NEW_AND_OLD_IMAGES** | Both | Diff old vs new (tonight’s lab) |

### Stream + Lambda event source mapping

Same wiring pattern as Night 13 SQS → Lambda, different source:

| | SQS (Night 13) | DynamoDB Stream (Tonight) |
|--|----------------|----------------------------|
| Trigger | Message in queue | Row change on table |
| Delivery | At-least-once | At-least-once |
| Starting position | N/A (poll queue) | `LATEST` (new changes only) or `TRIM_HORIZON` (from oldest retained) |
| Batch | `BatchSize` messages | `BatchSize` stream records (up to 10 default) |
| Idempotency | Required (duplicate messages) | Required (duplicate stream records possible) |

**Exam trap:** Stream Lambda failures retry the **batch** — design handlers to tolerate replays (log-only stub is safe; incrementing an external counter is not unless idempotent).

### Global tables (awareness — no lab deploy)

**DynamoDB global tables** replicate a table **across Regions** for low-latency local reads and multi-Region resilience.

- **Active-active** — apps in `us-east-1` and `eu-west-1` both write to their local replica.
- **Eventually consistent** across Regions (not strong cross-Region consistency).
- Conflict resolution: **last writer wins** per item.
- Use case: GSA wiki read latency in Europe without routing every GET to Virginia.

Tonight you **read** the docs only — deploying global tables doubles table cost and is overkill for a study counter.

### Night 17 vs Night 18 — same metric, different store

| | Night 17 — Aurora | Night 18 — DynamoDB |
|--|-------------------|---------------------|
| **Metric** | `monthly_runs` on `IS-001` | `viewCount` on `wiki/iceland` |
| **Write** | `INSERT … ON CONFLICT DO UPDATE` over TCP 5432 | `UpdateItem ADD viewCount :1` |
| **Network** | Lambda in VPC + ENI | No VPC — public AWS API |
| **Trigger** | SQS completion message | API Gateway wiki GET (prod) / manual bump (lab) |
| **Downstream** | SQL BI / JOIN reports | Stream Lambda audit (lab stub) |
| **Backup** | Aurora automated backups + PITR-like restore | DynamoDB PITR (35 days) |

---

## Block 1 (~30 min) — Why DynamoDB for GSA wiki counters?

### The problem Night 17 contrasted

Night 17 wrote **relational batch stats** to Aurora — rows analysts JOIN in SQL. GSA **wiki page views** are the opposite access pattern:

- One partition key per page (`wiki/iceland`).
- Operation: increment a number millions of times.
- No JOINs, no schema migrations, unpredictable traffic spikes.

That is DynamoDB’s sweet spot — already live on GSA prod (`WikiPages`, `Revisions`, `Comments` behind `/api/wiki*`).

### Extended architecture (study lab + prod context)

```
Prod path (already deployed):
  CloudFront /api/wiki* → API Gateway → wiki-api Lambda → DynamoDB WikiPages

Tonight’s study path (isolated table — does not touch prod):
  Manual bump or script
        │
        ▼
  saa-study-gsa-wiki-views  (PITR on, stream NEW_AND_OLD_IMAGES)
        │
        ▼
  saa-study-gsa-wiki-stream-processor  (stub — CloudWatch log only)

Night 17 parallel (different metric):
  SQS completion → stats-uploader Lambda → Aurora resort_stats UPSERT
```

**Exam pattern in one sentence:** Enable **PITR** for accidental-delete recovery; enable **Streams** when downstream code must react to every row change; wire **Lambda event source mapping** with `StartingPosition=LATEST` for new changes only.

### Core vocabulary

| Term | Plain English | Exam shorthand |
|------|---------------|----------------|
| **PITR** | Continuous backup; restore to new table within 35 days | `update-continuous-backups` |
| **Stream shard** | Ordered partition of change records | Iterator + `GetRecords` |
| **Event source mapping** | Lambda polls stream on your behalf | Same concept as SQS mapping |
| **On-demand billing** | Pay per request; no capacity planning | `PAY_PER_REQUEST` |
| **DAX** | In-memory cache in front of DynamoDB | Read-heavy hot keys — not tonight |
| **Global tables** | Multi-Region replicated DynamoDB | Active-active, eventual cross-Region |

### Decision tree (memorize)

```
Need to react to every DynamoDB row change?
│
├─ Downstream is Lambda?
│     → DynamoDB Streams + Lambda event source mapping
│
├─ Downstream is Kinesis consumer / custom app?
│     → DynamoDB Streams → Kinesis adapter (legacy) or Lambda fan-out
│
├─ Need cross-Region low-latency reads + writes?
│     → Global tables (awareness)
│
└─ Need sub-second cache for hot reads?
      → DAX cluster in front of table

Accidentally deleted table or bad batch update?
│
├─ Within last 35 days?
│     → PITR restore-table-to-point-in-time → new table
│
└─ Need centralized backup policy across services?
      → AWS Backup (Night 19)
```

### Exam traps

- **PITR restore** → **new table name**, not in-place overwrite.
- **Stream + LATEST** → Lambda ignores changes that happened **before** the mapping was created. Use `TRIM_HORIZON` only if you need to reprocess retained history.
- **Stream view type** cannot change arbitrarily without disabling/re-enabling stream — plan `NEW_AND_OLD_IMAGES` up front if you need diffs.
- **DynamoDB vs Aurora for counters** — `ADD viewCount :1` beats SQL `UPDATE … SET count = count + 1` for wiki traffic; Aurora wins for `JOIN` reports (Night 15–17).
- **VPC endpoint** — Lambda in VPC calling DynamoDB should use a **gateway VPC endpoint** (Night 8) to skip NAT charges — tonight’s stream Lambda is **not** in VPC.

---

## Block 2 (~60 min) — Lab: PITR + Streams + stub processor

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI configured | `aws sts get-caller-identity` |
| No dependency on Night 9 VPC or Night 16 Aurora | Standalone lab |

This lab creates its **own** study table. It does **not** modify prod `WikiPages`.

### What the lab creates

| Resource | Name | What it does |
|----------|------|--------------|
| DynamoDB table | `saa-study-gsa-wiki-views` | On-demand; PK `pageId`; seed wiki counters |
| PITR | on table above | 35-day continuous backup |
| DynamoDB Stream | `NEW_AND_OLD_IMAGES` | Emits old/new `viewCount` on MODIFY |
| IAM role | `saa-study-gsa-wiki-stream-role` | Stream read + CloudWatch Logs |
| Lambda | `saa-study-gsa-wiki-stream-processor` | Stub — JSON log per stream record |
| Event source mapping | Stream → Lambda | `StartingPosition=LATEST`, batch 10 |

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-18-lab-dynamodb-setup.ps1
.\HTML\study-lab\night-18-lab-dynamodb-setup.ps1 -BumpView -VerifyStream
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-18-lab-dynamodb-setup.sh
bash HTML/study-lab/night-18-lab-dynamodb-setup.sh --bump-view --verify-stream
```

| Flag | What happens |
|------|----------------|
| `-BumpView` / `--bump-view` | `UpdateItem ADD viewCount` on `wiki/iceland` (mirrors prod counter bump) |
| `-VerifyStream` / `--verify-stream` | Poll CloudWatch for stream processor JSON log lines |
| `-SkipStreamMapping` / `--skip-stream-mapping` | Table + PITR only — no Lambda |

### End-to-end validation

1. **PITR enabled:**  
   `aws dynamodb describe-continuous-backups --table-name saa-study-gsa-wiki-views --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'`  
   → `PointInTimeRecoveryStatus: ENABLED`

2. **Stream ARN exists:**  
   `aws dynamodb describe-table --table-name saa-study-gsa-wiki-views --query 'Table.{Stream:LatestStreamArn,View:StreamSpecification.StreamViewType}'`

3. **Bump + stream log:** After `-BumpView -VerifyStream`, CloudWatch log group `/aws/lambda/saa-study-gsa-wiki-stream-processor` shows JSON like:  
   `{"eventName":"MODIFY","pageId":"wiki/iceland","oldViewCount":"0","newViewCount":"1",...}`

4. **Result file:** `night-18-dynamodb-result.json` in `study-lab/`.

5. **Optional PITR drill (read-only):**  
   `aws dynamodb restore-table-to-point-in-time --source-table-name saa-study-gsa-wiki-views --target-table-name saa-study-gsa-wiki-views-restored --restore-date-time 2026-06-27T12:00:00Z`  
   Creates a **second table** — delete it after inspecting to avoid extra storage cost.

**Troubleshoot in this order:**

1. Is the event source mapping **Enabled**? `aws lambda list-event-source-mappings --function-name saa-study-gsa-wiki-stream-processor`
2. Did you bump **after** mapping existed? `LATEST` skips earlier changes.
3. Wait 5–10 s after bump — stream → Lambda is asynchronous.
4. Check Lambda errors in the same log group (not just filter `wiki/`).

### Compare prod visitor counter (read-only)

Cloud Resume / GSA prod Lambda (`lambda/lambda_function.py`):

```python
table.update_item(
    Key={'id': 'count'},
    UpdateExpression='SET visitCount = :c',
    ExpressionAttributeValues={':c': Decimal(new_count)},
)
```

Tonight’s study table uses **`ADD viewCount :inc`** — the exam-preferred atomic increment (no read-modify-write race).

| Question | DynamoDB (Tonight) | Aurora (Night 17) |
|----------|-------------------|-------------------|
| Atomic increment? | `ADD` on numeric attribute | `monthly_runs = monthly_runs + 1` in UPSERT |
| React to change? | Streams → Lambda | SQS → Lambda (different trigger) |
| Accidental delete? | PITR → new table | Aurora automated backup / restore |

### Reference files

- `night-18-lab-stream-handler.py` — stub processor
- `night-18-dynamodb-result.json` — table ARN, stream ARN, mapping UUID
- `night-17-lambda-stats-result.json` — Aurora contrast from last night

### Teardown

```powershell
.\HTML\study-lab\night-18-lab-dynamodb-teardown.ps1
```

```bash
bash HTML/study-lab/night-18-lab-dynamodb-teardown.sh
```

Deletes study table, stream Lambda, and IAM role. **Does not** touch prod wiki tables or Night 16/17 Aurora stack.

---

## Block 3 (~30 min) — Quiz + global tables reading

**File:** `night-18-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=18`.

**Global tables reading (10 min, no deploy):**

- [DynamoDB global tables — how it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html)
- Sketch: US writer + EU reader both accept PutItem; conflict → last writer wins.

---

## Database domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| Aurora Serverless v2 in VPC | Night 16 |
| Lambda → Aurora writer (TCP 5432) | Night 17 |
| **DynamoDB PITR + Streams + stream Lambda** | **Tonight** |
| AWS Backup centralized policies | Night 19 |

---

## 5 flashcards (write tonight)

1. **PITR retention** — How many days, and what happens to the original table on restore?  
   *(35 days max; restore creates a **new** table.)*

2. **NEW_AND_OLD_IMAGES** — Why pick it over KEYS_ONLY for an audit Lambda?  
   *(See before/after values — e.g. old vs new viewCount.)*

3. **StartingPosition LATEST** — What changes does a new mapping miss?  
   *(Everything before the mapping existed — only new stream records after enable.)*

4. **Stream vs SQS** — What triggers tonight’s stub Lambda vs Night 13 stats uploader?  
   *(DynamoDB row MODIFY vs SQS message from EventBridge.)*

5. **DynamoDB vs Aurora for wiki views** — One sentence each.  
   *(DynamoDB: atomic ADD on partition key at any scale. Aurora: overkill unless you need SQL JOIN reports on views.)*

---

## Night 19 preview

DR + backup patterns — RTO/RPO scenarios, **AWS Backup** vs service-native snapshots vs cross-Region copy. Tie tonight’s DynamoDB PITR to Aurora backup windows and centralized policies.
