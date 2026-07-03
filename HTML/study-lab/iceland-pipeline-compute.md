# Global Ski Atlas — Iceland pipeline compute + cost map

Read-only reference for **Night 27**. Source of truth in AWS may drift — refresh task sizing with `aws ecs describe-task-definition` and Spot prices with `describe-spot-price-history`.

Backend repo docs (`docs/AWS_ECS_DEPLOYMENT.md`, `WORLD_SCALE.md`) hold the full deployment narrative; this file captures the **exam-relevant compute + storage** slice for study-lab nights.

---

## Pipeline path (Nights 9–12)

```
EventBridge cron (monthly) ──► ecs:RunTask ──► Fargate (private subnets)
                                                    │
                    execution role: ECR pull, logs   │
                    task role: S3 PutObject          │
                                                    ▼
                              globalskiatlas-backend-k8s-output
                              prefix: iceland/YYYY-MM/
```

| Component | Name | Night |
|-----------|------|-------|
| VPC + private subnets | Night 9 study VPC | 9 |
| Manual proof | `night-10-lab-fargate-run` | 10 |
| Schedule | `saa-study-gsa-iceland-monthly` rule | 12 |
| Notify on failure | SNS + SQS paths | 14 |

**Workload shape:** Batch ETL — download OSM data, transform, upload GeoParquet to S3. Runs **minutes to hours**, **once per month**, **fault-tolerant** (retry next month or manual re-run). Ideal Spot / Fargate Spot candidate if interruption handling exists.

---

## Task sizing (refresh from AWS)

```powershell
aws ecs describe-task-definition `
  --task-definition globalskiatlas-backend-k8s-iceland `
  --region us-east-1 `
  --query 'taskDefinition.{cpu:cpu,memory:memory,compat:requiresCompatibilities}'
```

Typical production sizing (verify live): **2048 CPU units (2 vCPU)** and **4096 MiB (4 GiB)** — adjust the cost table if your task def differs.

---

## Cost table — one Iceland run (~2 hr wall clock)

Approximate **us-east-1 Linux x86** list pricing for study math (run `night-27-lab-ec2-setup.ps1` for live Spot samples).

| Option | Billing model | ~2 hr run cost | Exam note |
|--------|---------------|----------------|-----------|
| **Fargate On-Demand** | Per vCPU-GB-second | ~$0.20 | No instance management; Night 10 default |
| **Fargate Spot** (capacity provider) | Discount vs Fargate OD | ~$0.06–0.12 | 2-min interruption notice; same task def |
| **EC2 On-Demand** (m6i.large class) | Per instance-hour | ~$0.19 | You manage AMI, ECS agent or raw Docker |
| **EC2 Spot** (same size) | Spot market | ~$0.02–0.06 | **Best $** if job checkpoints or retries |
| **NAT Gateway** (if no S3/ECR endpoints) | Per-GB processed | +$0.05–0.45 | **Not compute** — Night 9 VPC tax on egress |
| **EBS gp3 root** (if EC2 worker) | Per GB-month + IOPS | ~$0.01/run prorated | 8–30 GiB gp3 typical for batch AMI |

**Monthly schedule insight (Night 12):** EventBridge costs **$0** per rule; you pay **only when the task runs**. Replacing a 24/7 cron EC2 with scheduled Fargate is the architectural win — Spot/Fargate Spot shrinks the per-run bill further.

---

## When Spot beats On-Demand (decision tree)

```
Batch / pipeline job (Iceland OSM, PMTiles build)?
│
├─ Runs < 15 min, no checkpoint, rare schedule?
│     → Fargate On-Demand OK (simplicity) — Night 10
│
├─ Runs 1–4 hr, can retry on failure, monthly?
│     → EC2 Spot or Fargate Spot capacity provider
│
├─ Many parallel shards (country tiles)?
│     → AWS Batch on Spot Fleet or Spot capacity provider
│
├─ Must finish by deadline with no retry window?
│     → On-Demand or mixed On-Demand + Spot (allocation strategy)
│
└─ Stateful primary database?
      → NOT Spot — use RDS/Aurora Multi-AZ (Night 15)
```

**WORLD_SCALE / PMTiles angle:** Building planet-scale vector tiles is **CPU-heavy, embarrassingly parallel, S3-output**. Exam answer: **AWS Batch** with **Spot compute environment** or **EC2 Spot Fleet** — not a always-on Fargate service.

---

## EBS for batch workers

| Volume | Use on Iceland / PMTiles worker |
|--------|----------------------------------|
| **gp3** | Root + scratch — default general SSD; tune IOPS/throughput independently |
| **io2** | Only if profiling shows sustained random IOPS bottleneck (uncommon for ETL) |
| **st1** | Sequential HDD throughput — huge sequential reads, cost-sensitive |
| **sc1** | Cold bulk storage — rarely attached to compute; S3 is the durable store |

**GSA pattern:** Durable output is **S3** (`globalskiatlas-backend-k8s-output`). EBS on a batch instance is **ephemeral scratch** — snapshot only if you must preserve local state; prefer re-run from S3 inputs.

---

## Fargate vs EC2 for the same task

| | **Fargate** | **EC2 + ECS** |
|--|-------------|----------------|
| **Ops** | No instances | Patch AMI, capacity, Spot fleet |
| **Networking** | awsvpc per task | awsvpc or bridge |
| **Spot** | Fargate Spot capacity provider | Native Spot instances / Fleet |
| **EBS** | Fargate ephemeral storage (20–200 GiB task setting) | Any EBS volume types |
| **GSA tonight** | **Production Iceland task** | Study comparison + optional Spot demo |

---

## Related files

- `study-lab/night-27-ec2-ebs-spot.md` — tonight’s guide
- `study-lab/night-9-vpc-ids.json` — VPC for optional Spot EC2 in private subnet
- `study-lab/night-10-lab-fargate-run.sh` — On-Demand Fargate proof
- `study-lab/night-12-eventbridge-schedule.md` — monthly trigger
- `study-lab/week2-vpc-plan.md` — NAT vs endpoints cost note
