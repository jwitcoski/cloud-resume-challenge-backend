# Night 37 — Keywords: database, HA, DR, migration

~2 hr. **$0 AWS spend.** “Company X is migrating their database…” stems are **force-word bags**. Decode them; don’t redesign the company.

---

## Plain language first

Underline:

```
sync vs async
Multi-AZ / read replica / Global Database
RPO / RTO numbers
flexible schema / frequent schema change
auth token / instance profile
custom endpoint / capacity class
row-level change vs RDS "event"
minimize development changes / homogeneous
```

---

## Block 1 (~30 min) — Maps

### HA / DR

| Force words | Pick | Kill |
|-------------|------|------|
| sync standby, AZ failure auto-failover, same Region HA | **RDS/Aurora Multi-AZ** | read replica (async, manual promote) |
| RPO ~1s, RTO &lt;1 min, **multi-Region** relational DR | **Aurora Global Database** | cross-Region read replica (minutes lag) |
| scale reads, reporting off primary | **read replicas** / Aurora reader endpoint | Multi-AZ alone |
| prod on fat instances, reports on thin | **Aurora custom endpoints** | “Aurora routes by default” |
| flexible schema, global scale, low latency | **DynamoDB** | Aurora/RDS/Redshift |
| uneven WCU / hot partitions | **high-cardinality partition keys** | low-cardinality keys |
| item changes → notify / workflow | **DynamoDB Streams** (+ Lambda) | DAX |
| Aurora MySQL **row** deleted → queue consumers | **native Lambda invoke** → SQS | RDS event subscription (infra events) |
| auth token from EC2 instance profile to MySQL/PG | **IAM database authentication** | IAM role alone |
| per-process CPU/MEM on RDS OS | **Enhanced Monitoring** | CloudWatch hypervisor CPU only |

### Migration / rehost

| Force words | Pick | Kill |
|-------------|------|------|
| minimize code change, .NET on Windows/IIS | **Elastic Beanstalk** | EKS/.NET Core refactor, ECS Anywhere |
| Oracle → Oracle on AWS, HA | **DMS → RDS Oracle Multi-AZ** | MGN to EC2 as first choice for managed HA |
| homogeneous (same engine) | **DMS** (no SCT required) | SCT (heterogeneous) |
| bursts **within seconds** via API | **API GW + Lambda** | EC2/ECS/Beanstalk ASG (minutes) |

### Soft rules

- **RDS events** ≠ INSERT/UPDATE/DELETE triggers.
- **Multi-AZ** = durability/failover; **replica** = scale reads / async DR.
- Predictable daily peak → **scheduled scaling**, not wait for CPU alarm.

---

## Block 2 (~60 min) — Stem drills

1. Need sync replication to another AZ for MySQL RDS HA.
2. Relational; multi-Region; RPO 1s; RTO &lt;1 min.
3. Global app; frequent schema changes; low-latency hot queries.
4. Aurora: prod traffic to large instances; staff reports to small.
5. EC2 app must use RDS auth token from instance profile.
6. Sold-car row deleted in Aurora MySQL; fan-out to processors via queues.
7. DynamoDB follow/notify via email on profile update.
8. Windows .NET + Oracle SE; minimize changes; easier ops; HA.
9. Quiet API most days; product launch bursts in seconds.
10. Need 2 EC2 after AZ death; scale to 6; mission-critical.

<details>
<summary>Key</summary>

1. Multi-AZ  
2. Aurora Global Database  
3. DynamoDB  
4. Custom endpoints  
5. Enable IAM DB authentication  
6. Aurora native Lambda → SQS  
7. Streams + Lambda + SNS  
8. Beanstalk Multi-AZ + DMS → RDS Oracle Multi-AZ  
9. API Gateway + Lambda  
10. ASG min 4 / max 6, 2 AZs  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-37-quiz.json`** (20 Q).

---

## Tomorrow

Security service selection: detection vs prevention vs encryption vs identity.
