# Night 16 — Lab 2D part 1: Aurora Serverless v2 study stack

~2 hr. **Moderate AWS spend** — Aurora Serverless v2 bills minimum ACU (~0.5) while the cluster exists; tear down when done tonight or keep for Night 17 Lambda lab. Night 9 VPC **must** be up.

## Block 1 (~20 min) — Why Aurora in the Night 9 VPC?

### The problem Night 15 left open

Night 15 covered theory: Multi-AZ, read replicas, Aurora storage, Serverless v2, RDS Proxy. The Global Ski Atlas pipeline still has no **relational home** for stats that need SQL JOINs:

| Access pattern | Store | Why |
|----------------|-------|-----|
| Wiki page-view counter | **DynamoDB** | Key-value, unpredictable scale — already in prod |
| `resort_stats` monthly aggregates with JOINs | **Aurora PostgreSQL** | ACID, ad-hoc SQL, BI tools |

Night 13 SQS completion → stats uploader (Night 17 Lambda) will write rows here. Tonight you deploy the **database layer only** — no Lambda yet.

### Extended architecture

```
Night 9 VPC (private-a / private-b)
        │
        ├── Aurora Serverless v2 cluster (PostgreSQL)
        │       ├── DB subnet group → both private subnets
        │       ├── aurora-sg :5432 ← lambda-stats-sg only
        │       └── Secrets Manager master password
        │
        └── lambda-stats-sg (Night 17 Lambda attaches here)
                └── egress → Aurora writer endpoint :5432

Night 17: Lambda in VPC reads/writes resort_stats row
Night 18: Compare same metric in DynamoDB visitor counter
```

**Exam pattern:** Database in **private subnets**, **no public accessibility**, app connects via **security group reference** (source = app SG, not CIDR `0.0.0.0/0`).

### Core vocabulary (exam)

| Term | Meaning |
|------|---------|
| **DB subnet group** | Subnets Aurora may use — span ≥2 AZs for HA |
| **Cluster vs instance** | Aurora cluster = shared storage; instances = compute (writer/reader) |
| **Serverless v2** | `db.serverless` instance class; ACU min/max on cluster |
| **Writer endpoint** | All writes + default reads; survives failover |
| **Reader endpoint** | Load-balanced read replicas (optional later) |
| **RDS Data API** | HTTPS SQL without persistent TCP from laptop — useful for schema init |

### Decision tree (memorize)

```
Need managed PostgreSQL in VPC?
│
├─ Steady 24/7 load, predictable size?
│     → RDS PostgreSQL provisioned instance
│
├─ Spiky / dev / study workload, seconds-scale scale?
│     → Aurora Serverless v2 (min ACU > 0 — not scale-to-zero)
│
├─ Lambda opens many connections?
│     → RDS Proxy in front (Night 15 theory; optional add-on)
│
└─ Simple key-value counter only?
      → DynamoDB — not Aurora
```

### Exam traps

- **Public accessibility** — turn **off** for production Aurora in private subnets.
- **SG on DB** — allow **app security group** on **5432**, not the whole VPC CIDR unless required.
- **Subnet group** — must be **private** subnets with route to NAT (for Secrets Manager / patching), not public subnets.
- **Serverless v2** — requires at least one `db.serverless` instance; scaling config lives on the **cluster**.
- **Teardown cost** — delete instance + cluster when lab ends; NAT from Night 9 still bills separately.

---

## Block 2 (~80 min) — Lab 2D part 1

### What the lab creates

| Resource | Name |
|----------|------|
| DB subnet group | `saa-study-gsa-aurora-subnets` |
| Aurora cluster | `saa-study-gsa-aurora` (PostgreSQL, Serverless v2) |
| DB instance | `saa-study-gsa-aurora-instance` (`db.serverless`) |
| Database | `gsa_stats` |
| Security group | `saa-study-gsa-aurora-sg` — ingress 5432 from lambda-stats-sg |
| Security group | `saa-study-gsa-lambda-stats-sg` — for Night 17 Lambda ENI |
| Schema (optional) | `resort_stats` table + sample Iceland row |

Reads subnet IDs from `night-9-vpc-ids.json`. Master password stored in **Secrets Manager** (`ManageMasterUserPassword`).

