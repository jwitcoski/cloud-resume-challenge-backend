# Night 31 — Lab 4B: Fargate right-sizing (CPU/memory, Spot vs On-Demand, Compute Optimizer)

~2 hr. **$0 AWS spend** — read-only audit of live Iceland task definition, cost comparison table, CloudWatch utilization sample, and Compute Optimizer API. **No new ECS deploy tonight** — compares `ecs-task-pipeline-sizing.json` scenarios against production `globalskiatlas-backend-k8s-iceland`.

---

## Plain language first

### How Fargate bills

**Fargate** charges per **vCPU-second** and **GiB-second** while the task is **RUNNING** — from image pull through container stop. You do not pay for EC2 instances, but you pay for every second the task exists.

**Analogy (GSA Iceland):** Renting a **moving truck by the minute**. A 2 vCPU / 4 GiB task is a bigger truck; if your boxes fit in a van (1 vCPU / 2 GiB), you overpay for empty cargo space every monthly run.

### Right-sizing vs purchase optimization

| Lever | Question it answers |
|-------|---------------------|
| **Right-sizing** | Is the task def too big for actual CPU/memory use? |
| **Fargate Spot** | Can we accept interruption for ~65% off per run? |
| **Compute Savings Plan** | Do we have steady compute hours to commit 1–3 years? |
| **Architecture** | Should this be Lambda, Batch, or EC2 Spot instead? (Night 27) |

Tonight focuses on the **first two** for Iceland; Savings Plans are the exam comparison when spend is **predictable**.

### Fargate CPU / memory rules (exam)

- CPU in units: **256 = 0.25 vCPU**, **1024 = 1 vCPU**, **2048 = 2 vCPU**, etc.
- Memory must be valid for the CPU tier (see [Fargate task size table](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html)).
- **Ephemeral storage** defaults 20 GiB; extra GiB is a separate line item.

---

## Block 1 (~40 min) — Sizing scenarios + GSA map

### Read `gsa-fargate-rightsizing-map.md`

Pipeline path (unchanged since Night 12):

```
EventBridge cron ──► ecs:RunTask ──► Fargate (private) ──► S3 iceland/YYYY-MM/
```

### Compare `ecs-task-pipeline-sizing.json`

| Scenario | CPU | Memory | Use case |
|----------|-----|--------|----------|
| `iceland-current` | 2048 | 4096 | Production task def — refresh live |
| `iceland-rightsized` | 1024 | 2048 | If CloudWatch p95 CPU < 40% |
| `pmtiles-heavy` | 4096 | 8192 | WORLD_SCALE tile build — not monthly Iceland |

Open the backend repo `aws/` task JSON files when available — tonight’s study copy lives in `study-lab/ecs-task-pipeline-sizing.json` for offline comparison.

### Exam minimums (write in notes)

- Fargate **On-Demand** = no upfront, highest $/second.
- **Fargate Spot** = discount vs Fargate OD; **not** the same as EC2 Spot on raw instances.
- **Compute Savings Plans** apply to Fargate, Lambda, EC2 — flexible spend commitment.
- **Reserved Instances** lock EC2 instance attributes — poor fit for pure Fargate RunTask.
- Monthly **scheduled** batch: total cost ≈ `(per-run $) × runs/month` — EventBridge is not the dominant line item.

### Decision tree (memorize)

```
Fargate task cost too high?
│
├─ CloudWatch shows low CPU/memory p95?
│     → Register smaller task definition revision
│
├─ Job retryable, 2-min interrupt OK?
│     → Fargate Spot capacity provider on RunTask / service
│
├─ Steady hours across Fargate + Lambda + EC2?
│     → Compute Savings Plan (exam: vs RI flexibility)
│
├─ NAT Gateway dominates bill?
│     → S3 gateway + ECR endpoints (Night 9) — not smaller CPU
│
└─ Durable output on Fargate disk?
      → Wrong — S3 (Night 27/30); disk is scratch only
```

---

## Block 2 (~50 min) — Lab: live task def + cost table + Compute Optimizer

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| ECS read | `aws ecs describe-task-definition --task-definition globalskiatlas-backend-k8s-iceland` |
| CloudWatch read | Container Insights optional; basic CPUUtilization works |
| Compute Optimizer | Account opted in — Billing → Compute Optimizer → Enroll |

**Spend note:** This lab only calls **describe/list/get** APIs — **$0** unless you optionally run Iceland via Night 10 script.

### What the lab collects

| Output | Source | Purpose |
|--------|--------|---------|
| Live CPU/memory | `describe-task-definition` | Compare to sizing JSON |
| Cost table | Pricing math (us-east-1 x86) | OD vs Spot vs rightsized |
| Recent task sample | `list-tasks` + `describe-tasks` | Last stopped Iceland task duration |
| CloudWatch p95 | `get-metric-statistics` 30 d | Rightsizing signal |
| Compute Optimizer | `get-ecs-service-recommendations` | AWS suggested CPU/memory |
| Result file | `night-31-fargate-rightsizing-result.json` | Snapshot for notes |

