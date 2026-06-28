# Night 17 — Lab 2D part 2: Lambda stats uploader → Aurora

~2 hr. **Low–moderate AWS spend** — Lambda in your VPC + Aurora min ACU from Night 16. Night 9 VPC, Night 16 Aurora (with schema), and Night 13 SQS completion queue **must** be up.

---

## Plain language first — terms you asked about

Read this section before the diagrams. Exam prep uses the shorthand; this is what the words actually mean.

### What is TCP? (and what is port 5432?)

**TCP** is just a **reliable way for two programs to talk over a network** — like a phone call that stays connected while you send data back and forth.

- Your Lambda code opens a **TCP connection** to Aurora.
- **5432** is PostgreSQL’s **port number** — the “extension number” on the database server.
- When the lab says **TCP 5432**, it means: *Lambda dials Aurora on port 5432 and keeps the line open long enough to run SQL.*

This is **not** a “TCP Proxy.” There is no AWS service called that. You may have seen **RDS Proxy** (below) — different thing.

**Contrast — RDS Data API (Night 16 `-InitSchema`):**

| Path | How it works | Analogy |
|------|----------------|---------|
| **TCP + port 5432** (Tonight’s Lambda) | Persistent database connection from inside the VPC | Phone call to the DB |
| **RDS Data API** (Night 16 from laptop) | One-off HTTPS requests with SQL in the body | Sending a letter through a web API |

Both can run SQL. Tonight’s lab uses the **phone call** path because that is what most “Lambda talks to private Aurora” exam questions test.

### What is an ENI?

**ENI = Elastic Network Interface.**

Plain English: **a virtual network card** — the piece that plugs a compute resource into a specific subnet in your VPC.

- Your laptop is not in the VPC, so it cannot dial Aurora on TCP 5432 directly (Aurora is private).
- When you put **Lambda in the VPC**, AWS creates an **ENI** in your private subnet(s).
- That ENI gets a **private IP address** inside the VPC (e.g. `10.0.3.45`).
- Traffic from your Lambda function **goes out through that ENI**, through security groups, to Aurora.

**Why the first `-TestInvoke` feels slow (15–45 seconds):**

On a **cold start**, Lambda may need to **create or attach that network card** before it can reach Aurora. That extra setup is the ENI delay — not Aurora “waking up” (Serverless v2 does not scale to zero).

**You do not create the ENI yourself.** You set `VpcConfig` (subnets + security groups) on the Lambda; AWS manages the ENI.

**Hyperplane ENI** (exam trivia): AWS optimized ENI attachment so it is faster than the early days of VPC Lambda. You still need VPC + security groups for private DB access — optimization does not remove that requirement.

### What is RDS Proxy?

**RDS Proxy** is an **optional middleman service** that sits **between your app and Aurora/RDS**.

```
Without RDS Proxy (Tonight’s lab):
  Lambda ──TCP 5432──► Aurora

With RDS Proxy (optional add-on, Night 15 theory):
  Lambda ──► RDS Proxy ──► Aurora
              (pools connections)
```

**Problem it solves:** Each Lambda invocation can **open a new database connection**. Aurora has a **connection limit**. If 200 Lambdas run at once, you can exhaust connections or slow everything down.

**What the proxy does:**

- Keeps a **pool** of open connections to Aurora.
- Many Lambdas talk to the **proxy**; the proxy **reuses** a smaller set of connections to the database.
- Like a **receptionist** who takes many callers and uses a few internal lines instead of every caller getting a dedicated line to the CEO.

**Tonight you do not deploy RDS Proxy.** One study Lambda + one Aurora cluster does not need it. Know it for the exam when the scenario says *“hundreds of concurrent Lambdas”* or *“too many database connections.”*

### What is a security group in this lab? (quick recap)

A **security group** is a **firewall attached to a resource** (Lambda ENI, Aurora, etc.).

- **Outbound** = traffic the resource initiates (Lambda → Aurora).
- **Inbound** = traffic others initiate **to** the resource.

Tonight:

- **Lambda SG** (`lambda-stats-sg`): **no inbound rules needed** — Lambda is the caller, not the listener.
- **Aurora SG** (`aurora-sg`): **inbound TCP 5432 only from `lambda-stats-sg`** — not from the whole internet, not from `0.0.0.0/0`.

### What is Secrets Manager doing here?

