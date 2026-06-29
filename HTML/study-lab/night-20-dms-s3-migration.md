# Night 20 — Migration & Transfer: DMS + S3 staging for database moves

~2 hr. **Very low AWS spend** — S3 storage for export files only (pennies). No DMS replication instance unless you opt into the optional `-DeployDmsEndpoints` flag (creates endpoints only; still no replication instance). Builds on Night 18 DynamoDB (PITR required for export), Night 16 Aurora (DMS target in theory), and Night 19 backups (restore elsewhere, then sync delta).

---

## Plain language first

### Why migration is a separate exam domain from DR

Night 19 answered **“how do we recover after disaster?”** Tonight answers **“how do we move data from A to B while the business keeps running?”**

| Question | DR (Night 19) | Migration (Tonight) |
|----------|---------------|---------------------|
| Trigger | Outage, corruption, Region failure | Planned cutover, cloud move, engine change |
| Primary tools | AWS Backup, PITR, Global Database | **DMS**, S3 staging, DataSync, Snowball |
| Typical outcome | Restore **same** shape in DR | Land in **new** target (Aurora, DynamoDB, S3 data lake) |
| Ongoing sync? | Replication / global tables | **CDC** — see next section |

**GSA story:** On-prem resort_stats PostgreSQL → **Aurora** in Night 9 VPC. Wiki counters stay in **DynamoDB**. Bulk historical wiki rows might export to **S3** for analytics (Athena Night 23) or import into a new table after schema change.

### CDC — Change Data Capture (define this first)

**CDC** stands for **Change Data Capture**. Plain English: **after the initial copy, keep reading every new insert, update, and delete from the source database and apply those changes to the target** — so the target stays current while production still runs on the old system.

**Analogy (GSA wiki):** Imagine photocopying every wiki page on Monday (**full load**). Through the week, editors keep fixing typos and bumping view counts on the **original** wiki. CDC is the intern who watches the edit log every few seconds and updates the **copy** with only what changed — not re-photocopying the whole site every time.

**Two phases — almost every DMS cutover uses both:**

| Phase | What happens | GSA example |
|-------|--------------|---------------|
| **Full load** | Copy all existing rows once | All `resort_stats` rows land in Aurora |
| **CDC** | Stream ongoing changes from the source’s **transaction log** | New ski-season INSERTs replicate while the old DB is still live |

**What DMS reads for CDC (exam awareness — source must expose logs):**

| Source engine | Log DMS tail |
|---------------|--------------|
| PostgreSQL / Aurora PostgreSQL | WAL (Write-Ahead Log) |
| MySQL / MariaDB / Aurora MySQL | Binary log (binlog) |
| Oracle | Redo/archivelog |
| SQL Server | Transaction log |

**CDC is not tonight’s lab.** DynamoDB **export to S3** is a **one-time snapshot** of table data at a point in time — it does **not** stream live writes afterward. CDC is the DMS concept you need when the exam says “minimal downtime migration” or “keep target in sync until cutover.”

**Cutover checklist (when CDC is in play):**

1. Full load finished.
2. CDC running — check **replication lag** (seconds behind source).
3. Stop writes to source (maintenance window).
4. Wait until lag ≈ **0**.
5. Point apps at target and decommission source.

### AWS DMS — the database migration workhorse

**AWS Database Migration Service (DMS)** moves relational and NoSQL data between sources and targets with minimal downtime.

```
┌──────────────────┐     full load + CDC      ┌──────────────────┐
│  Source DB       │ ───────────────────────► │  Target DB       │
│  (on-prem Oracle │   DMS replication      │  (Aurora Postgres│
│   or RDS MySQL)  │   instance or Serverless │   or DynamoDB)   │
└──────────────────┘                        └──────────────────┘
         │                                              ▲
         │  optional S3 staging (parquet/csv)           │
         └──────────────────────────────────────────────┘
```

| Piece | Plain English |
|-------|---------------|
| **Replication instance** | EC2-sized worker DMS manages (or **DMS Serverless** — auto-scales) |
| **Source endpoint** | Connection info + engine type for where data leaves |
| **Target endpoint** | Connection info for where data lands |
| **Migration task** | Full load only, CDC only, or **full load + CDC** (most common cutover pattern) |
| **Full load** | One-time copy of all existing rows — table scan / export |
| **CDC** | **C**hange **D**ata **C**apture — read the source transaction log after full load and apply every new insert/update/delete to the target until cutover |

**Homogeneous vs heterogeneous:**

