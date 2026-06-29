# Night 19 — DR + AWS Backup: RTO/RPO and centralized backup policies

~2 hr. **Very low AWS spend** — one tagged DynamoDB study table (Night 18), a backup vault, plan, and optional on-demand job. No VPC. Compare to Night 15 Aurora automated backups and Night 18 DynamoDB PITR.

---

## Plain language first

### RPO and RTO — the two numbers every DR question asks for

| Term | Plain English | GSA example |
|------|---------------|-------------|
| **RPO** (Recovery Point Objective) | Max **data loss** you can tolerate — “how far back in time can we rewind?” | Wiki lost 15 minutes of view counts → RPO must be ≤ 15 min |
| **RTO** (Recovery Time Objective) | Max **downtime** you can tolerate — “how fast must we be back online?” | Site down 4 hours costs a ski-season launch → RTO ≤ 4 hr |

**Analogy:** RPO = how much of your diary can be missing after a fire. RTO = how long until you can read the diary again.

They are **independent**. Low RPO does not imply low RTO (PITR gives fine-grained restore but you still provision a new table).

### Four DR strategies (exam ladder — memorize order)

From **slowest/cheapest** to **fastest/most expensive**:

| Strategy | What you keep running | Typical RTO | Typical RPO | AWS pattern |
|----------|----------------------|-------------|-------------|-------------|
| **Backup and restore** | Backups only; rebuild infra after disaster | Hours–days | Hours (last backup) | AWS Backup snapshots + CloudFormation/Terraform redeploy |
| **Pilot light** | Core pieces minimal in DR Region (DB skeleton, AMIs) | Tens of minutes–hours | Minutes–hours | Small Aurora replica / RDS snapshot copy; scale up on failover |
| **Warm standby** | Scaled-down but **running** DR environment | Minutes | Minutes | ASG min=1 in second Region; Route 53 failover |
| **Multi-site active-active** | Full production in multiple Regions | Near zero | Near zero (async) | DynamoDB global tables, Aurora Global Database, Route 53 latency routing |

**Exam trap:** “Sub-second RPO cross-Region on Aurora” → **Aurora Global Database**, not promote a read replica (Night 15 Q5).

### AWS Backup vs service-native backups

You already touched native backups on Night 15 (Aurora/RDS) and Night 18 (DynamoDB PITR). **AWS Backup** sits **above** them:

```
┌─────────────────────────────────────────────────────────┐
│  AWS Backup — one plan, one retention, one audit trail  │
│  (vault + plan + selection by tag / ARN / org)          │
└───────────────┬─────────────────────────────────────────┘
                │ schedules / on-demand jobs
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
 DynamoDB     RDS/Aurora   EBS         EFS, FSx, …
 (on-demand   (snapshots   (snapshots)
  backup +    in plan)
  optional
  PITR still
  separate)
```

| Need | Use |
|------|-----|
| Restore DynamoDB to **any second** in last 35 days | **PITR** (Night 18) — per table, not AWS Backup |
| One nightly policy for wiki table + Aurora + EBS with 30-day retention | **AWS Backup plan** (Tonight) |
| Ad-hoc snapshot before schema migration | Service **manual snapshot** or **on-demand backup job** |
| Compliance copy in **another Region** | AWS Backup **copy to destination vault** |
| Separate account for immutable copies | AWS Backup **cross-account** + vault lock (awareness) |

**Key distinction:** PITR and AWS Backup **both** protect DynamoDB but serve different jobs — PITR is continuous second-level restore; AWS Backup is **scheduled recovery points** in a vault with centralized lifecycle rules.

### Backup vault, plan, selection, recovery point

| Piece | Plain English |
|-------|---------------|
| **Backup vault** | Encrypted container for recovery points (like an S3 bucket for backups) |
| **Backup plan** | Schedule + retention (e.g. daily 05:00 UTC, delete after 7 days) |
| **Backup selection** | Which resources match — by **tag**, ARN list, or entire service |
| **Backup job** | A run — scheduled or on-demand |
| **Recovery point** | One successful backup artifact you can restore from |

Tonight’s lab tags `saa-study-gsa-wiki-views` with `saa-study-backup=night-19` and selects on that tag.

### Extended architecture (study lab + prod context)