The database username and password live in **Secrets Manager** (created in Night 16). At runtime the Lambda:

1. Reads `DB_SECRET_ARN` from its environment (the **ARN is an ID**, not the password).
2. Calls `GetSecretValue` to fetch username + password.
3. Uses those to log in to Aurora over TCP 5432.

We **do not** paste the master password into a Lambda environment variable — it would show up in the console and logs.

---

## Block 1 (~20 min) — Why Lambda in the VPC for Aurora?

### The problem Night 16 left open

Night 16 deployed Aurora in **private subnets** with **no public accessibility**. That means:

- Aurora has **no public IP address** on the internet.
- Your home laptop **cannot** open a normal PostgreSQL client (`psql`) to it.
- Night 16 used **RDS Data API** (HTTPS) from your laptop to run the schema — a special exception.

The **production stats path** for Iceland batch completion is different: a **Lambda inside the VPC** opens a **direct database connection** when SQS delivers a message.

```
Night 13 SQS completion message
        │
        ▼
Night 17 Lambda (runs in private subnets, uses lambda-stats-sg)
        │
        │  Opens TCP connection to Aurora on port 5432
        │  (uses ENI AWS attaches in your subnet)
        ▼
Aurora resort_stats row updated (monthly_runs + 1)
```

The uploader must run **inside the VPC network** — or use an alternate path (RDS Data API or RDS Proxy). See decision tree below.

### Extended architecture

```
Night 12 schedule → Iceland Fargate → exit 0
        │
        ▼
Night 13 EventBridge rule → SQS saa-study-gsa-iceland-completion
        │
        ▼
Night 17 Lambda (SQS triggers it automatically)
        │
        ├── Secrets Manager → fetch DB username/password at runtime
        ├── ENI in private-a / private-b (lambda-stats-sg on that ENI)
        └── pg8000 library → TCP 5432 → Aurora writer endpoint
                │
                ▼
        resort_stats UPSERT (monthly_runs + 1)

Parallel path (already in prod on your resume site):
Wiki page view → API Gateway → Lambda → DynamoDB UpdateItem (counter)
```

**Exam pattern in one sentence:** Put Lambda in the VPC so it gets an ENI; allow Aurora to accept TCP 5432 **only** from the Lambda’s security group; read the DB password from Secrets Manager.

### Core vocabulary (exam shorthand → plain English)

| Term | Plain English | Exam shorthand |
|------|---------------|----------------|
| **Lambda VPC attachment** | Tell Lambda which subnets and security groups to use; AWS creates ENI(s) there | `VpcConfig` on create-function |
| **Cold start + ENI** | First run after idle may wait while the virtual network card is ready | Plan Lambda timeout ≥ 30s |
| **Writer endpoint** | The hostname that always points at the primary database for **writes** | Use for INSERT/UPDATE |
| **Reader endpoint** | Hostname that load-balances **read-only** queries across replicas | Do **not** use for INSERT tonight |
| **SQS event source mapping** | AWS wires the queue to Lambda — Lambda polls and runs when messages arrive | Created by setup script |
| **UPSERT** | Insert a row, or update it if the key already exists | `INSERT … ON CONFLICT DO UPDATE` |
| **RDS Proxy** | Connection pooler between many apps and Aurora | Optional; not in tonight’s lab |
| **RDS Data API** | Run SQL over HTTPS without a VPC ENI | Night 16 schema init from laptop |

### Decision tree (memorize)

```
Lambda needs Aurora PostgreSQL in private subnets?
│
├─ Normal app-style SQL connection (pg8000 / psycopg2)?
│     → Lambda in VPC + ENI + Aurora SG allows Lambda SG on TCP 5432
│
├─ Hundreds of concurrent Lambdas overwhelming DB connections?
│     → Add RDS Proxy between Lambda and Aurora (pool connections)
│
├─ Occasional HTTPS SQL from outside VPC, no ENI wanted?
│     → RDS Data API (Night 16 -InitSchema path)
│
└─ Simple counter / key lookup only, no SQL JOINs?
      → DynamoDB — not Aurora
```

### Aurora vs DynamoDB for GSA (write tonight)

| Workload | Store | Why |
|----------|-------|-----|
| Wiki page-view counter | **DynamoDB** | One key per page; increment a number; no tables to JOIN |
| `resort_stats` monthly aggregates + BI JOINs | **Aurora** | Rows, SQL, `JOIN`, reports in Excel/Metabase/etc. |
| Iceland completion event | **SQS → Lambda** | Batch job finishes → message queued → uploader runs later (Night 13) |

