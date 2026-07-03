# Night 27 — EC2 + EBS + Spot (volume types, Iceland pipeline cost)

~2 hr. **Very low AWS spend** — one gp3 EBS volume + CLI pricing reads. **Read-only on prod** — reads Iceland ECS task definition; optional `-CreateSpotDemo` launches a **tagged, self-terminating** Spot instance in the Night 9 VPC (~pennies if torn down promptly).

---

## Plain language first

### What is EBS?

**Amazon EBS** is a **network-attached block disk** for EC2. One volume → one instance at a time (except **io2 Multi-Attach**). You pick a **volume type** for cost vs performance.

**Analogy:** EC2 is the **snowcat engine**; EBS is the **fuel tank and toolbox** bolted on. Instance Store is a **small built-in sled** — faster but **gone when the engine stops**.

### EBS volume type matrix (exam)

| Type | Backing | Best for | IOPS / throughput | Cost |
|------|---------|----------|-------------------|------|
| **gp3** | SSD | **Default** boot + app disks | 3,000–16,000 IOPS; 125–1,000 MiB/s | $$ |
| **gp2** | SSD | Legacy general (prefer gp3) | IOPS tied to size | $$ |
| **io2 / io2 Block Express** | SSD | OLTP, latency-sensitive DB | Up to 256,000 IOPS | $$$$ |
| **st1** | HDD | **Throughput** sequential (logs, big scans) | 500 MiB/s cap; IOPS per TiB | $ |
| **sc1** | HDD | **Cold** infrequent access | 250 MiB/s cap | ¢ |

**Exam picks:**

- **gp3** — general purpose, right-size IOPS without bigger disk.
- **io2** — “highest IOPS MySQL/PostgreSQL on EC2.”
- **st1** — “big sequential reads, throughput HDD, not IOPS.”
- **sc1** — “lowest $ bulk, infrequent access HDD.”

### IOPS vs throughput — what each volume is actually for

Two different “speed” metrics — exams love mixing them up.

| Metric | Measures | Think of it as |
|--------|----------|----------------|
| **IOPS** | Separate read/write **operations per second** | Many workers grabbing **small boxes from different shelves** |
| **Throughput** | **Megabytes per second** in a steady stream | One forklift moving **pallets down a single aisle** |

**IOPS matters** when work is **random and small** — databases, OS boot disks, apps opening lots of little files.  
**Throughput matters** when work is **big and sequential** — video files, giant log dumps, scanning a huge Parquet file start-to-finish.

| You’re doing… | Volume | Why |
|---------------|--------|-----|
| EC2 **boot disk** or normal app server | **gp3** | General SSD — balanced IOPS + throughput |
| **Busy MySQL/PostgreSQL on EC2** (not RDS) | **io2** | Extreme **random** IOPS — thousands of tiny DB page reads/sec |
| **Nightly 80 GB log file** written in one stream | **st1** | Cheap HDD optimized for **sequential** throughput, not random DB I/O |
| **1 TB archive** on disk you open once a year | **sc1** | Lowest $/GB — slow for everything, fine if rarely touched |
| Iceland pipeline **temp scratch**, then upload | **gp3** (or Instance Store) | Short-lived local work — durable output goes to **S3** |

**Exam traps:**

- Database on EC2 needing max random IOPS → **io2**, not st1/sc1 (HDD feels awful for random reads).
- “Big sequential log ingest” → **st1** (throughput HDD), not io2 (overkill $).
- **st1/sc1** are usually **data volumes**, not root/boot disks on standard AMIs.
- **Aurora/RDS** questions → managed database answer; **io2** is for DB **on EC2**.

**Self-test (cover the right column, guess the volume):**

1. 10,000 users hitting Postgres on EC2 → **io2** (or move to RDS/Aurora).
2. Hadoop-style scan through a 500 GB file → **st1**.
3. Linux root volume for a web API → **gp3**.
4. Compliance backup volume, restore tested annually → **sc1**.

