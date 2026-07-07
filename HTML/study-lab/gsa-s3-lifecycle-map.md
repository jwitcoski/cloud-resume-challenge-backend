# GSA S3 lifecycle map — buckets, prefixes, and cost levers

Reference for **Night 30** and Week 5 cost labs. Maps real Global Ski Atlas buckets to storage-class and lifecycle decisions.

---

## Bucket inventory

| Bucket | Role | Hot prefix | Archive candidate |
|--------|------|------------|-------------------|
| `globalskiatlas-backend-k8s-output` | Iceland pipeline + backend artifacts | `iceland/YYYY-MM/` current month | Prior `iceland/` months → Standard-IA → Glacier |
| `saa-study-gsa-migration-298043721974` | Night 20 exports + Night 24 Iceberg | `night-24/iceberg/` active analytics | `night-20/dynamodb/` exports after 90 d |
| Static site / resume buckets | CloudFront origins | `index.html`, assets | Versioned old deploys (if versioning on) |

**Night 30 lab** applies a **study lifecycle rule** on `globalskiatlas-backend-k8s-output` scoped to `iceland/` — transitions are **day-based**, so this month’s `iceland/2026-07/` output stays Standard until the rule’s age threshold.

---

## Iceland pipeline prefix pattern

```
globalskiatlas-backend-k8s-output/
└── iceland/
    ├── 2026-06/          ← Night 10 RunTask output (GeoJSON, logs manifest)
    ├── 2026-07/          ← next monthly run
    └── ...
```

| Object age | Exam storage class | Why |
|------------|-------------------|-----|
| Current month | **S3 Standard** | Pipeline may re-read; Athena/Glue may register |
| 30–90 days | **Standard-IA** or **Intelligent-Tiering** | Infrequent GET; still ms retrieval |
| 12+ months | **Glacier Flexible Retrieval** or **Deep Archive** | Compliance / cost; hours retrieval OK |

**Do not** lifecycle-delete the **only** copy of production pipeline output without replication or backup (Night 19).

---

## Lifecycle rule anatomy (exam)

```
S3 bucket
  └── Lifecycle configuration
        ├── Filter: prefix and/or tags
        ├── Transitions: days + storage class
        ├── Expiration: delete after N days (optional)
        ├── NoncurrentVersionTransitions (if versioning)
        └── AbortIncompleteMultipartUpload (cost hygiene)
```

| Transition | Minimum duration trap |
|------------|----------------------|
| Standard → Standard-IA | Object **30 days** in Standard |
| Standard-IA → Glacier | **30 days** in Standard-IA |
| Glacier → Deep Archive | Tier-specific minimums |
| Intelligent-Tiering | Monitoring fee; auto-moves between access tiers |

**Exam:** Lifecycle **cannot** fix wrong initial class for hot data — design the right class at upload, use lifecycle for **aging** objects.

---

## Cost tools (Night 30 Block 2)

| Tool | What it does | GSA use |
|------|--------------|---------|
| **Cost Explorer** | Visualize spend by service, tag, linked account | Find NAT, ElastiCache, Aurora idle cost |
| **AWS Budgets** | Alert on actual or **forecasted** spend | `$25` study account cap email |
| **Cost and Usage Report (CUR)** | Hourly line items to S3 | Awareness — Athena on billing data |
| **S3 Storage Lens** | Org/bucket metrics, incomplete MPU | Optional advanced — not tonight’s lab |

**Data transfer** (from Night 27/29): cross-AZ, cross-Region, and internet egress often beat storage on the bill — lifecycle saves **GB-months**; VPC endpoints save **NAT GB**.

---

## Decision one-liner (flashcard)

**“Old Iceland months in S3?”** → Lifecycle `iceland/` → Standard-IA → Glacier; keep current month Standard; durable output never on EBS alone.