```
Night 18 table (already deployed or run setup first):
  saa-study-gsa-wiki-views  (PITR on — Night 18)
        │
        │ tag saa-study-backup=night-19
        ▼
  AWS Backup selection ──► saa-study-gsa-night19-plan
        │                      │
        │                      └── daily rule → saa-study-gsa-backup-vault
        │
        └── optional on-demand job (tonight -OnDemandBackup)

Night 16/17 parallel (different backup path):
  Aurora automated backups + optional manual snapshot
  (native RDS — can also enroll in AWS Backup plan by tag)

Prod GSA (read-only context):
  DynamoDB WikiPages — PITR in prod account policy
  Central AWS Backup plan — compliance retention across services
```

**Exam pattern in one sentence:** Match **RTO/RPO** to DR strategy first; use **AWS Backup** when the question says **centralized**, **tag-based**, or **cross-Region copy** across multiple services.

### Decision tree (memorize)

```
Question mentions RTO/RPO + multi-Region?
│
├─ Near-zero RTO/RPO, active writes in 2+ Regions?
│     → Multi-site active-active (global tables / Aurora Global Database)
│
├─ Minutes RTO, smaller DR footprint?
│     → Warm standby (scaled-down ASG + DB replica)
│
├─ Core DB copied, compute off until failover?
│     → Pilot light
│
└─ Cheapest, hours/days RTO acceptable?
      → Backup and restore (AWS Backup + IaC redeploy)

Question mentions backup management?
│
├─ One schedule for DynamoDB + RDS + EBS?
│     → AWS Backup plan + tag selection
│
├─ Restore DynamoDB to arbitrary second (35 days)?
│     → PITR (Night 18) — not a substitute for centralized policy
│
├─ Aurora sub-second cross-Region RPO?
│     → Aurora Global Database (Night 15)
│
└─ Before risky migration, keep until you delete?
      → Manual snapshot / on-demand backup job
```

### Exam traps

- **AWS Backup ≠ PITR** — Backup creates **recovery points** on a schedule; PITR is **continuous** second-level restore for DynamoDB (and RDS/Aurora PITR is separate knob).
- **Promote read replica** fixes read scaling, **not** sub-second Global Database RPO.
- **CloudTrail** audits API calls — it is **not** a backup service (Night 18 Q10 trap).
- **Cross-Region copy** in AWS Backup copies **recovery points**, not live table replication — that is global tables / Aurora Global Database.
- **Backup vault delete** requires vault to be **empty** — delete recovery points first (teardown script order matters).

---

## Block 1 (~30 min) — RTO/RPO scenarios for GSA

Work three scenarios on paper before the lab:

| Scenario | Business ask | Best DR pattern | Why |
|----------|--------------|-----------------|-----|
| Wiki counters wrong after bad deploy | RPO 1 hr, RTO 4 hr | PITR or AWS Backup restore to new table | Data rewind; redeploy Lambda if needed |
| us-east-1 Region hard-down | RPO minutes, RTO minutes | Warm standby or Aurora Global Database + Route 53 failover | Backup-only is too slow for minutes RTO |
| Compliance: 90-day retention across RDS + DynamoDB + EBS | Central audit | AWS Backup plan with 90-day lifecycle + optional copy to DR vault | One policy, tag `Backup=prod` |