### gp3 knobs (lab tonight)

gp3 decouples **size**, **provisioned IOPS**, and **throughput**:

```
gp3 volume
  ├── Size (GiB)     — baseline 3,000 IOPS free
  ├── IOPS           — provision above baseline
  └── Throughput     — MiB/s (needs enough IOPS)
```

**Modify live:** `modify-volume` can change type gp2→gp3 or raise IOPS **without detach** (usually).

### EBS vs EFS vs Instance Store vs S3

| Store | Attached to | Shared? | Durability |
|-------|-------------|---------|------------|
| **EBS** | EC2 (one AZ) | No* | Survives instance stop |
| **EFS** | EC2/Lambda (NFS) | Yes | Regional file system |
| **Instance Store** | EC2 | No | **Ephemeral** — stop/terminate loses data |
| **S3** | API | Yes | Durable object store |

\* io2 Multi-Attach: up to 16 EC2 in one AZ.

**GSA Iceland pipeline:** Output lands in **S3** — not EBS. EBS on a batch worker is scratch; **S3 is the system of record**.

### EC2 purchasing options

| Model | Pay | Interruption | Exam when |
|-------|-----|--------------|-----------|
| **On-Demand** | List price | Never | Unpredictable / prod baseline |
| **Reserved / Savings Plans** | Commit 1–3 yr | Never | Steady 24/7 |
| **Spot** | Market discount | **2-min notice** | Batch, CI, stateless workers |
| **Dedicated Hosts** | Physical host | Never | Compliance / sockets |

**Spot interruption:** Instance gets **SIGTERM** → optional **Spot Instance interruption notice** via EventBridge → checkpoint or drain. **Capacity-optimized** allocation lowers interruption rate (exam keyword).

### Fargate Spot vs EC2 Spot (Iceland pipeline)

**You’re right — they are different things.** The table below is not “Fargate vs EC2” in general. It is: **same batch job (your container), but do you run it on AWS-managed container hosts or on Spot VMs you control?**

**Spot** is the shared idea: use **spare AWS capacity** at a discount; AWS can take it back with **~2 minutes notice**.

```
What you manage                    What AWS manages
─────────────────────────────────────────────────────────
EC2 Spot          You: AMI, patching, disk, scaling    AWS: physical host + Spot market
Fargate Spot      You: task definition (image/CPU/RAM) AWS: servers + placement + Spot pool
```

| Layer | **EC2** | **Fargate** |
|-------|---------|-------------|
| Unit you think about | **Instance** (a VM) | **Task** (one or more containers) |
| You SSH / patch OS? | Yes (unless you automate away) | No — no instance to log into |
| Docker/containers | Optional — you install ECS agent or run Docker yourself | Built-in — you only define the **task definition** |
| Disk | **EBS** volumes (gp3, st1, …) | **Ephemeral task storage** only (20–200 GiB setting) |
| Spot means | **Spot instance** terminated | **Fargate task** stopped on spare capacity |

**Fargate still runs on servers** — you just never see or manage those EC2 instances. Fargate Spot = “run my ECS task on discounted Fargate capacity.” EC2 Spot = “rent a discounted VM and run my container (or anything) on it.”

| | **Fargate Spot** | **EC2 Spot** |
|--|------------------|--------------|
| **You manage** | Task definition, image, CPU/memory | Instances, AMI, ECS agent/Batch, EBS, scaling |
| **AWS manages** | Where the task runs, host patching | Physical hardware only |
| **Interruption** | Task **stopped** — ECS may retry per capacity provider | Instance **terminated** — your orchestrator must replace it |
| **EBS types** | Fargate ephemeral disk only | Full gp3/io2/st1 choice |
| **GSA Iceland (Nights 10–12)** | **Already here** — same task def, flip capacity provider to Spot | More ops; worth it for huge parallel PMTiles/Batch |

