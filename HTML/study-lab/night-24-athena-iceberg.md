# Night 24 — Lab 3B: Athena on Iceberg — SQL analytics on S3

~2 hr. **Very low AWS spend** — Athena charges per TB scanned (tiny Parquet file tonight); S3 storage pennies in the Night 20 migration bucket. No VPC deploy. Night 20 migration bucket **must** exist (reuses `saa-study-gsa-migration-*` staging zone).

---

## Plain language first

### What is Athena?

**Amazon Athena** is **serverless SQL** over data in **S3**. You write standard SQL (`SELECT`, `GROUP BY`, `JOIN`); Athena reads files, returns rows. **No servers to manage** — pay per query based on **data scanned**.

**Analogy:** The resort chain’s **corporate spreadsheet team** does not copy every lodge’s ledger into a new database. They open the **monthly export folder in S3**, run SQL across Parquet files, and email a summary. OLTP front desks (Aurora) keep taking bookings; analytics reads **copies** in the lake.

**Not OLTP.** Athena is for **ad hoc analytics, reports, and data lake queries** — not millisecond transactional updates.

### Glue Data Catalog — the phone book

Athena needs to know **where files live** and **what columns they have**. That metadata lives in the **AWS Glue Data Catalog** (databases + tables).

| Piece | Plain English | Tonight |
|-------|---------------|---------|
| **Glue database** | Namespace (like a schema) | `saa_study_gsa_analytics` |
| **Glue table** | Column names + S3 location + format | `resort_snapshot` (Iceberg) |
| **Crawler** | Auto-discover schema from S3 | **Not tonight** — explicit DDL + CTAS |
| **PyIceberg / register_iceberg.py** | App registers Iceberg metadata | GSA **prod backend** pattern — exam awareness |

**Exam trap:** Glue **ETL jobs** and **crawlers** are related services — Athena only needs the **catalog**, not a running Glue job, to query S3.

### Apache Iceberg on S3

**Iceberg** is an **open table format** for huge analytics datasets in S3. It adds what raw Parquet folders lack:

| Feature | Why it matters |
|---------|----------------|
| **Snapshots** | Time travel — query “as of yesterday” |
| **Schema evolution** | Add columns without rewriting all history |
| **Hidden partitioning** | Faster pruning without brittle `s3://bucket/year=2024/...` paths in every query |

**GSA prod:** GeoParquet pipeline → S3 → Glue catalog → Iceberg snapshots (`register_iceberg.py` in backend). **Tonight’s lab** uses Athena **engine v3** `CREATE TABLE … table_type=ICEBERG` CTAS — same exam story, study-scale data.

**Contrast Night 20 export:** DynamoDB export lands **DynamoDB JSON** under `night-20/dynamodb/wiki-views/` — great staging, awkward SQL. Tonight’s **`resort_snapshot` Parquet** models an **Aurora snapshot export** — relational columns ready for `GROUP BY country_code`.

### Athena vs Aurora vs Redshift (exam table)

| | **Aurora (Nights 16–17)** | **Athena (Tonight)** | **Redshift** |
|--|---------------------------|----------------------|--------------|
| **Workload** | OLTP — transactions, UPSERTs | Ad hoc SQL on S3 / lake | Data warehouse — complex BI |
| **Data location** | Managed cluster storage | **Your S3 buckets** | Cluster/local SSD |
| **Scale model** | ACU / instances | **Per query**, serverless | Nodes / Serverless RPU |
| **Latency** | Milliseconds | Seconds (scan bound) | Seconds–minutes |
| **GSA fit** | `resort_stats` live rows | **Resort counts by country** on snapshot | Nightly exec dashboards at scale |

**Pick Athena when:** SQL on S3/Glue catalog, unpredictable query volume, no cluster ops.  
**Pick Aurora when:** App needs **consistent low-latency writes/reads** with ACID.  
**Pick Redshift when:** Petabyte warehouse, heavy JOINs across curated marts, BI tool concurrency.

### Partitioning + cost (scan less data)

Athena bills on **data scanned**. **Partition columns** (e.g. `country_code`, `dt`) let Athena **skip** irrelevant S3 prefixes.

```
s3://bucket/resort_snapshot/country_code=US/*.parquet
s3://bucket/resort_snapshot/country_code=IS/*.parquet
```

Tonight’s tiny file scans **kilobytes** — cost is effectively **$0**. On a 10 TB bucket, forgetting partitions is an **exam cost trap**.

**Iceberg** can manage partition evolution without rewriting every query.

### Workgroups + result location

