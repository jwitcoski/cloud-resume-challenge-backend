# Night 33 — Architecture write-up (GSA full stack + Well-Architected)

~2 hr. **$0 AWS spend** — paper + portfolio documentation night. Read `gsa-architecture-map.md`, run a read-only stack audit, write one security / resilience / cost win per tier, and link labs to Well-Architected pillars. No new deploy tonight.

---

## Plain language first

### What is tonight?

After 32 nights of labs, you have **six architectural tiers** in Global Ski Atlas — edge, application, data, analytics, pipeline, and network. Tonight you **stop building** and **start explaining**: the diagram an interviewer or exam scenario expects when they say *"walk me through your architecture."*

**Analogy:** Nights 1–32 installed lifts, lodges, patrol radios, and snowcats. Night 33 is the **trail map on the lodge wall** — one glance shows how everything connects and which design choice saves money, survives failure, or blocks attackers.

### The six tiers (memorize labels)

| Tier | One-line role | Anchor nights |
|------|---------------|---------------|
| **Edge / Frontend** | Users hit Route 53 → CloudFront → S3 or API GW | 25–26 |
| **Application** | Lambda + Cognito + DynamoDB wiki CRUD | 2–3, 17 |
| **Data / OLTP** | Aurora `resort_stats` + ElastiCache cache-aside | 15–18, 23 |
| **Analytics** | S3 lake + Glue + Athena on Iceberg | 20, 24 |
| **Pipeline / Compute** | Monthly Iceland Fargate batch + integration | 9–14, 30–32 |
| **Network** | VPC, NAT, endpoints, security groups | 8–9 |

### Well-Architected pillars (exam + portfolio)

| Pillar | Question it answers | GSA headline |
|--------|---------------------|--------------|
| **Operational Excellence** | Can we run and improve the system? | Step Functions visibility; CloudWatch dashboards |
| **Security** | Is data protected? | Cognito + KMS + private subnets + least-privilege IAM |
| **Reliability** | Does it survive failure? | Multi-AZ Aurora, SQS DLQ, Route 53 failover |
| **Performance Efficiency** | Right resource for the job? | CloudFront + Redis + Athena partitions |
| **Cost Optimization** | Pay for what you use? | Lifecycle, Fargate Spot, VPC endpoints |
| **Sustainability** | Minimize waste? | Serverless edge, scheduled batch, right-sized tasks |

---

## Block 1 (~25 min) — Draw the full stack

### Read `gsa-architecture-map.md`

Trace every arrow in the tier diagram. Label resource names from your account (CloudFront distribution, cluster `globalskiatlas-backend-k8s`, queues `saa-study-gsa-*`).

### Side-by-side drawings (15 min timed)

1. **User-facing path** — browser → CloudFront → (S3 | API GW → Lambda → DynamoDB/Aurora)
2. **Pipeline path** — schedule → (Step Functions | EventBridge) → Fargate → S3 → SQS → Lambda → SNS
3. **Network box** — wrap Fargate, Lambda ENI, Aurora, Redis in private subnets; NAT + endpoints on the side

### Exam minimums (write in notes)

- **Three CloudFront origins** on one distribution — path behaviors pick origin + cache policy (`wiki-api-production.md`).
- **Auth boundary** — anonymous GET wiki; mutating verbs need Cognito JWT.
- **OLTP vs analytics** — Aurora for live stats; Athena on S3/Iceberg for reports.
- **Integration trio** — EventBridge schedule vs SQS buffer vs SNS fan-out (`gsa-integration-map.md`).
- **Step Functions capstone** — `runTask.sync` + Catch + `iam:PassRole` (`gsa-stepfunctions-map.md`).

---

## Block 2 (~35 min) — Write-up assignment

### Deliverable: one paragraph per tier

Use the **Tier wins matrix** in `gsa-architecture-map.md` as a template. For each tier write **three sentences**:

1. **Security** — concrete control (not "we use IAM").
2. **Resilience** — what fails over, buffers, or retries.
3. **Cost** — specific lever from Nights 27–31.

**Example (Pipeline tier):**

> **Security:** ECS execution role pulls ECR images; task role alone has `s3:PutObject` on the output bucket — execution role cannot write customer data.  
> **Resilience:** Night 32 Step Functions `Catch` on `RunIcelandTask` publishes to the Night 14 SNS topic; SQS completion queue has a DLQ after three receives.  
> **Cost:** Monthly scheduled Fargate replaces 24/7 compute; Night 30 lifecycle moves prior `iceland/` months to Standard-IA then Glacier.

### Link labs to pillars (table)

| Pillar | Pick 3 nights | One sentence tying them together |
|--------|---------------|----------------------------------|
| Operational Excellence | | |
| Security | | |
| Reliability | | |
| Performance Efficiency | | |
| Cost Optimization | | |