**Exam framing:** “Fault-tolerant container batch, minimal ops” → **Fargate Spot**. “Thousands of parallel shards, custom disks, AWS Batch” → **EC2 Spot** (often via Batch compute environment). Both beat On-Demand for the Iceland-style monthly job; neither replaces **S3** for durable output.

**Night 12 schedule + Spot:** Monthly cron still **$0** until the task runs; Spot cuts **per-run** compute — not the EventBridge rule.

---

## Block 1 (~40 min) — EBS matrix + Iceland cost context

### Read `iceland-pipeline-compute.md`

```
EventBridge (monthly)
        │
        ▼
   ecs:RunTask (Fargate, private subnets)  ← Nights 10–12
        │
        ├──► ECR image pull (NAT or endpoints)
        ├──► Scratch: Fargate ephemeral storage OR EC2 EBS gp3
        └──► S3 output (durable)
```

### Decision tree (memorize)

```
Need block storage for EC2?
│
├─ General boot + app disk, tune IOPS?
│     → gp3
│
├─ Database on EC2, 64k+ sustained IOPS?
│     → io2 Block Express
│
├─ Big sequential throughput, cost-sensitive?
│     → st1 (HDD)
│
├─ Lowest $ HDD, rarely read?
│     → sc1
│
├─ Shared files across many EC2?
│     → EFS (not EBS)
│
└─ Temp cache on single instance, OK to lose?
      → Instance Store
```

### Exam traps

- **Root volume** can be gp3 — **hibernation** requires **encrypted** root ≤ 150 GiB.
- **EBS snapshot** = point-in-time to S3; **cross-Region copy** for DR — not a live disk.
- **Spot** for **Aurora primary** — wrong; Spot for **nightly ETL** — right.
- **st1/sc1** cannot be **root volumes** on many AMIs — data volumes only (exam awareness).
- **Fargate** pricing is **per task CPU/memory**, not per EBS volume — different line item than EC2+EBS.

---

## Block 2 (~50 min) — Lab: gp3 volume + cost table + optional Spot demo

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| Iceland task def (optional) | `aws ecs describe-task-definition --task-definition globalskiatlas-backend-k8s-iceland` |
| Night 9 VPC (Spot demo only) | `night-9-vpc-ids.json` exists |

**Spend note:** gp3 8 GiB ≈ **$0.64/month** prorated — **teardown when done**. Spot demo t3.micro ≈ **<$0.01** for a few minutes.

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| EBS volume | `saa-study-night27-gp3-demo` | gp3 create + modify IOPS demo |
| Result file | `night-27-ec2-result.json` | IDs for teardown + cost snapshot |
| Spot instance (optional) | `saa-study-night27-spot-demo` | 2-min interruption-aware pattern |