| Type | Example | Extra tool? |
|------|---------|-------------|
| **Homogeneous** | PostgreSQL → Aurora PostgreSQL | DMS alone — same engine family |
| **Heterogeneous** | Oracle → Aurora PostgreSQL | **SCT** for schema + **DMS** for data — see below |

### SCT — AWS Schema Conversion Tool (schema only; DMS moves rows)

**SCT** = **AWS Schema Conversion Tool**. Plain English: a **desktop app** that reads your **source database schema** (tables, indexes, views, stored procedures) and **generates equivalent DDL for the target engine** — plus a report flagging what it could not auto-convert.

**Analogy (GSA):** DMS is the moving truck that hauls **rows** from the old resort_stats database to Aurora. SCT is the **architect** who redraws the floor plan when the old building was Oracle and the new one is PostgreSQL — `VARCHAR2` → `VARCHAR`, Oracle sequences → Postgres sequences, stored procedure syntax rewritten or marked “manual fix needed.”

**Who does what in a heterogeneous migration:**

| Tool | Job | Does not do |
|------|-----|-------------|
| **SCT** | Convert **schema** (DDL) + assess compatibility | Copy live data; run in production |
| **DMS** | **Full load + CDC** — copy and sync **data** | Auto-fix every Oracle-specific query in your app |

**Typical order:** SCT converts schema → apply DDL on Aurora → DMS full load + CDC from Oracle → cutover.

**When you do *not* need SCT:** **Homogeneous** moves — e.g. PostgreSQL → Aurora PostgreSQL (Night 16 stack). Same SQL dialect; DMS alone.

**Exam trap:** DMS **replicates data** — it does **not** automatically rewrite application code. SCT helps schema; your team still updates connection strings and hand-fixes SQL the report flagged.

### S3 as migration staging (Tonight’s hands-on)

Not every migration uses DMS end-to-end. AWS native **export/import** often stages in S3:

| Path | Service | Staging format | When |
|------|---------|----------------|------|
| DynamoDB → S3 | **Export to point in time** | DynamoDB JSON or Ion | Analytics, cross-account move, backup beyond PITR |
| S3 → DynamoDB | **Import from S3** | CSV or DynamoDB JSON | Bulk load new table |
| Aurora/RDS → S3 | **Snapshot export to S3** | Parquet (Apache Iceberg path later) | Data lake, ML features |
| On-prem files → S3 | **DataSync**, Snowball, Transfer Family | Files | Bulk file transfer |

Tonight’s lab runs **DynamoDB export to S3** on `saa-study-gsa-wiki-views` (Night 18). That is the **same staging bucket** a DMS S3 target or Athena would read — tying “migration” to concrete storage.

```
Night 18 table (PITR on)
  saa-study-gsa-wiki-views
        │
        │ export-table-to-point-in-time
        ▼
S3  saa-study-gsa-migration-298043721974
      night-20/dynamodb/wiki-views/   ← Tonight
        │
        ├──► (exam) DMS S3 target / Glue / Athena
        └──► (exam) import-table → new DynamoDB table
```

**PITR requirement:** DynamoDB export uses continuous backup metadata — table must have PITR enabled (Night 18 lab turns this on).

### Tie Night 19 backup → Night 20 migration

Classic **lift-and-shift database** cutover:

1. **Night 19:** On-demand backup / snapshot before change window.
2. **Restore** snapshot to new Aurora cluster in target VPC (or new Region).
3. **DMS full load + CDC** from **production** source to restored target — catches writes during migration window.
4. **Cutover:** Stop writes to source, wait for CDC lag ≈ 0, point apps to target.

AWS Backup recovery points and DMS solve **different** problems — backup = rewind; DMS = **forward sync** to a live target.

### Migration & Transfer decision matrix (exam)

| Scenario | Best fit | Why not the others |
|----------|----------|-------------------|
| Oracle on-prem → Aurora PostgreSQL, minimal downtime | **DMS** full load + CDC + **SCT** | DataSync = files not DB logs; Snowball = offline bulk |
| 500 TB on-prem NAS → S3, network is 1 Gbps | **Snowball** or Snowball Edge | DataSync online would take weeks |
| Nightly 200 GB file sync on-prem ↔ AWS | **DataSync** | DMS is for databases |
| Partners upload CSV via SFTP into your landing bucket | **Transfer Family** → S3 | DMS expects DB endpoints |
| Lift-and-shift 200 VMware VMs with block replication | **Application Migration Service (MGN)** | DMS is DB-only |
| DynamoDB table → S3 for Athena SQL | **DynamoDB export to S3** | DMS can target DynamoDB but export is simpler for bulk extract |
| Same-engine RDS → RDS size change | Snapshot restore or **DMS homogeneous** | Heterogeneous SCT not needed |