Save to your portfolio notes or append a `## Night 33 architecture summary` section in a personal doc.

---

## Block 3 (~40 min) — Lab: read-only stack audit

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| Read access | CloudFront, API GW, Lambda, ECS, SQS, SNS, Events, Step Functions |

**Spend note:** Script only calls **describe/list/get** APIs — **$0**.

### What the lab collects

| Tier | Checks | Source API |
|------|--------|------------|
| Edge | CloudFront distribution for `globalskiatlas` | `cloudfront list-distributions` |
| Application | Wiki Lambda, DynamoDB wiki tables | `lambda`, `dynamodb` |
| Data | Aurora cluster, ElastiCache (if deployed) | `rds`, `elasticache` |
| Analytics | Glue DB, Athena workgroup | `glue`, `athena` |
| Pipeline | ECS task def, Step Functions SM, integration rules | `ecs`, `sfn`, `events` |
| Network | Night 9 VPC from `night-9-vpc-ids.json` | `ec2 describe-vpcs` |

Output: `night-33-architecture-result.json` — resource snapshot + scaffolded tier wins for your write-up.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-33-lab-architecture-audit.ps1
.\HTML\study-lab\night-33-lab-architecture-audit.ps1 -PrintPillarMap
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-33-lab-architecture-audit.sh
bash HTML/study-lab/night-33-lab-architecture-audit.sh --print-pillar-map
```

| Flag | What happens |
|------|----------------|
| `-PrintPillarMap` / `--print-pillar-map` | Prints Well-Architected → night index to console |

### End-to-end validation

1. **Result file:** `night-33-architecture-result.json` — `tiersFound` count and per-tier `found` flags.
2. **Console:** Spot-check one resource per tier matches your diagram.
3. **Write-up:** Every tier in the JSON has your three sentences filled in (security / resilience / cost).
4. **Pillar table:** Five pillars each cite ≥2 real GSA resources.

**Troubleshoot in this order:**

1. `AccessDenied`? Need read-only `Describe*` / `List*` on listed services.
2. Missing ElastiCache / Aurora? Expected if Nights 16/23 torn down — note in write-up.
3. Step Functions missing? Run Night 32 deploy first or document legacy EventBridge path only.
4. CloudFront not found? Search by alias `globalskiatlas.com` in console — update result JSON manually.

### Reference files

- `night-33-lab-architecture-audit.ps1` / `.sh` — read-only audit
- `gsa-architecture-map.md` — master diagram + tier wins matrix
- `wiki-api-production.md`, `iceland-pipeline-compute.md`, `gsa-integration-map.md` — tier deep dives

### Teardown

```powershell
.\HTML\study-lab\night-33-lab-architecture-teardown.ps1
```

```bash
bash HTML/study-lab/night-33-lab-architecture-teardown.sh
```

Removes **only** `night-33-architecture-result.json`. No AWS resources were created.

---

## Block 4 (~20 min) — Quiz + pillar review

**File:** `night-33-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Topics: Well-Architected pillars, tier boundaries, GSA design synthesis, exam traps from the architecture map.

Score on the study site: `/aws-solutions-architect-study/quiz/33/`.

**Target:** ≥12/15 (80%) — architecture nights reward breadth over trivia.

---

## Week 5 finale map

| Topic | Night |
|-------|-------|
| S3 lifecycle + Cost Explorer + Budgets | 30 |
| Fargate right-sizing + Savings Plans vs Spot | 31 |
| Step Functions capstone | 32 |
| **Architecture write-up + Well-Architected** | **Tonight (33)** |

---

## 5 flashcards (write tonight)

1. **Tier boundary** — Where does CloudFront end and ElastiCache begin?  
   *(CloudFront = edge HTTP; Redis = in-VPC cache-aside for Aurora rows.)*

2. **Security pillar** — Wiki POST without JWT?  
   *(Blocked at Lambda — Cognito validates Authorization header; Night 2–3.)*

3. **Reliability pillar** — Iceland container exit 1 vs EventBridge FailedInvocations?  
   *(Exit 1 = task ran and failed → SNS rule; FailedInvocations = rule could not invoke target — IAM/config.)*

4. **Cost pillar** — Biggest idle study-VPC tax?  
   *(NAT Gateway hourly + per-GB — endpoints for S3/ECR; Night 8–9.)*

5. **Operational excellence** — Why Step Functions over five EventBridge rules?  
   *(Single execution history, per-step Retry/Catch, operator visibility — Night 32.)*

---

## Night 34 preview

**Week 5 review + mock exam block** — timed 65-question domain mix, teardown order for all study stacks, and final portfolio checklist before exam scheduling.

---

## Reference links

- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)
- [Architecting for the Cloud — design principles](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/design-principles.html)