### Run the lab

```powershell
# PowerShell (Windows) — from repo root
.\HTML\study-lab\night-16-lab-aurora-setup.ps1
.\HTML\study-lab\night-16-lab-aurora-setup.ps1 -InitSchema
.\HTML\study-lab\night-16-lab-aurora-setup.ps1 -InitSchema -VerifyRow
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-16-lab-aurora-setup.sh
bash HTML/study-lab/night-16-lab-aurora-setup.sh --init-schema
bash HTML/study-lab/night-16-lab-aurora-setup.sh --init-schema --verify-row
```

| Flag | Use |
|------|-----|
| `-InitSchema` / `--init-schema` | Run `night-16-resort-stats-schema.sql` via RDS Data API (cluster must be `available`) |
| `-VerifyRow` / `--verify-row` | `SELECT` the sample `IS-001` row after schema init |

**First run:** cluster creation takes **5–15 minutes**. Re-runs are idempotent.

**AWS CLI note:** Serverless v2 scaling requires recent AWS CLI **or** Python + boto3 (script auto-runs `night-16-lab-aurora-boto3.py` on older CLI). Master password lands in Secrets Manager `saa-study-gsa-aurora-master` for RDS Data API.

### End-to-end validation

1. **VPC file:** `night-9-vpc-ids.json` exists with private subnet IDs.
2. **Cluster status:** `aws rds describe-db-clusters --db-cluster-identifier saa-study-gsa-aurora --query 'DBClusters[0].Status'`
3. **Private:** `PubliclyAccessible` = `false` on the instance.
4. **Security group:** Aurora SG inbound shows **lambda-stats-sg** on TCP 5432 (not `0.0.0.0/0`).
5. **Schema:** `-InitSchema -VerifyRow` prints `Bláfjöll` row for `IS-001`.
6. **Result file:** `night-16-aurora-result.json` lists endpoints + SG IDs for Night 17.

**Troubleshoot order (cluster stuck / schema fails):**

1. Night 9 VPC still exists? `aws ec2 describe-vpcs --vpc-ids <id from json>`
2. Subnet group uses **private** subnets from `night-9-vpc-ids.json`?
3. Cluster `Status` = `available` before `-InitSchema`?
4. `--enable-http-endpoint` on cluster (RDS Data API) — setup script sets this on create.
5. Secrets Manager secret linked to cluster — `MasterUserSecret` in describe-db-clusters output.

### Reference files

- `night-16-resort-stats-schema.sql` — DDL + seed row
- `night-9-vpc-ids.json` — VPC + subnet IDs from Lab 2A

### Teardown

```powershell
.\HTML\study-lab\night-16-lab-aurora-teardown.ps1
```

```bash
bash HTML/study-lab/night-16-lab-aurora-teardown.sh
```

Deletes Aurora instance + cluster (**skip final snapshot** for study cost), subnet group, and both security groups. **Does not** touch Night 9 VPC, NAT, or Night 12–14 integration labs.

---

## Block 3 (~20 min) — Quiz

**File:** `night-16-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-16-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=16`.

---

## Database domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| RDS Multi-AZ | Sync standby — Night 15 |
| Aurora | Auto storage, fast failover — Night 15 |
| **Aurora Serverless v2 in VPC** | **Tonight — deploy + SG + schema** |
| Lambda → Aurora | Night 17 — read/write row |
| DynamoDB | Wiki counters — Night 18 compare |
| RDS Proxy | Connection pooling — optional add-on |

---

## 5 flashcards (write tonight)

1. **DB subnet group** — why must it span two AZs?
2. **Aurora SG ingress** — why source = lambda-stats-sg instead of `10.0.0.0/16`?
3. **Serverless v2 min ACU** — what happens to billing when idle?
4. **RDS Data API vs psql** — why use Data API for schema init from your laptop?
5. **Writer vs reader endpoint** — which does the stats uploader use for INSERT?

---

## Night 17 preview

Lab 2D part 2 — Lambda in `lambda-stats-sg` connects to Aurora writer endpoint, INSERT/SELECT `resort_stats`, side-by-side with DynamoDB visitor counter. Document when relational wins.