**Bandwidth rule of thumb:** If transfer time > ~1 week at your link speed, evaluate **Snowball**. DataSync and DMS assume **online** paths.

### DMS Serverless vs replication instance

| | Replication instance | DMS Serverless |
|--|---------------------|----------------|
| Billing | Instance hours (always on while exists) | Capacity units during tasks |
| Ops | Pick size (dms.t3.medium …) | AWS scales |
| Exam cue | Steady long migrations | Spiky or unknown duration |

Study lab **does not** start a replication instance by default — cost. Optional flag documents endpoints only for console familiarity.

### Exam traps

- **DMS ≠ database upgrade service** — does not patch engines or resize RDS automatically.
- **CDC source requirements** — source must expose logs (PostgreSQL WAL, MySQL binlog, Oracle redo). DynamoDB uses streams/other paths — know **export/import** for DynamoDB.
- **DataSync ≠ DMS** — DataSync is **file/object** replication; DMS is **database** replication.
- **Snowball ≠ Snowmobile** — Snowmobile is exabyte-scale container truck; Snowball Edge has local compute.
- **Transfer Family** — managed **SFTP/FTP/FTPS** into S3/EFS, not generic DB migration.
- **S3 export is async** — poll `ExportDescription.ExportStatus`; not instant like GetItem.

---

## Block 1 (~30 min) — Migration scenarios for GSA

Work three scenarios on paper:

| Scenario | Source → Target | Tool chain |
|----------|-----------------|------------|
| Monthly resort_stats from legacy SQL Server to Aurora | Heterogeneous DB | SCT schema + DMS full load + CDC |
| Wiki view counters already in DynamoDB; archive 2024 pages to data lake | DynamoDB → S3 | **Export to point in time** (Tonight) → Athena (Night 23) |
| 80 TB video files from resort lodge NAS to S3 | Files | Snowball Edge or DataSync |

Read (15 min):

- [AWS DMS — how it works](https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html) — endpoints, tasks, CDC.
- [DynamoDB export to S3](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ExportToS3.html) — PITR prerequisite.

---

## Block 2 (~60 min) — Lab: S3 staging bucket + DynamoDB export

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI configured | `aws sts get-caller-identity` |
| Night 18 table + PITR | `aws dynamodb describe-continuous-backups --table-name saa-study-gsa-wiki-views` → `PointInTimeRecoveryStatus: ENABLED` |
| No Night 9 VPC required | Standalone S3 + DynamoDB export |

If the table is missing, run Night 18 setup first.

### What the lab creates

| Resource | Name | What it does |
|----------|------|--------------|
| S3 bucket | `saa-study-gsa-migration-298043721974` | Staging for DynamoDB export files (SSE-S3) |
| Export prefix | `night-20/dynamodb/wiki-views/` | DynamoDB JSON export location |
| Tag on bucket | `saa-study-migration=night-20` | Exam pattern — tag-based lifecycle later |

Same-account export uses your caller IAM permissions; current AWS CLI does **not** require a separate `--export-role-arn` parameter.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-20-lab-migration-setup.ps1
.\HTML\study-lab\night-20-lab-migration-setup.ps1 -ExportTable -VerifyExport
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-20-lab-migration-setup.sh
bash HTML/study-lab/night-20-lab-migration-setup.sh --export-table --verify-export
```

| Flag | What happens |
|------|----------------|
| `-ExportTable` / `--export-table` | Starts DynamoDB export of wiki-views to S3 |
| `-VerifyExport` / `--verify-export` | Polls until export `COMPLETED` (requires export flag) |
| `-SkipBucket` / `--skip-bucket` | Assume bucket + role exist — export only |

### End-to-end validation

1. **Bucket exists:**  
   `aws s3api head-bucket --bucket saa-study-gsa-migration-298043721974`

2. **PITR enabled:**  
   `aws dynamodb describe-continuous-backups --table-name saa-study-gsa-wiki-views --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription'`

3. **Export started (after `-ExportTable`):**  
   `aws dynamodb list-exports --table-arn <table-arn>`

4. **Objects in S3 (after COMPLETED):**  
   `aws s3 ls s3://saa-study-gsa-migration-298043721974/night-20/dynamodb/wiki-views/ --recursive`