| Setting | Purpose |
|---------|---------|
| **Workgroup** | Isolate teams, enforce **output S3 path**, engine version, CloudWatch metrics |
| **ResultConfiguration.OutputLocation** | `s3://bucket/night-24/athena-results/` — query CSV results land here |
| **Engine version 3** | Required for **Iceberg** DDL features used tonight |

---

## Block 1 (~20 min) — Analytics path on the GSA data lake

### End-to-end flow (study lab)

```
Night 16 Aurora resort_stats (OLTP source of truth)
        │
        │  (exam) snapshot export / ETL job
        ▼
S3  saa-study-gsa-migration-*/night-24/staging/resort_snapshot/*.parquet
        │
        │  Glue external table (staging)
        ▼
Athena CTAS → Iceberg table resort_snapshot @ night-24/iceberg/
        │
        ▼
SQL: SELECT country_code, COUNT(*) … GROUP BY country_code
        │
        ▼
Results → s3://…/night-24/athena-results/ + console table

Parallel path (Night 20 — not tonight’s SQL target):
  DynamoDB wiki-views → export → night-20/dynamodb/wiki-views/ (DynamoDB JSON)
```

### Decision tree (memorize)

```
Need SQL over files already in S3?
│
├─ Ad hoc, serverless, pay per query?
│     → Athena + Glue catalog (Tonight)
│
├─ Huge curated warehouse + BI concurrency?
│     → Redshift / Redshift Serverless
│
├─ Need live transactional UPSERTs with ACID?
│     → Aurora / RDS (Nights 16–17) — NOT Athena
│
└─ Need managed Spark ETL before SQL?
      → Glue ETL or EMR → write Parquet/Iceberg → Athena queries output
```

### Exam traps

- **Athena does not load data into itself** — data stays in **S3**; Athena reads it.
- **Glue crawler ≠ required** — manual DDL or CTAS is valid; crawlers help messy buckets.
- **DynamoDB JSON export ≠ Parquet** — know **export format** when picking Athena SerDe vs re-ETL.
- **Workgroup output bucket** — must be writable; queries fail without valid `OutputLocation`.
- **Iceberg vs plain Parquet folder** — Iceberg adds snapshot/time-travel semantics; both live on S3.

---

## Block 2 (~70 min) — Lab: Glue catalog + Iceberg + resort counts

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| Night 20 migration bucket | `aws s3api head-bucket --bucket saa-study-gsa-migration-298043721974` |
| AWS CLI + Python 3 | `aws sts get-caller-identity` ; `python --version` |
| pyarrow | `python -m pip install pyarrow` (seed script) |

Night 16 Aurora **does not** need to be running — tonight uses a **standalone Parquet snapshot** in the same bucket Night 20 created. Night 9 VPC **not required**.

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| S3 objects | `night-24/staging/resort_snapshot/` | Sample Parquet (8 resorts, 5 countries) |
| S3 objects | `night-24/iceberg/resort_snapshot/` | Iceberg table data + metadata |
| Glue database | `saa_study_gsa_analytics` | Catalog namespace |
| Glue tables | `resort_snapshot_staging`, `resort_snapshot` | Staging Parquet + Iceberg |
| Athena workgroup | `saa-study-gsa-athena` | Engine v3, result path enforced |
| Query output | `night-24/athena-results/` | CSV results from SQL runs |

### Run the lab

```powershell
# PowerShell — from repo root
python -m pip install pyarrow
.\HTML\study-lab\night-24-lab-athena-setup.ps1
```

```bash
# Git Bash / WSL
python -m pip install pyarrow
bash HTML/study-lab/night-24-lab-athena-setup.sh
```

| Flag | What happens |
|------|----------------|
| `-SkipSeed` / `--skip-seed` | Skip Parquet upload — re-run DDL only |
| `-RunQuery` / `--run-query` | Force aggregate query (default runs on full setup) |

**First run** takes **2–5 min** (Iceberg CTAS + query). Re-runs drop/recreate tables idempotently.

### End-to-end validation

1. **Glue database:**  
   `aws glue get-database --name saa_study_gsa_analytics --region us-east-1`

2. **Iceberg table in catalog:**  
   `aws glue get-table --database-name saa_study_gsa_analytics --name resort_snapshot --region us-east-1 --query 'Table.Parameters.table_type'`  
   → `ICEBERG`

3. **Expected query result** (country → resort count):

   | country_code | resort_count |
   |--------------|--------------|
   | US | 3 |
   | IS | 2 |
   | FR | 1 |
   | JP | 1 |
   | NO | 1 |