Read [AWS Backup — how it works](https://docs.aws.amazon.com/aws-backup/latest/devguide/how-it-works.html) (10 min) — focus on vault, plan, selection, copy jobs.

---

## Block 2 (~60 min) — Lab: vault + plan + tag selection + on-demand job

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI configured | `aws sts get-caller-identity` |
| Night 18 study table exists | `aws dynamodb describe-table --table-name saa-study-gsa-wiki-views` |
| No dependency on Night 9 VPC or Night 16 Aurora | Standalone; tags Night 18 table only |

If the table is missing, run Night 18 setup first (table only is fine — stream Lambda optional).

### What the lab creates

| Resource | Name | What it does |
|----------|------|--------------|
| Backup vault | `saa-study-gsa-backup-vault` | Stores recovery points |
| Backup plan | `saa-study-gsa-night19-plan` | Daily rule, delete after 7 days |
| Backup selection | `saa-study-gsa-night19-selection` | Resources tagged `saa-study-backup=night-19` |
| IAM role | `saa-study-gsa-backup-role` (or existing default) | Backup service assumes to snapshot |
| Tag on table | `saa-study-backup=night-19` | On `saa-study-gsa-wiki-views` |

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-19-lab-backup-setup.ps1
.\HTML\study-lab\night-19-lab-backup-setup.ps1 -OnDemandBackup -VerifyJob
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-19-lab-backup-setup.sh
bash HTML/study-lab/night-19-lab-backup-setup.sh --on-demand-backup --verify-job
```

| Flag | What happens |
|------|----------------|
| `-OnDemandBackup` / `--on-demand-backup` | Starts immediate backup job for the study table |
| `-VerifyJob` / `--verify-job` | Polls until job `COMPLETED` (requires on-demand flag) |
| `-SkipTag` / `--skip-tag` | Plan + vault only — assumes tag already set |

### End-to-end validation

1. **Vault exists:**  
   `aws backup describe-backup-vault --backup-vault-name saa-study-gsa-backup-vault`

2. **Plan + selection:**  
   `aws backup list-backup-plans --query 'BackupPlansList[?BackupPlanName==\`saa-study-gsa-night19-plan\`]'`

3. **Table tagged:**  
   `aws dynamodb list-tags-of-resource --resource-arn <table-arn>`

4. **Recovery point (after on-demand job):**  
   `aws backup list-recovery-points-by-backup-vault --backup-vault-name saa-study-gsa-backup-vault`

5. **Result file:** `night-19-backup-result.json` in `study-lab/`.

**Troubleshoot in this order:**

1. Does `saa-study-gsa-wiki-views` exist? Run Night 18 setup if not.
2. Is the table tagged `saa-study-backup=night-19`?
3. Did the backup job fail with `AccessDenied`? Re-run setup — it ensures the backup IAM role and managed policies.
4. Job `PENDING` > 10 min — check `aws backup describe-backup-job --backup-job-id <id>` for status message.

### Compare backup paths (Nights 15–19)

| Question | Aurora (Night 15–16) | DynamoDB PITR (Night 18) | AWS Backup (Tonight) |
|----------|---------------------|---------------------------|----------------------|
| Continuous second-level restore? | Aurora PITR window (1–35 days) | Yes — 35 days | No — discrete recovery points |
| Central policy across services? | Enroll cluster by tag | Enroll table by tag | **Yes — core use case** |
| Cross-Region copy? | Snapshot copy / Global Database | Global tables (live repl.) | Copy action in backup plan |
| Restore overwrites source? | Restore creates new cluster/instance | **New table** | Restore creates new resource |

### Reference files

- `night-19-backup-result.json` — vault ARN, plan ID, selection ID, job ID
- `night-18-dynamodb-result.json` — source table ARN from Night 18

### Teardown

```powershell
.\HTML\study-lab\night-19-lab-backup-teardown.ps1
```

```bash
bash HTML/study-lab/night-19-lab-backup-teardown.sh
```

Deletes recovery points, selection, plan, vault, and lab backup IAM role. **Does not** delete Night 18 table or Aurora stack. Removes `saa-study-backup` tag from the study table.

---

## Block 3 (~30 min) — Quiz + cross-Region copy reading

**File:** `night-19-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=19`.

**Cross-Region copy reading (10 min, no deploy):**

- [AWS Backup copy to another Region](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html)
- Sketch: vault `us-east-1` → copy action → vault `us-west-2`; RPO ≥ copy frequency.

---

## Database + DR domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| Aurora Serverless v2 in VPC | Night 16 |
| Lambda → Aurora writer (TCP 5432) | Night 17 |
| DynamoDB PITR + Streams | Night 18 |
| **RTO/RPO + AWS Backup centralized policies** | **Tonight** |
| ElastiCache read caching | Night 22 (preview from Night 15) |

---

## 5 flashcards (write tonight)

1. **RPO vs RTO** — One sentence each with a GSA wiki example.  
   *(RPO = max data loss window; RTO = max downtime to restore => service.)*

2. **Backup and restore vs warm standby** — Which has lower cost and which has lower RTO?  
   *(Backup/restore = cheaper, higher RTO; warm standby = running DR, lower RTO.)*

3. **AWS Backup vs DynamoDB PITR** — When pick each?  
   *(PITR = second-level rewind one table; Backup = scheduled recovery points + multi-service policy.)*

4. **Tag-based selection** — Why tag `saa-study-backup=night-19` instead of hard-coding ARNs?  
   *(New tables with same tag auto-enroll; IaC-friendly; no plan edit per resource.)*

5. **Aurora Global Database vs AWS Backup cross-Region copy** — Live replication or snapshot copy?  
   *(Global Database = continuous live repl. sub-second RPO; Backup copy = periodic recovery points in DR vault.)*

---

## Night 20 preview

Migration and transfer — **AWS DMS** (database migration) + **S3** as staging for Aurora/DynamoDB exports. Tie backup recovery points to “restore elsewhere, then DMS sync delta.”