**Production safety:** Does **not** change Iceland ECS task definition, EventBridge rule, or Fargate service.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-27-lab-ec2-setup.ps1
.\HTML\study-lab\night-27-lab-ec2-setup.ps1 -CheckSpotPrices -CreateSpotDemo
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-27-lab-ec2-setup.sh
bash HTML/study-lab/night-27-lab-ec2-setup.sh --check-spot-prices --create-spot-demo
```

| Flag | What happens |
|------|----------------|
| `-CheckSpotPrices` / `--check-spot-prices` | `describe-spot-price-history` for sizes matching Iceland task |
| `-CreateSpotDemo` / `--create-spot-demo` | Spot `t3.micro` in public subnet, user-data self-terminates in 3 min |

### End-to-end validation

1. **Result file:** `night-27-ec2-result.json` — volume ID, task CPU/memory, cost estimates, optional Spot instance ID.

2. **EBS console:** EC2 → Volumes → `saa-study-night27-gp3-demo` → note **Type gp3**, **IOPS**, **Throughput** after modify.

3. **Cost table:** Script prints Fargate vs EC2 On-Demand vs Spot for task CPU/memory — copy into notes; compare `iceland-pipeline-compute.md`.

4. **Spot demo (optional):** Instance state `running` → `terminated`; Spot request `instance-terminated-no-capacity` or `fulfilled` — both OK for lab.

5. **Console reading:** EC2 → Spot Requests → note **Allocation strategy** and **Interruption behavior** fields.

**Troubleshoot in this order:**

1. Volume `creating` stuck? Wait 30 s — check AZ quota.
2. `modify-volume` invalid? Throughput requires minimum IOPS — raise IOPS first.
3. Spot demo no capacity? Retry or switch AZ — exam scenario for mixed On-Demand + Spot.
4. Iceland task def missing? Script uses **2048 CPU / 4096 MiB** defaults — still completes lab.
5. Spot demo no VPC? Skip `-CreateSpotDemo` or run Night 9 VPC build first.

### Compare compute options (write in notes)

| Question | Fargate OD | Fargate Spot | EC2 Spot |
|----------|------------|--------------|----------|
| Ops burden | Lowest | Low | Highest |
| Interruption handling | ECS replaces task | 2-min notice | Instance gone |
| Best for Iceland monthly | ✅ simple | ✅ cheaper | ✅ if scripted |
| PMTiles parallel build | Possible | Good | **Batch + Spot Fleet** |

### Reference files

- `night-27-lab-ec2-setup.ps1` / `.sh` — gp3 volume + cost math + optional Spot
- `night-27-ec2-result.json` — IDs for teardown
- `iceland-pipeline-compute.md` — pipeline cost map
- `night-10-lab-fargate-run.sh` — On-Demand Fargate baseline

### Teardown

```powershell
.\HTML\study-lab\night-27-lab-ec2-teardown.ps1
```

```bash
bash HTML/study-lab/night-27-lab-ec2-teardown.sh
```

Deletes study gp3 volume (after detach), cancels Spot requests, terminates demo instances. **Does not** delete Iceland ECS cluster, task definitions, or Night 9 VPC.

---

## Block 3 (~30 min) — Quiz + console reading

**File:** `night-27-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=27`.

**Console reading (5 min):**

- EC2 → **Volumes** → gp3 demo → **Actions → Modify volume** — see IOPS/throughput bounds.
- EC2 → **Spot Requests** → compare **Capacity-optimized** vs **Lowest price** (read-only).
- ECS → **Task definitions** → `globalskiatlas-backend-k8s-iceland` → CPU/memory → multiply by Fargate rates in your notes.

---

## Week 4 map (continued)

| Topic | Night |
|-------|-------|
| ElastiCache Redis cache-aside | 23 |
| Athena on S3 / Iceberg | 24 |
| Route 53 routing policies | 25 |
| CloudFront API caching + throttling | 26 |
| **EC2 + EBS + Spot** | **Tonight (27)** |
| Integration services (EventBridge vs SQS vs Kinesis) | 28 |

---

## 5 flashcards (write tonight)

1. **gp3 vs st1** — One-line when to pick each?  
   *(gp3: general SSD boot/app; st1: throughput-oriented sequential HDD data.)*

2. **Spot interruption** — How much notice and what workload trait fits?  
   *(~2 minutes; fault-tolerant, stateless, or checkpointed batch.)*

3. **Iceland pipeline storage** — Where does durable output live?  
   *(S3 bucket — EBS is scratch on EC2 workers only.)*

4. **Fargate vs EC2 Spot** — Who manages the AMI and capacity?  
   *(Fargate: AWS; EC2 Spot: you or Batch/ECS capacity provider.)*

5. **io2 Multi-Attach** — Why exam mentions it?  
   *(Shared block storage for clustered apps in one AZ — not default single-attach.)*

---

## Night 28 preview

**Integration services** — EventBridge vs SQS vs Kinesis vs Step Functions decision tree; AppSync awareness; capstone path toward Night 32 Step Functions orchestrator.
