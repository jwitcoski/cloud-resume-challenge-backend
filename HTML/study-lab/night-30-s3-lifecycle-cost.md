# Night 30 — Lab 4A: S3 lifecycle + cost (storage classes, Cost Explorer, Budgets)

~2 hr. **$0–$1 AWS spend** — lifecycle rules are configuration-only (no immediate transition charges). Cost Explorer and Budgets are read/alert tools. Optional `-CreateBudget` sends a confirmation email — **$0 until you confirm**. Applies the Night 29 storage tree to `globalskiatlas-backend-k8s-output`.

---

## Plain language first

### What is S3 lifecycle?

**S3 lifecycle** is a **bucket-level automation** that moves or deletes objects based on **age**, **prefix**, or **tags** — so you do not manually change storage class every month.

**Analogy (GSA Iceland):** Each monthly pipeline run lands in `iceland/2026-06/`, `iceland/2026-07/`, … Lifecycle is the **warehouse manager** who slides last year’s boxes to cheaper shelves (Standard-IA, then Glacier) while this month’s box stays on the **fast pick floor** (Standard).

### S3 storage class ladder (exam refresher)

| Class | Retrieval | Cost | GSA fit |
|-------|-----------|------|---------|
| **Standard** | ms | $$$ storage | Current `iceland/YYYY-MM/` |
| **Intelligent-Tiering** | ms | monitoring fee + auto tiers | Unknown access pattern |
| **Standard-IA** | ms | cheaper storage, retrieval fee | Last 6–12 months pipeline |
| **One Zone-IA** | ms, **one AZ** | cheaper than Standard-IA | Reproducible data only |
| **Glacier Flexible Retrieval** | minutes–hours | archive $ | Old compliance copies |
| **Glacier Deep Archive** | 12+ hours | lowest $ | Rare legal hold |

**Night 29 tree leaf:** lifecycle automates moves **along this ladder** — it does not replace picking the right class at upload.

### Lifecycle vs replication vs versioning

| Feature | Job |
|---------|-----|
| **Lifecycle** | Cost optimization — transition/delete by age |
| **Replication (CRR/SRR)** | Durability / latency — copy to another bucket/Region |
| **Versioning** | Keep history — pairs with **noncurrent** lifecycle rules |

**Exam trap:** Expiring the **only** copy in one bucket is not DR — pair expiration with replication or AWS Backup (Night 19).

### Cost Explorer vs Budgets vs CUR

| Tool | Question it answers |
|------|---------------------|
| **Cost Explorer** | “What did we spend last month — by service, tag, Region?” |
| **AWS Budgets** | “Email me when spend hits $X or **forecast** exceeds $Y.” |
| **CUR** | “Export every line item to S3 for custom analysis.” |

Tonight’s lab runs **Cost Explorer** (`get-cost-and-usage`) and optionally creates a **monthly cost budget** with an email alert.

---

## Block 1 (~30 min) — Storage classes + GSA prefix map

### Read `gsa-s3-lifecycle-map.md`

```
globalskiatlas-backend-k8s-output
  iceland/2026-06/   ← Night 10 durable output (Standard today)
  iceland/2026-07/   ← next monthly run
```

### Lifecycle rule we apply tonight

| Setting | Value | Rationale |
|---------|-------|-----------|
| Rule ID | `saa-study-night30-iceland-archive` | Teardown removes **only** this ID |
| Filter prefix | `iceland/` | Iceland pipeline months |
| Day 90 | → **Standard-IA** | Infrequent reads after ~3 months |
| Day 365 | → **Glacier Flexible Retrieval** | Annual archive tier |
| Abort MPU | 7 days | Stop paying for stuck multipart uploads |

**Production safety:** Transitions run on **object age** — nothing moves tonight unless objects are already that old. Script **merges** this rule into existing lifecycle config without deleting other rules.

### Exam minimums (write in notes)

- Standard → Standard-IA: object at least **30 days** in current class before transition.
- Standard-IA has **30-day minimum storage** charge per object.
- **Glacier retrieval** is a separate line item — lifecycle saves storage $, not retrieval $.
- **Intelligent-Tiering** monitoring fee per object — worth it when access is unpredictable.

### Decision tree (memorize)

```
Object in S3?
│
├─ Hot / unpredictable access?
│     → Standard or Intelligent-Tiering
│
├─ Infrequent, still ms GET?
│     → Standard-IA (or One Zone-IA if reproducible)
│
├─ Archive, hours retrieval OK?
│     → Glacier Flexible or Deep Archive
│
└─ Aging automatically?
      → Lifecycle transitions + optional expiration
```

---

## Block 2 (~60 min) — Lab: lifecycle + Cost Explorer + Budget

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| S3 bucket access | `aws s3api head-bucket --bucket globalskiatlas-backend-k8s-output` |
| Cost Explorer enabled | Default on — first API call may take a few seconds |
| Budget email (optional) | `-BudgetEmail you@example.com` for `-CreateBudget` |

**Spend note:** Lifecycle config is free. Budget alerts are free; **charges still accrue** — budget does not cap spend. Cost Explorer API is free for standard reports.

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| Lifecycle rule | `saa-study-night30-iceland-archive` | Archive old `iceland/` prefixes |
| Demo objects (optional) | `saa-study-night30/demo/` | Tiny files for prefix listing |
| Budget (optional) | `saa-study-night30-monthly` | $25 monthly cost alert |
| Result file | `night-30-s3-lifecycle-result.json` | Rule snapshot + top services |

