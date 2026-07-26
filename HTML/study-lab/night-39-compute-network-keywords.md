# Night 39 — Keywords: compute, networking, integration

~2 hr. **$0 AWS spend.** Force words about **time**, **path**, and **change feed** decide these questions.

---

## Plain language first

```
within seconds  → Lambda (often + API Gateway)
minutes / Auto Scaling group   → EC2 Auto Scaling family
predictable 9–5 → scheduled scaling
no NAT gateway + AWS APIs private → VPC endpoints
on-prem dedicated link → Direct Connect (not “private S3 endpoint”)
IPv6 outbound only → egress-only internet gateway
CloudFront auth near users + cheap → Lambda@Edge
many Regions for latency (expensive) → only if stem allows cost
```

---

## Block 1 (~30 min) — Maps

### Compute / scale

| Force words | Pick | Kill |
|-------------|------|------|
| bursts within **seconds**; API frontend | **API Gateway + Lambda** | EC2/ECS/Beanstalk Auto Scaling |
| protect API backends from spikes | **API Gateway throttling** (+ cache sometimes) | “do nothing”; Multi-AZ API Gateway |
| predictable office-hours load; morning cold | **scheduled scaling** | wait for dynamic CPU |
| mixed instance types/sizes; known schedule | **scheduled** over predictive | predictive (assumes same instance family) |
| need N after an Availability Zone dies | Auto Scaling group **min ≥ 2N** across Availability Zones | min = N with 1 per Availability Zone |
| default scale-in terminate preference | **oldest launch template** (after Availability Zone balance) | “oldest instance” / random first |
| memory / disk **space** on EC2 | **CloudWatch agent** | default CloudWatch metrics |
| edge auth; don’t redeploy whole stack multi-Region | **Lambda@Edge** | multi-Region + latency Route 53 for cost stems |
| CloudFront 504s | **origin failover / origin group** | ignore high availability |

### Network / hybrid path

| Force words | Pick | Kill |
|-------------|------|------|
| private AWS service access, no internet gateway / NAT gateway | **VPC endpoint** | Direct Connect, VPN CloudHub, encryption |
| dedicated on-prem ↔ AWS bandwidth | **Direct Connect** | “Direct Connect as S3 private endpoint” inside the VPC |
| interconnect many VPCs/accounts, share resources | **Organizations + Resource Access Manager** (when sharing) | ParallelCluster |

### Integration / streaming

| Force words | Pick | Kill |
|-------------|------|------|
| DynamoDB item change → notify | **Streams + Lambda** (+ SNS) | DynamoDB Accelerator; Adapter without enable Streams |
| anonymize **before** durable NoSQL | **Kinesis → Lambda → DynamoDB** | land in S3/Dynamo first |
| S3 event → many team queues | **SNS fan-out → SQS** (S3 → one destination only) | two SQS queues directly on S3 |
| S3 PUT → run Fargate/ECS task least effort | **EventBridge → ECS task** | Lambda wrapper unless needed |

---

## Block 2 (~60 min) — Stem drills

1. Private subnet; S3+DynamoDB; no NAT gateway; no public Internet.
2. Portal expects global spike; protect backends beyond network ACLs.
3. Auto Scaling group slow every morning 9am; known schedule; mixed instance sizes.
4. Fault tolerant: always ≥2 after Availability Zone loss; peak 6.
5. Memory + disk utilization on Linux and Windows EC2.
6. Long CloudFront logins + occasional 504; cost-effective.
7. Real-time personal data; anonymize before NoSQL store.
8. DynamoDB write capacity hot partitions / uneven keys.
9. Default Auto Scaling scale-in; which instance preference after Availability Zone balance?
10. SFTP least operational work was Night 36 — tonight: API bursts in seconds.

<details>
<summary>Key</summary>

1. VPC endpoints  
2. API Gateway throttling  
3. Scheduled scaling  
4. Min 4 / max 6  
5. CloudWatch agent  
6. Lambda@Edge + origin failover  
7. Kinesis → Lambda → DynamoDB  
8. High-cardinality keys  
9. Oldest launch template  
10. API Gateway + Lambda  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-39-quiz.json`** (20 questions).

---

## Tomorrow (Night 40)

Timed Practice Exam 2 (target ≥75%). For every miss: write the force words you missed — not a new service chapter.
