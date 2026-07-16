# Night 39 — Keywords: compute, networking, integration

~2 hr. **$0 AWS spend.** Force words about **time**, **path**, and **change feed** decide these questions.

---

## Plain language first

```
within seconds  → Lambda (often + API GW)
minutes / ASG   → EC2 Auto Scaling family
predictable 9–5 → scheduled scaling
no NAT + AWS APIs private → VPC endpoints
on-prem dedicated link → Direct Connect (not “private S3 endpoint”)
IPv6 outbound only → egress-only IGW
CloudFront auth near users + cheap → Lambda@Edge
many Regions for latency (expensive) → only if stem allows cost
```

---

## Block 1 (~30 min) — Maps

### Compute / scale

| Force words | Pick | Kill |
|-------------|------|------|
| bursts within **seconds**; API frontend | **API GW + Lambda** | EC2/ECS/Beanstalk ASG |
| protect API backends from spikes | **API Gateway throttling** (+ cache sometimes) | “do nothing”; Multi-AZ API GW |
| predictable office-hours load; morning cold | **scheduled scaling** | wait for dynamic CPU |
| mixed instance types/sizes; known schedule | **scheduled** over predictive | predictive (assumes homogeneous) |
| need N after AZ death | ASG **min ≥ 2N** across AZs | min = N with 1 per AZ |
| default scale-in terminate preference | **oldest launch template** (after AZ balance) | “oldest instance” / random first |
| memory / disk **space** on EC2 | **CloudWatch agent** | default CW metrics |
| edge auth; don’t redeploy whole stack multi-Region | **Lambda@Edge** | multi-Region + latency Route 53 for cost stems |
| CloudFront 504s | **origin failover / origin group** | ignore HA |

### Network / hybrid path

| Force words | Pick | Kill |
|-------------|------|------|
| private AWS service access, no IGW/NAT | **VPC endpoint** | DX, VPN CloudHub, encryption |
| dedicated on-prem ↔ AWS bandwidth | **Direct Connect** | “DX as S3 private endpoint” in-VPC |
| interconnect many VPCs/accounts share TGW etc. | **Organizations + RAM** (when sharing) | ParallelCluster |

### Integration / streaming

| Force words | Pick | Kill |
|-------------|------|------|
| DynamoDB item change → notify | **Streams + Lambda** (+ SNS) | DAX; Adapter w/o enable Streams |
| anonymize **before** durable NoSQL | **Kinesis → Lambda → DynamoDB** | land in S3/Dynamo first |
| S3 event → many team queues | **SNS fan-out → SQS** (S3 → one dest only) | two SQS directly on S3 |
| S3 PUT → run Fargate/ECS task least effort | **EventBridge → ECS task** | Lambda wrapper unless needed |

---

## Block 2 (~60 min) — Stem drills

1. Private subnet; S3+DynamoDB; no NAT; no public Internet.
2. Portal expects global spike; protect backends beyond NACLs.
3. ASG slow every morning 9am; known schedule; mixed instance sizes.
4. Fault tolerant: always ≥2 after AZ loss; peak 6.
5. Memory + disk utilization on Linux and Windows EC2.
6. Long CloudFront logins + occasional 504; cost-effective.
7. Real-time PII; anonymize before NoSQL store.
8. DynamoDB WCU hot partitions / uneven keys.
9. Default ASG scale-in; which instance preference after AZ balance?
10. SFTP least ops was Night 36 — tonight: API bursts in seconds.

<details>
<summary>Key</summary>

1. VPC endpoints  
2. API GW throttling  
3. Scheduled scaling  
4. Min 4 / max 6  
5. CloudWatch agent  
6. Lambda@Edge + origin failover  
7. Kinesis → Lambda → DynamoDB  
8. High-cardinality keys  
9. Oldest launch template  
10. API GW + Lambda  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-39-quiz.json`** (20 Q).

---

## Tomorrow (Night 40)

Timed Practice Exam 2 (target ≥75%). For every miss: write the force words you missed — not a new service chapter.