**Hands-on compare:** After `-TestInvoke`, `monthly_runs` on `IS-001` goes from 1 → 2 in Aurora. A wiki counter would be a single DynamoDB attribute incremented — no SQL, no row schema.

### Exam traps

- **Lambda in VPC without NAT** — Lambda still needs to reach **Secrets Manager** and **CloudWatch Logs** on the public AWS APIs. Private subnets need the Night 9 **NAT Gateway** (or VPC endpoints) for that outbound traffic. DB traffic to Aurora stays **inside** the VPC.
- **Wrong endpoint** — **INSERT** must use the **writer** endpoint. The reader endpoint is for read replicas.
- **Password in env var** — use Secrets Manager + IAM `GetSecretValue`, not `DB_PASSWORD=plaintext`.
- **Lambda SG inbound empty** — correct. Lambda **calls** Aurora; Aurora does not call Lambda.
- **SQS visibility timeout (60s) vs Lambda timeout (30s)** — visibility must be **≥** Lambda timeout so the message stays hidden while Lambda works. If Lambda times out, the message can be retried.

---

## Block 2 (~80 min) — Lab 2D part 2

### Prerequisites

| Night | Resource | How to check |
|-------|----------|--------------|
| 9 | VPC + private subnets | File `night-9-vpc-ids.json` exists in `study-lab/` |
| 16 | Aurora cluster + `resort_stats` table | File `night-16-aurora-result.json` exists **or** cluster status is `available` |
| 13 | Completion queue | Queue `saa-study-gsa-iceland-completion` exists in SQS console |

If Night 16 was torn down, re-run (takes 5–15 min for Aurora to become `available`):

```powershell
.\HTML\study-lab\night-16-lab-aurora-setup.ps1 -InitSchema -VerifyRow
```

### What the lab creates

| Resource | Name | What it does |
|----------|------|--------------|
| IAM role | `saa-study-gsa-stats-uploader-role` | Lets Lambda write logs, use VPC ENI, read DB secret, read SQS |
| Lambda function | `saa-study-gsa-stats-uploader` | Python code that UPSERTs `resort_stats` |
| Event source mapping | SQS → Lambda | Auto-invoke Lambda when Iceland completion messages arrive |
| Log group | `/aws/lambda/saa-study-gsa-stats-uploader` | Where `print` and errors show up |

Lambda is placed in **private subnets** with **`lambda-stats-sg`**, reads credentials from **Secrets Manager**, connects to the **writer endpoint** hostname from `night-16-aurora-result.json`.

### Run the lab

```powershell
# PowerShell (Windows) — from repo root
.\HTML\study-lab\night-17-lab-lambda-stats-setup.ps1
.\HTML\study-lab\night-17-lab-lambda-stats-setup.ps1 -TestInvoke
.\HTML\study-lab\night-17-lab-lambda-stats-setup.ps1 -TestInvoke -VerifyRow
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-17-lab-lambda-stats-setup.sh
bash HTML/study-lab/night-17-lab-lambda-stats-setup.sh --test-invoke
bash HTML/study-lab/night-17-lab-lambda-stats-setup.sh --test-invoke --verify-row
```

| Flag | What happens |
|------|----------------|
| `-TestInvoke` / `--test-invoke` | Manually run Lambda once with a fake “Iceland completed” payload for resort `IS-001` |
| `-VerifyRow` / `--verify-row` | Query Aurora via RDS Data API from your laptop; print `monthly_runs` (should increase after invoke) |
| `-SkipSqsMapping` / `--skip-sqs-mapping` | Deploy Lambda only — no automatic SQS trigger |

**First `-TestInvoke`:** expect **15–45 seconds**. Lambda is attaching its ENI in the VPC. Timeout is 30s — if you see `Task timed out`, wait 30 seconds and run `-TestInvoke` again (second attempt is usually fast).

**Package note:** setup runs `pip install pg8000` into the zip — a Python library that speaks PostgreSQL over TCP 5432.

### End-to-end validation

1. **Prereq file:** `night-16-aurora-result.json` contains `writerEndpoint` and `securityGroups.lambdaStats.id`.
2. **Lambda in VPC:**  
   `aws lambda get-function-configuration --function-name saa-study-gsa-stats-uploader --query VpcConfig`  
   Should show your two private subnet IDs and `lambda-stats-sg`.
