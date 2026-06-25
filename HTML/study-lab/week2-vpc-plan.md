# Week 2 VPC plan (Night 7 block 3 — draw on paper)

Prep for Nights 8–10: private Fargate pipeline for Global Ski Atlas backend.

## Target architecture (2 AZ, us-east-1)

```
                    Internet
                        │
                        ▼
                   Internet Gateway
                        │
        ┌───────────────┴───────────────┐
        │         Public Subnets        │
        │   AZ-a (10.0.1.0/24)          │
        │   AZ-b (10.0.2.0/24)          │
        │   • NAT Gateway (AZ-a)        │
        │   • (optional) Bastion — prefer SSM Session Manager
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │        Private Subnets        │
        │   AZ-a (10.0.11.0/24)         │
        │   AZ-b (10.0.12.0/24)         │
        │   • ECS Fargate tasks         │
        │     (Iceland OSM pipeline)    │
        └───────────────┬───────────────┘
                        │
              S3 Gateway Endpoint (free)
              or NAT for ECR/API calls
```

## Label on your diagram

| Component | Notes |
|-----------|-------|
| **Route tables** | Public → 0.0.0.0/0 via IGW; Private → 0.0.0.0/0 via NAT |
| **Security group (Fargate)** | Outbound: HTTPS to ECR, S3, CloudWatch Logs; no inbound |
| **NACL vs SG** | NACL stateless — allow ephemeral return ports if restricting |
| **S3 endpoint** | Gateway endpoint in route table avoids NAT charges for S3 |
| **ECR pull** | Needs NAT or VPC endpoints (ecr.api + ecr.dkr + s3) |

## ECS task networking (Night 10 lab)

```
GitHub Actions ── ecs:RunTask ──► Fargate in private subnet
                                      │
                    Execution role: ECR pull, logs
                    Task role: S3WriteGlobalskiatlasOutput
                                      │
                                      ▼
                         S3 globalskiatlas-backend-k8s-output
```

## Week 2 nightly map

| Night | Focus |
|-------|-------|
| 8 | Paper VPC design — IGW, NAT, SG vs NACL flashcards |
| 9 | Build VPC + subnets + NAT (document IDs) |
| 10 | Run Iceland ECS task in private subnet; troubleshoot SG |
| 11 | ALB vs NLB vs GWLB theory |
| 12 | EventBridge cron → Iceland RunTask (lab) |
| 13 | SQS completion queue + DLQ; EventBridge ECS success → SQS (lab) |
| 14 | SNS fan-out (failure alerts + subscriptions) |

## 5 flashcards to write tonight

1. **NAT vs IGW** — who uses which?
2. **SG vs NACL** — stateful vs stateless?
3. **S3 Gateway Endpoint vs NAT** — cost and routing?
4. **Private subnet Fargate** — what must reach the internet?
5. **VPC endpoints for ECR** — which three endpoints avoid NAT for image pull?

## Exam scenarios to sketch (one line each)

- Lambda in VPC needs DynamoDB — endpoint or NAT?
- Aurora in private subnet — Lambda SG ingress rule on 5432
- Site-to-Site VPN vs Direct Connect vs PrivateLink — when each?
