# GSA full-stack architecture map — Nights 1–32

Master reference for **Night 33** portfolio write-up. Maps Global Ski Atlas **frontend**, **application**, **data**, **analytics**, **pipeline**, and **network** tiers to study-lab nights and AWS Well-Architected pillars.

---

## Tier diagram (draw from memory)

```
                         USERS (global)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EDGE / FRONTEND TIER                                                   │
│  Route 53 (globalskiatlas.com) ──► CloudFront (ACM us-east-1)          │
│     ├── Default (*)        → S3 static Next.js export                   │
│     ├── /api/wiki*         → API Gateway WikiApi → Lambda wiki-api      │
│     └── /api/iceberg-stats → API Gateway → Lambda stats                   │
│  Nights: 3–4 (WAF awareness), 25–26 (DNS + edge cache)                │
└─────────────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│ APPLICATION     │  │ DATA / OLTP     │  │ ANALYTICS                   │
│ Lambda wiki-api │  │ Aurora          │  │ S3 + Glue + Iceberg         │
│ Cognito JWT     │  │ resort_stats    │  │ Athena workgroup           │
│ DynamoDB wiki   │  │ ElastiCache     │  │ Night 20 export prefix      │
│ Secrets Manager │  │ Redis cache-aside│  │ Night 24 Parquet queries   │
│ Nights: 2–3,17  │  │ Nights: 15–18,23│  │ Nights: 20, 24              │
└─────────────────┘  └─────────────────┘  └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PIPELINE / COMPUTE TIER (backend trust zone)                           │
│                                                                         │
│  Night 32 capstone (preferred):                                       │
│    EventBridge cron → Step Functions Standard                           │
│      RunIcelandTask (ecs:runTask.sync)                                  │
│      → SQS completion → Lambda stats uploader → SNS success/failure   │
│                                                                         │
│  Legacy path (Nights 12–14, until migrated):                            │
│    EventBridge cron → ECS Fargate Iceland task                          │
│      success → EventBridge → SQS → worker                               │
│      failure → EventBridge → SNS fan-out                                │
│                                                                         │
│  Output: S3 globalskiatlas-backend-k8s-output/iceland/YYYY-MM/          │
│  Nights: 9–12, 14, 17, 27–28, 30–32                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NETWORK TIER                                                           │
│  VPC 10.0.0.0/16 — 2 AZ — public + private subnets                      │
│  NAT Gateway (public-a) — private subnet egress                         │
│  S3 gateway + ECR interface endpoints (cost + security)                 │
│  SG boundaries: Fargate, Lambda ENI, ElastiCache, Aurora                │
│  Nights: 8–9, 21 (hybrid awareness), 22 (teardown order)                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tier wins matrix (Night 33 assignment)

Fill one **security**, **resilience**, and **cost** sentence per tier. Starter answers below — personalize after running `night-33-lab-architecture-audit.ps1`.

| Tier | Security win | Resilience win | Cost win | Primary pillar |
|------|--------------|----------------|----------|----------------|
| **Edge / Frontend** | Cognito JWT on wiki writes; TLS at CloudFront; WAF CLOUDFRONT scope (Night 4 pattern) | Route 53 failover + health checks (Night 25); CloudFront multi-edge | `CachingOptimized` static; `CachingDisabled` on `/api/wiki*` until safe TTL | Security, Performance |
| **Application** | Secrets Manager for Cognito client secret + KMS decrypt (Night 2); least-privilege Lambda roles | Lambda retries + DLQ on async paths; idempotent SQS handlers (Night 17) | Right-size Lambda memory after profiling; API GW usage plans for partners | Security, Reliability |
| **Data / OLTP** | Aurora + DynamoDB in private subnets; SG ingress from Lambda SG only | Aurora Multi-AZ writer; PITR + AWS Backup (Nights 15, 19); DynamoDB PITR (Night 18) | ElastiCache cache-aside cuts Aurora read IOPS (Night 23) | Reliability, Cost |
| **Analytics** | S3 bucket policies + IAM on Athena workgroup; no public lake prefixes | Iceberg snapshots for point-in-time table reads (Night 24) | Athena partition keys + lifecycle on old exports (Nights 24, 30) | Performance, Cost |
| **Pipeline / Compute** | Separate ECS execution vs task roles; Step Functions `iam:PassRole` scoped (Night 32) | SQS DLQ + SNS failure fan-out; Step Functions Catch per step | Fargate Spot for retryable batch; lifecycle `iceland/` → IA → Glacier (Nights 31, 30) | Reliability, Cost |
| **Network** | Private subnets for Fargate/Lambda ENI; no 0.0.0.0/0 on data SGs | 2-AZ subnets; know single-NAT AZ risk (Night 9) | VPC endpoints for S3/ECR vs NAT GB tax (Night 8) | Security, Cost |

---

## Well-Architected pillar → lab index

| Pillar | GSA evidence | Study nights |
|--------|--------------|--------------|
| **Operational Excellence** | Step Functions execution history; CloudWatch dashboards (Night 26); structured integration audit (Night 28) | 26, 28, 32 |
| **Security** | KMS + Secrets Manager; Cognito auth boundary; IAM least privilege; SG defense in depth | 1–7, 17 |
| **Reliability** | Multi-AZ Aurora; SQS DLQ; SNS failure path; Route 53 failover; DynamoDB PITR | 14–19, 25 |
| **Performance Efficiency** | CloudFront edge; ElastiCache cache-aside; Athena partitions; CloudFront path behaviors | 23–26 |
| **Cost Optimization** | S3 lifecycle; Fargate right-sizing + Spot; NAT vs endpoints; scheduled batch vs 24/7 | 27, 30–31 |
| **Sustainability** | Serverless + Fargate vs always-on EC2; lifecycle to colder storage; right-sized tasks | 30–31 (awareness) |

---

## Cross-tier exam traps (flashcard block)

| Trap | Correct framing |
|------|-----------------|
| CloudFront replaces ElastiCache | **No** — edge HTTP vs in-VPC object cache (Nights 23, 26) |
| Athena for live wiki writes | **No** — Aurora/DynamoDB OLTP; Athena on S3 lake |
| EBS holds Iceland pipeline output | **No** — durable output is S3; EBS is scratch |
| EventBridge alone for multi-step Catch | **No** — Step Functions when per-step error routing matters (Night 32) |
| Single NAT = multi-AZ resilient egress | **No** — NAT is AZ-specific; recreate or NAT per AZ for HA |
| Public S3 + CloudFront = Config compliant | **No** — modern pattern is OAC + private bucket (Night 1) |

---

## Related files

| File | Role |
|------|------|
| `week1-security-architecture.md` | Site A + Site B security diagrams |
| `wiki-api-production.md` | CloudFront origins + cache behaviors |
| `iceland-pipeline-compute.md` | Pipeline compute + Spot cost |
| `gsa-integration-map.md` | EventBridge / SQS / SNS wiring |
| `gsa-stepfunctions-map.md` | Night 32 capstone ASL path |
| `gsa-s3-lifecycle-map.md` | Bucket prefixes + lifecycle |
| `gsa-fargate-rightsizing-map.md` | Task sizing scenarios |
| `night-33-architecture-writeup.md` | Tonight's lab guide |
