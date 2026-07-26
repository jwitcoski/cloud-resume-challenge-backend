# Night 37 — Keywords: database, high availability, disaster recovery, migration

~2 hr. **$0 AWS spend.** “Company X is migrating their database…” stems are **force-word bags**. Decode them; don’t redesign the company.

---

## Plain language first

Underline:

```
sync vs async replication
Multi-AZ / read replica / Global Database
how much data you can lose (RPO) / how fast you must recover (RTO)
flexible schema / frequent schema change
auth token / instance profile
custom endpoint / capacity class
row-level change vs RDS "event"
minimize development changes / same engine (homogeneous)
```

---

## Block 1 (~30 min) — Maps

### High availability / disaster recovery

| Force words | Pick | Kill |
|-------------|------|------|
| sync standby, Availability Zone failure auto-failover, same Region high availability | **RDS/Aurora Multi-AZ** | read replica (async, manual promote) |
| lose ≤ ~1 second of data, recover in under 1 minute, **multi-Region** relational disaster recovery | **Aurora Global Database** | cross-Region read replica (minutes of lag) |
| scale reads, reporting off primary | **read replicas** / Aurora reader endpoint | Multi-AZ alone |
| prod on fat instances, reports on thin | **Aurora custom endpoints** | “Aurora routes by default” |
| flexible schema, global scale, low latency | **DynamoDB** | Aurora/RDS/Redshift |
| uneven write capacity / hot partitions | **high-cardinality partition keys** | low-cardinality keys |
| item changes → notify / workflow | **DynamoDB Streams** (+ Lambda) | DynamoDB Accelerator (DAX) |
| Aurora MySQL **row** deleted → queue consumers | **native Lambda invoke** → SQS | RDS event subscription (infra events only) |
| auth token from EC2 instance profile to MySQL/PostgreSQL | **IAM database authentication** | IAM role alone |
| per-process CPU/memory on RDS OS | **Enhanced Monitoring** | CloudWatch hypervisor CPU only |

### Migration / rehost

| Force words | Pick | Kill |
|-------------|------|------|
| minimize code change, .NET on Windows/IIS | **Elastic Beanstalk** | EKS/.NET Core refactor, ECS Anywhere |
| Oracle → Oracle on AWS, high availability | **Database Migration Service → RDS Oracle Multi-AZ** | Application Migration Service to EC2 as first choice for managed high availability |
| same engine (homogeneous) | **Database Migration Service** (Schema Conversion Tool not required) | Schema Conversion Tool (different engines) |
| bursts **within seconds** via API | **API Gateway + Lambda** | EC2/ECS/Beanstalk Auto Scaling (minutes) |

### Soft rules

- **RDS events** ≠ INSERT/UPDATE/DELETE triggers.
- **Multi-AZ** = durability/failover; **replica** = scale reads / async disaster recovery.
- Predictable daily peak → **scheduled scaling**, not wait for CPU alarm.

---

## Block 2 (~60 min) — Stem drills

1. Need sync replication to another Availability Zone for MySQL RDS high availability.
2. Relational; multi-Region; lose at most 1 second of data; recover in under 1 minute.
3. Global app; frequent schema changes; low-latency hot queries.
4. Aurora: prod traffic to large instances; staff reports to small.
5. EC2 app must use RDS auth token from instance profile.
6. Sold-car row deleted in Aurora MySQL; fan-out to processors via queues.
7. DynamoDB follow/notify via email on profile update.
8. Windows .NET + Oracle Standard Edition; minimize changes; easier ops; high availability.
9. Quiet API most days; product launch bursts in seconds.
10. Need 2 EC2 after an Availability Zone dies; scale to 6; mission-critical.

<details>
<summary>Key</summary>

1. Multi-AZ  
2. Aurora Global Database  
3. DynamoDB  
4. Custom endpoints  
5. Enable IAM database authentication  
6. Aurora native Lambda → SQS  
7. Streams + Lambda + SNS  
8. Elastic Beanstalk Multi-AZ + Database Migration Service → RDS Oracle Multi-AZ  
9. API Gateway + Lambda  
10. Auto Scaling group min 4 / max 6, 2 Availability Zones  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-37-quiz.json`** (20 questions).

---

## Tomorrow

Security service selection: detection vs prevention vs encryption vs identity.
