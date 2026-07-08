# GSA Fargate right-sizing map — Iceland task, purchase options, Compute Optimizer

Reference for **Night 31** and Week 5 compute cost labs. Maps the Global Ski Atlas Iceland pipeline to Fargate sizing, billing models, and optimization tools.

---

## Iceland ECS resources (Nights 9–12)

| Resource | Name | Role |
|----------|------|------|
| Cluster | `globalskiatlas-backend-k8s` | Hosts RunTask + any services |
| Task family | `globalskiatlas-backend-k8s-iceland` | Monthly OSM → GeoParquet batch |
| Schedule | `saa-study-gsa-iceland-monthly` | EventBridge cron `0 6 1 * ? *` |
| Log group | `/ecs/globalskiatlas-backend-k8s-iceland` | CPU/memory utilization signals |
| Output | `s3://globalskiatlas-backend-k8s-output/iceland/YYYY-MM/` | Durable — not on Fargate disk |

**Workload shape:** One-shot batch, **private subnets**, **assignPublicIp DISABLED**, retryable next month. Ideal for **right-sizing** from CloudWatch + **Fargate Spot** if interruption is acceptable.

---

## Task sizing ladder (compare in lab)

```
ecs-task-pipeline-sizing.json
├── iceland-current      ← live task def (refresh via describe-task-definition)
├── iceland-rightsized   ← exam candidate if CPU < 40% p95
└── pmtiles-heavy        ← WORLD_SCALE parallel build (not Iceland monthly)
```

| Scenario | CPU units | Memory (MiB) | vCPU | GiB | ~2 hr On-Demand* |
|----------|-----------|--------------|------|-----|------------------|
| **iceland-current** | 1024 | 2048 | 1 | 2 | ~$0.10 |
| **iceland-legacy-prod** | 2048 | 4096 | 2 | 4 | ~$0.20 |
| **iceland-rightsized** | 512 | 1024 | 0.5 | 1 | ~$0.05 |
| **pmtiles-heavy** | 4096 | 8192 | 4 | 8 | ~$0.40 |

\* us-east-1 Linux x86 list rates — run `night-31-lab-fargate-rightsizing-setup.ps1` for live math.

**Fargate valid pairs:** Memory must sit between CPU-dependent min/max (e.g. 1 vCPU → 2–8 GiB). Exam trap: **4096 CPU + 512 MiB** is invalid.

---

## Purchase model decision tree

```
Steady Fargate/EC2/Lambda hours every month?
│
├─ Yes, 1- or 3-year commit OK?
│     → Compute Savings Plan (up to ~66% vs On-Demand)
│
├─ Interruptible batch (Iceland monthly, PMTiles shard)?
│     → Fargate Spot capacity provider (~65% off Fargate OD)
│     → or EC2 Spot if you manage instances (Night 27)
│
├─ Must finish on first try, no retry window?
│     → Fargate On-Demand (Night 10 default)
│
└─ Always-on API / wiki Lambda?
      → Lambda per-ms billing — not Fargate (different tier)
```

| Model | Best for GSA | Exam note |
|-------|--------------|-----------|
| **On-Demand Fargate** | First proof, tight deadline | Per vCPU-GB-second; no upfront |
| **Fargate Spot** | Monthly Iceland if retry OK | 2-min interruption notice |
| **Compute Savings Plan** | Steady multi-service compute | Applies across Regions/instance families |
| **EC2 Reserved** | Long-lived EC2 workers only | Not for pure Fargate tasks |
| **Savings Plans vs RIs** | SP flexible; RI locks instance type/AZ | Cost pillar favorite comparison |

**Night 12 insight:** EventBridge schedule is **$0** per rule — you pay Fargate **only when the task runs**. Right-sizing + Spot shrink the **per-run** bill; lifecycle (Night 30) shrinks **storage**.

---

## Right-sizing signals

| Signal | Tool | What to look for |
|--------|------|------------------|
| CPUUtilization / MemoryUtilization | **CloudWatch** container metrics | p95 < 40% for a month → downsize candidate |
| Recommended CPU/memory | **Compute Optimizer** | Needs ~30 h of metrics; may lag new task defs |
| Task stop reason + duration | **ECS describe-tasks** | OOM → increase memory; fast exit + low CPU → decrease |
| Ephemeral storage full | Container exit / logs | Increase `ephemeralStorage` in task def (GiB fee) |

**Compute Optimizer enrollment:** Account must opt in (Billing → Compute Optimizer). Lab calls `get-ecs-service-recommendations` and `get-lambda-function-recommendations` — empty if no services or insufficient history.

---

## Cost stack (one Iceland run)

| Line item | Typical $ | Night |
|-----------|-----------|-------|
| Fargate compute (2 vCPU, 4 GiB, 2 hr) | ~$0.20 | **31** |
| NAT Gateway data processing | $0.05–0.45 | 9 |
| S3 PUT + storage (current month Standard) | cents | 30 |
| CloudWatch Logs ingest | cents | 10 |
| EventBridge scheduled invocation | ~$0 | 12 |

**VPC endpoints** (S3 gateway + ECR interface) can remove most NAT GB — network savings often beat shaving 0.5 vCPU.

---

## Decision one-liner (flashcard)

**“Monthly Iceland Fargate too expensive?”** → Check CloudWatch p95 CPU/memory → downsize task def → add Fargate Spot capacity provider → keep S3 output durable; Savings Plans only if steady hours justify commit.