**Does not change:** Task definition, EventBridge rule, cluster capacity, or Spot settings.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-31-lab-fargate-rightsizing-setup.ps1
.\HTML\study-lab\night-31-lab-fargate-rightsizing-setup.ps1 -PrintDecisionTree
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-31-lab-fargate-rightsizing-setup.sh
bash HTML/study-lab/night-31-lab-fargate-rightsizing-setup.sh --print-decision-tree
```

| Flag | What happens |
|------|----------------|
| `-PrintDecisionTree` / `--print-decision-tree` | Prints purchase-model tree to console |

### End-to-end validation

1. **Result file:** `night-31-fargate-rightsizing-result.json` — live sizing, cost rows, optimizer status.

2. **ECS console:** Task definitions → `globalskiatlas-backend-k8s-iceland` → compare CPU/memory to `iceland-rightsized` scenario.

3. **CloudWatch:** ECS → Clusters → `globalskiatlas-backend-k8s` → Tasks → Metrics → CPUUtilization / MemoryUtilization for last Iceland run.

4. **Compute Optimizer:** Console → Compute Optimizer → ECS services — if empty, note “insufficient history” (RunTask-only workloads may have limited recommendations).

5. **Pricing Calculator (optional):** Model 12 monthly runs at current vs rightsized vs Fargate Spot.

**Troubleshoot in this order:**

1. `AccessDenied` on ECS? Need `ecs:Describe*` and `cloudwatch:GetMetricStatistics`.
2. No stopped tasks listed? Run Night 10 once or wait for Night 12 schedule — lab still prints sizing JSON comparison.
3. CloudWatch metrics empty? Task may be older than retention — check log group for run timestamps.
4. Compute Optimizer empty? Enroll account; wait 24–48 h after 30 h of utilization.
5. Cost table differs from console bill? Script uses public list rates — Savings Plans and Spot market change effective $.

### Console reading (10 min)

- **ECS** → Task definition → JSON → `cpu`, `memory`, `ephemeralStorage`.
- **Billing** → Cost Explorer → filter **Service** = Amazon Elastic Container Service → last 30 days (should be small for monthly batch).
- **CloudWatch** → Metrics → ECS/ContainerInsights or `AWS/ECS` → `CPUUtilization`.

### Reference files

- `night-31-lab-fargate-rightsizing-setup.ps1` / `.sh` — read-only audit
- `ecs-task-pipeline-sizing.json` — three sizing scenarios
- `gsa-fargate-rightsizing-map.md` — GSA resource map
- `iceland-pipeline-compute.md` — Night 27 cost context

### Teardown

```powershell
.\HTML\study-lab\night-31-lab-fargate-rightsizing-teardown.ps1
```

```bash
bash HTML/study-lab/night-31-lab-fargate-rightsizing-teardown.sh
```

Removes **only** `night-31-fargate-rightsizing-result.json`. No AWS resources were created.

---

## Block 3 (~30 min) — Quiz + cost pillar notes

**File:** `night-31-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz/31/`.

**Write one cost win per tier:**

| Tier | Night 31 sentence |
|------|-------------------|
| Storage | (Night 30) Lifecycle `iceland/` → IA → Glacier |
| **Compute** | **Right-size Iceland task def; Fargate Spot for retryable monthly batch** |
| Network | VPC endpoints vs NAT for ECR/S3 egress |
| Data | Athena partitions vs full-bucket scan |

---

## Week 5 map (continued)

| Topic | Night |
|-------|-------|
| S3 lifecycle + Cost Explorer + Budgets | 30 |
| **Fargate right-sizing + Savings Plans vs Spot** | **Tonight (31)** |
| Step Functions capstone | 32 |
| Architecture write-up | 33 |

---

## 5 flashcards (write tonight)

1. **Fargate billing** — When does the meter start?  
   *(From task provisioning/RUNNING until stopped — per vCPU-second and GiB-second.)*

2. **Spot vs Savings Plan** — Iceland monthly, retry OK?  
   *(Fargate Spot per run — Savings Plan when steady committed hours across compute.)*

3. **Right-sizing signal** — CPU p95 25% for a month?  
   *(Candidate to reduce CPU/memory in new task definition revision.)*

4. **Invalid task def** — 512 MiB with 2 vCPU?  
   *(Violates Fargate CPU/memory pairing — task fails registration.)*

5. **Durable output** — Shrink Fargate disk to save $?  
   *(No — artifacts in S3; ephemeral disk is scratch only.)*

---

## Night 32 preview

**Lab 4C — Step Functions capstone** — state machine: ECS RunTask → wait → SQS → Lambda → SNS failure path; deploy `sam-pipeline-orchestrator` per `gsa-integration-map.md`.

---

## Reference links

- [Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [Fargate task CPU and memory](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
- [Fargate Spot capacity providers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html)
- [Compute Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