5. **Result file:** `night-20-migration-result.json` in `study-lab/`.

**Troubleshoot in this order:**

1. Does `saa-study-gsa-wiki-views` exist with PITR **ENABLED**? Night 18 setup enables it.
2. Export `FAILED` with access denied? Ensure your IAM user/role has `dynamodb:ExportTableToPointInTime` and S3 write on the migration bucket.
3. Export `IN_PROGRESS` > 15 min on tiny table — check `aws dynamodb describe-export --export-arn <arn>`.
4. Bucket name globally taken? Script uses account-scoped name; change suffix only if collision.

### Optional: DMS endpoint sketch (console, no replication instance)

If you want console familiarity without replication-instance cost:

1. Open **AWS DMS → Endpoints → Create endpoint**.
2. Source type **PostgreSQL**, target **Amazon Aurora** — use Night 16 cluster endpoint (if still deployed).
3. **Stop before** creating a replication instance — note which SG rules DMS would need (5432 from replication instance SG to `saa-study-gsa-aurora-sg`).

Document in your notes: **full load + CDC task** would run after replication instance exists.

### Compare migration paths (Nights 16–20)

| Question | Aurora snapshot | DynamoDB PITR | DynamoDB export (Tonight) | DMS CDC |
|----------|-----------------|---------------|---------------------------|---------|
| Continuous sync to live target? | No | No (restore = new table) | No | **Yes** |
| Format for analytics / S3? | Parquet via snapshot export | No native SQL export | **DynamoDB JSON in S3** | Optional S3 target |
| Homogeneous Postgres→Aurora? | Restore snapshot | N/A | N/A | **Primary use case** |
| Cost while idle | Snapshot storage | PITR billing | S3 object storage | Replication instance hours |

### Reference files

- `night-20-migration-result.json` — bucket, export ARN
- `night-18-dynamodb-result.json` — source table ARN

### Teardown

```powershell
.\HTML\study-lab\night-20-lab-migration-teardown.ps1
```

```bash
bash HTML/study-lab/night-20-lab-migration-teardown.sh
```

Empties and deletes the migration bucket. **Does not** delete Night 18 DynamoDB table, Night 16 Aurora, or Night 19 backup vault.

---

## Block 3 (~30 min) — Quiz + DMS Serverless reading

**File:** `night-20-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=20`.

**Reading (10 min, no deploy):**

- [DMS Serverless](https://docs.aws.amazon.com/dms/latest/userguide/dms-serverless.html) — when exam mentions “variable migration workload.”
- Skim [AWS DataSync vs Snowball](https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html) — online vs offline file transfer.

---

## Database + Migration domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| Aurora Serverless v2 in VPC | Night 16 |
| Lambda → Aurora writer | Night 17 |
| DynamoDB PITR + Streams | Night 18 |
| RTO/RPO + AWS Backup | Night 19 |
| **DMS + S3 staging / DynamoDB export** | **Tonight** |
| VPN + Direct Connect + TGW | Night 21 (preview) |

---

## 5 flashcards (write tonight)

1. **CDC (Change Data Capture)** — One sentence: what it captures, and what log source DMS reads for Postgres.  
   *(Ongoing inserts/updates/deletes from source transaction log → target; Postgres/Aurora uses WAL.)*

2. **Full load vs CDC** — Which runs first in a DMS cutover, and why you need both.  
   *(Full load = initial bulk copy; CDC = catch live changes until lag is zero and you flip apps.)*

2. **Homogeneous vs heterogeneous** — Oracle→Aurora example and when SCT is required.  
   *(Heterogeneous needs SCT for schema; homogeneous same engine family.)*

3. **DataSync vs DMS vs Snowball** — One-line pick for files, database, offline petabytes.  
   *(DataSync online files; DMS databases; Snowball offline bulk.)*

4. **DynamoDB export vs PITR restore** — When export to S3 vs restore to new table?  
   *(Export = portable files in S3; PITR restore = new live DynamoDB table same account.)*

5. **Night 19 backup + Night 20 DMS** — How do snapshot and CDC combine in a migration window?  
   *(Snapshot/backup seeds target; DMS CDC catches delta until cutover.)*

---

## Night 21 preview

Hybrid networking — **Site-to-Site VPN**, **Direct Connect**, **Transit Gateway**, and **PrivateLink** vs VPC peering. Diagram three exam scenarios (on-prem to VPC, multi-VPC hub, SaaS via PrivateLink).