4. **Athena console:** Workgroup `saa-study-gsa-athena` → run:

   ```sql
   SELECT country_code, COUNT(*) AS resort_count
   FROM saa_study_gsa_analytics.resort_snapshot
   GROUP BY country_code
   ORDER BY resort_count DESC;
   ```

5. **Result file:** `night-24-athena-result.json` in `study-lab/`.

**Troubleshoot in this order:**

1. Bucket missing? Run `night-20-lab-migration-setup.ps1` (bucket only is fine).
2. `pyarrow` import error? `python -m pip install pyarrow`.
3. Athena `Insufficient permissions` on S3? Caller needs `s3:PutObject` on results prefix + `s3:GetObject` on staging/iceberg paths.
4. Iceberg DDL fails? Confirm workgroup uses **Athena engine version 3**.
5. Zero rows? Re-run without `-SkipSeed`; verify `aws s3 ls s3://…/night-24/staging/resort_snapshot/`.
6. Iceberg CTAS fails with “backquoted identifiers are not supported”? Use **double quotes** for Iceberg DDL (`"db"."table"`); DROP/EXTERNAL staging DDL still uses **backticks** on engine v3 — the lab scripts handle both.

### Compare OLTP vs analytics (read-only)

| Question | Aurora (Night 16) | Athena (Tonight) |
|----------|-------------------|------------------|
| Who writes? | Lambda stats uploader UPSERT | ETL / export jobs write S3 files |
| Who reads? | Cache-aside Lambda (Night 23) | Analysts, dashboards, ad hoc SQL |
| Freshness | Milliseconds | Snapshot / batch — **stale by design** |
| Best query | `SELECT * FROM resort_stats WHERE resort_id = ?` | `GROUP BY country_code` across millions of rows |

### Reference files

- `night-24-lab-seed-parquet.py` — 8-row resort snapshot
- `night-24-athena-result.json` — Glue paths, query ID, aggregate results
- `night-20-migration-result.json` — shared migration bucket
- GSA prod: backend `register_iceberg.py` — same catalog story at production scale

### Teardown

```powershell
.\HTML\study-lab\night-24-lab-athena-teardown.ps1
```

```bash
bash HTML/study-lab/night-24-lab-athena-teardown.sh
```

Deletes workgroup, Glue database/tables, and **`night-24/` S3 prefix only**. **Does not** delete Night 20 `night-20/` export, Night 16 Aurora, or Night 18 DynamoDB.

---

## Block 3 (~30 min) — Quiz + Athena vs Redshift decision table

**File:** `night-24-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=24`.

**Console reading (5 min):**

- Athena → **Recent queries** → open tonight’s aggregate → note **Data scanned** (bytes). On 8 rows it is tiny; imagine the same query without partition filter on terabytes.
- Glue → **Tables** → `resort_snapshot` → **Parameters** tab → confirm `table_type=ICEBERG`.

### Athena vs Redshift quick pick (write in notes)

| Scenario | Pick |
|----------|------|
| CFO runs 2 SQL reports/month on S3 exports | **Athena** |
| 200 analysts + Tableau on 50 TB curated star schema | **Redshift** |
| Live booking UPSERT on `resort_stats` | **Aurora** |
| Transform raw JSON logs to Parquet nightly | **Glue ETL** → then Athena |

---

## Week 4 map (continued)

| Topic | Night |
|-------|-------|
| ElastiCache Redis cache-aside | 23 |
| **Athena on S3 / Iceberg** | **Tonight (24)** |
| Route 53 routing policies | 25 |
| CloudFront API caching | 26 |

---

## 5 flashcards (write tonight)

1. **Athena billing** — What metric drives cost?  
   *(Data scanned per query — partition to scan less.)*

2. **Glue catalog role** — One sentence: what Athena reads from Glue?  
   *(Table schema + S3 location + format so SQL knows what to scan.)*

3. **Iceberg vs raw Parquet folder** — One benefit of Iceberg for GSA snapshots?  
   *(e.g. snapshot time travel, schema evolution, managed partitioning.)*

4. **Athena vs Aurora** — When is Aurora the wrong tool for “resort counts by country across 5 years of exports”?  
   *(Heavy analytics on bulk historical files in S3 — use Athena/lake, not OLTP cluster.)*

5. **Night 20 vs Night 24 S3 paths** — What does each hold?  
   *(Night 20: DynamoDB JSON wiki export. Night 24: relational Parquet/Iceberg resort snapshot for SQL.)*

---

## Night 25 preview

**Route 53 routing policies** — simple, weighted, latency, failover, geolocation. Map GSA multi-Region failover and health checks on the wiki ALB.