**Does not change:** Iceland ECS task, EventBridge rules, object storage class immediately, or non-`iceland/` prefixes.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-30-lab-s3-lifecycle-setup.ps1
.\HTML\study-lab\night-30-lab-s3-lifecycle-setup.ps1 -UploadDemoObjects -CreateBudget -BudgetEmail you@example.com
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-30-lab-s3-lifecycle-setup.sh
bash HTML/study-lab/night-30-lab-s3-lifecycle-setup.sh --upload-demo --create-budget --budget-email you@example.com
```

| Flag | What happens |
|------|----------------|
| `-UploadDemoObjects` / `--upload-demo` | PUT 2 small files under `saa-study-night30/demo/` |
| `-CreateBudget` / `--create-budget` | Creates monthly USD budget + email notification |
| `-BudgetEmail` / `--budget-email` | Required with budget flag — confirm SNS email |

### End-to-end validation

1. **Result file:** `night-30-s3-lifecycle-result.json` — rule ID, bucket, top 5 services by cost.

2. **S3 console:** Bucket → **Management** → **Lifecycle rules** → `saa-study-night30-iceland-archive` → verify transitions at 90 / 365 days on prefix `iceland/`.

3. **List prefixes:** `aws s3 ls s3://globalskiatlas-backend-k8s-output/iceland/` — note monthly folders from Nights 10–12.

4. **Cost Explorer (CLI output):** Script prints top services last 30 days — compare NAT Gateway vs S3 vs RDS in your account.

5. **Budget (optional):** AWS Billing → **Budgets** → `saa-study-night30-monthly` → confirm email subscription if pending.

**Troubleshoot in this order:**

1. `AccessDenied` on bucket? You need `s3:GetLifecycleConfiguration` + `s3:PutLifecycleConfiguration` on the bucket — use the GSA admin role or study account.
2. Lifecycle merge failed? Check for malformed existing rules — script saves previous config path in result file.
3. Cost Explorer empty? New accounts need 24 h of data — rerun next day.
4. Budget create failed? Verify `-BudgetEmail` and `budgets:ModifyBudget` permission.
5. `NoncurrentVersionTransitions` skipped? Expected if bucket versioning is **Suspended** — script omits that block.

### Console reading (10 min)

- **S3** → `globalskiatlas-backend-k8s-output` → **Metrics** → **Storage** — total bytes (compare after future lifecycle runs).
- **Billing** → **Cost Explorer** → filter **Service** = S3 vs EC2-Other (NAT) vs RDS.
- **S3 Storage Lens** (optional read-only) — incomplete multipart uploads awareness.

### Reference files

- `night-30-lab-s3-lifecycle-setup.ps1` / `.sh` — merge lifecycle + Cost Explorer + optional budget
- `night-30-lifecycle-rule.json` — rule body merged by scripts
- `gsa-s3-lifecycle-map.md` — bucket/prefix map
- `night-29-week-4-review.md` — storage class decision tree (Block 1)

### Teardown

```powershell
.\HTML\study-lab\night-30-lab-s3-lifecycle-teardown.ps1
```

```bash
bash HTML/study-lab/night-30-lab-s3-lifecycle-teardown.sh
```

Removes **only** the `saa-study-night30-iceland-archive` lifecycle rule, optional demo prefix objects, and study budget. **Does not** delete `iceland/` pipeline output or other lifecycle rules.

---

## Block 3 (~30 min) — Quiz + cost pillar notes

**File:** `night-30-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz/30/`.

**Write one cost win per tier:**

| Tier | Night 30 sentence |
|------|-------------------|
| Storage | Lifecycle `iceland/` → IA → Glacier; abort stale MPU |
| Compute | (preview Night 31) Fargate right-sizing |
| Network | (Night 29) VPC endpoints vs NAT for S3/ECR |
| Data | Athena partition keys vs full-bucket scan |

---

## Week 5 map (started)

| Topic | Night |
|-------|-------|
| **S3 lifecycle + Cost Explorer + Budgets** | **Tonight (30)** |
| Fargate right-sizing + Savings Plans | 31 |
| Step Functions capstone | 32 |
| Architecture write-up | 33 |

---

## 5 flashcards (write tonight)

1. **Standard vs Standard-IA** — When is IA wrong for hot `iceland/` data?  
   *(Frequent GET/PUT — retrieval and minimum-duration charges; keep current month Standard.)*

2. **Lifecycle minimum** — Can you transition to Standard-IA on day 1?  
   *(No — object must satisfy minimum days in current class; exam often says 30.)*

3. **Glacier** — Does lifecycle eliminate retrieval fees?  
   *(No — storage $ down; restore still billed per GB and tier.)*

4. **Cost Explorer vs Budget** — Which one sends forecast alerts?  
   *(Budgets — Explorer visualizes; Budgets threshold/forecast notifications.)*

5. **Iceland durable output** — EBS or S3 for archived months?  
   *(S3 with lifecycle — EBS is scratch on compute only; Night 27/29.)*

---

## Night 31 preview

**Lab 4B — Fargate right-sizing** — compare `ecs-task-pipeline-*.json` CPU/memory, Savings Plans vs Spot vs On-Demand, read Compute Optimizer recommendations for Iceland task family.

---

## Reference links

- [S3 lifecycle configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [AWS Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