3. **Test invoke:** response JSON includes `"monthly_runs": 2` (seed row was 1).
4. **SQS path (optional):** publish a test message to the Night 13 queue; check CloudWatch Logs for the same UPSERT.
5. **Result file:** `night-17-lambda-stats-result.json` written in `study-lab/`.

**Troubleshoot in this order:**

1. Is Aurora up? `aws rds describe-db-clusters --db-cluster-identifier saa-study-gsa-aurora --query 'DBClusters[0].Status'` → `available`
2. Is Lambda in the **same VPC** as Aurora? (Both use Night 9 VPC.)
3. Does Aurora SG allow **lambda-stats-sg** on port **5432**?
4. Can Lambda reach Secrets Manager? (NAT Gateway from Night 9 must still exist.)
5. Read CloudWatch log group `/aws/lambda/saa-study-gsa-stats-uploader` — look for `connection refused`, `timeout`, or `password authentication failed`.

### Compare DynamoDB visitor counter (read-only)

GSA prod uses DynamoDB for wiki traffic (Cloud Resume Challenge frontend). You are **not** deploying this tonight — it is the contrast for *when to pick which store*:

```python
# DynamoDB — bump a single number on one key (no SQL, no JOIN)
dynamodb.update_item(
    Key={"pageId": {"S": "wiki/iceland"}},
    UpdateExpression="ADD viewCount :one",
    ExpressionAttributeValues={":one": {"N": "1"}},
)

# Aurora — relational row; analysts can run:
# SELECT country_code, SUM(monthly_runs) FROM resort_stats GROUP BY country_code;
```

| Question | DynamoDB | Aurora |
|----------|----------|--------|
| Need JOIN across tables? | No | Yes |
| Unpredictable read/write scale? | Yes (wiki traffic) | Moderate (monthly batch) |
| Ad-hoc BI / SQL reports? | No | Yes |

### Reference files

- `night-17-lab-lambda-stats-handler.py` — UPSERT logic
- `night-16-aurora-result.json` — writer hostname, secret ARN, security group IDs
- `night-13-sqs-result.json` — completion queue ARN

### Teardown

```powershell
.\HTML\study-lab\night-17-lab-lambda-stats-teardown.ps1
```

```bash
bash HTML/study-lab/night-17-lab-lambda-stats-teardown.sh
```

Removes Lambda, IAM role, event source mapping, and log group. **Does not** delete Aurora (Night 16) or SQS (Night 13).

---

## Block 3 (~20 min) — Quiz

**File:** `night-17-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-17-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=17`.

---

## Database domain map (Week 3)

| Topic | One-liner |
|-------|-----------|
| Aurora Serverless v2 in VPC | Night 16 — deploy + SG + schema |
| **Lambda → Aurora writer (TCP 5432)** | **Tonight — SQS uploader + UPSERT via ENI** |
| DynamoDB counters | Night 18 — PITR + Streams |
| RDS Proxy | Optional pooler if too many Lambda→DB connections |

---

## 5 flashcards (write tonight — include plain English)

1. **ENI** — What is it, and why does the first Lambda invoke take longer?  
   *(Virtual network card in the subnet; AWS attaches it on cold start before Lambda can reach Aurora.)*

2. **Writer vs reader endpoint** — Which do you use for `INSERT … ON CONFLICT`?  
   *(Writer — only the primary accepts writes.)*

3. **Lambda SG with no inbound rules** — Why is that OK?  
   *(Lambda initiates outbound TCP to Aurora; nothing needs to call Lambda on an open port.)*

4. **SQS visibility timeout (60s) vs Lambda timeout (30s)** — Which must be larger?  
   *(Visibility timeout ≥ Lambda timeout — otherwise the message becomes visible again while Lambda is still running.)*

5. **DynamoDB vs Aurora for GSA** — One sentence each for wiki page views vs `resort_stats`.  
   *(DynamoDB: simple counter on one key. Aurora: SQL rows and JOINs for batch/reporting data.)*

---

## Night 18 preview

DynamoDB resilience — PITR, Streams, and a stub stream Lambda on wiki tables. Compare “increment a counter” to tonight’s “UPSERT a relational row over TCP 5432.”
