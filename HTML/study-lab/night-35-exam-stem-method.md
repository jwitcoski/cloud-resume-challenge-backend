# Night 35 — Exam stem method (how Solutions Architect questions actually work)

~2 hr. **$0 AWS spend.** Week 6 starts here. Practice Exam 1 felt like “Company X is migrating…” noise because those stems are a **decoding puzzle**, not a request to redesign the whole company. Tonight you learn the method. Nights 36–39 apply it by domain. Night 40 is Practice Exam 2.

---

## Plain language first

You already know a lot of AWS from the study labs. The mock graded something else:

> **Ignore the industry story. Underline the force words. Pick the option that satisfies every force word. Kill near-misses that satisfy only some.**

“Company X / healthcare / cryptocurrency / social network” is filler. The exam is testing whether you notice **no NAT gateway**, **within seconds**, **including root**, **POSIX filesystem**, **minimize code change**, **across accounts**.

---

## Block 1 (~40 min) — Stem anatomy

### The four layers of every question

```
1. STORY (ignore)     Company, industry, product name, drama
2. WORKLOAD HINT      What kind of system (web, database, file share, API)
3. FORCE WORDS        Constraints that eliminate options (underline these)
4. ASK                "MOST cost-effective" / "LEAST operational overhead" / select TWO
```

**Practice aloud on this stem:**

> A popular social network stores user data in DynamoDB. They want a follow feature: subscribers get email when a user updates. Which is most suitable?

| Layer | Extract |
|-------|---------|
| Story | social network (ignore) |
| Workload | DynamoDB item changes → notifications |
| Force words | *react to updates*, *email*, *most suitable* (managed path) |
| Ask | single best architecture |

**Decode →** enable **DynamoDB Streams** + **Lambda** + **SNS** (email).  
**Kill →** DynamoDB Accelerator / DAX (cache, not change feed); Kinesis Adapter without “enable Streams”; anything that never enables the stream.

### Force-word families (memorize the categories)

| Family | Example words | Usually means |
|--------|---------------|---------------|
| **Time scale** | within seconds, minutes, predictable 9–5 | Lambda / scheduled scale / Auto Scaling group |
| **Blast radius** | including root, any user, across accounts | compliance lock / Firewall Manager |
| **Interface** | POSIX, SMB, iSCSI, object, block, mount | EFS / FSx / EBS / S3 |
| **Network path** | no Internet, no NAT gateway, private subnet, IPv6 outbound only | VPC endpoint / egress-only internet gateway |
| **Ops burden** | least operational overhead, managed, minimize code change | Transfer Family / Elastic Beanstalk / not EC2 + cron |
| **Ordering / change** | item-level changes, before landing in store | Streams / Kinesis transform first |
| **Disaster recovery numbers** | lose at most 1 second of data (RPO), recover in under 1 minute (RTO), Multi-AZ | Aurora Global / Multi-AZ sync |
| **Cost adjective** | MOST cost-effective, without deploying many Regions | Lambda@Edge not full multi-Region |

**Quick glossary for this week**

| Shorthand | Means |
|-----------|--------|
| Multi-AZ | Same Region, multiple Availability Zones (failover / high availability) |
| RPO | Recovery Point Objective — how much data you can afford to lose |
| RTO | Recovery Time Objective — how fast the system must be back |
| POSIX | Linux-style shared filesystem (mount, concurrent access) |
| SMB | Windows file-share protocol |
| iSCSI | Block storage over the network |
| WORM | Write once, read many — cannot overwrite/delete for a timed period |
| SQL injection | Attack that injects database commands through web input |
| Auto Scaling group | EC2 fleet that grows/shrinks by policy |

### The five distractor types (how wrong answers are written)

1. **Right family, wrong product** — GuardDuty when you need WAF; CloudWatch when you need Enhanced Monitoring.
2. **Missing the toggle** — IAM role without IAM database authentication; Adapter without enable Streams.
3. **Solves a different requirement** — encryption for private routing; versioning alone when they want write-once lock vs root.
4. **Too much ops / too much change** — EKS refactor when “minimize development changes”; EC2 SFTP when Transfer Family exists.
5. **AWS default magic** — “Aurora does it automatically”; “API Gateway needs no throttling config.”

### Method card (write this on paper; use every question)

```
1. Cross out the company story in one second.
2. Underline force words (copy them into the margin).
3. Name the interface / time / blast-radius family.
4. Predict the service BEFORE reading options.
5. Read options only to confirm / kill near-misses.
6. If Select TWO: each pick must hit a different force word.
```

---

## Block 2 (~50 min) — Live decode (12 stems, no options)

For each stem: write force words + predicted service (30–45 sec). Then check the key at the bottom of this block.

1. Private subnet EC2 must reach S3 and DynamoDB; no public Internet; no NAT gateway.
2. Application Load Balancer apps in many accounts hit by SQL injection; need managed rules reused centrally.
3. Accidental S3 delete/overwrite; deletes still allowed; need recoverability.
4. Write-once lock one year; even root cannot delete; timed period.
5. API spikes; protect backends beyond network ACLs.
6. Traffic bursts within seconds; access via API; usually quiet.
7. Fleet of EC2; shared POSIX filesystem; Multi-AZ.
8. Windows servers; Multi-AZ; low-latency **block** storage.
9. On-prem SMB docs; local cache; later Glacier archive from AWS.
10. Need 2 instances after an Availability Zone fails; peak 6; fault tolerant.
11. .NET on Windows + Oracle; migrate; minimize code change; easier to manage; high availability.
12. Personal data must be anonymized **before** landing in NoSQL; real-time ingest.

<details>
<summary>Decode key (open after you write predictions)</summary>

1. VPC endpoints (S3 + DynamoDB)  
2. WAF SQL-injection managed rules + Firewall Manager  
3. Versioning + MFA Delete  
4. Object Lock **compliance** + **retention period**  
5. API Gateway throttling  
6. API Gateway + Lambda  
7. EFS  
8. FSx for NetApp ONTAP (iSCSI)  
9. Storage Gateway **File** Gateway + S3 lifecycle  
10. Auto Scaling group min 4 / max 6 across 2 Availability Zones  
11. Elastic Beanstalk Multi-AZ + Database Migration Service → RDS Oracle Multi-AZ  
12. Kinesis Data Streams → Lambda anonymize → DynamoDB  

</details>

---

## Block 3 (~30 min) — Quiz

Open **`night-35-quiz.json`** (20 questions). Every item trains **decode steps**, not obscure services.

Rules:

1. For each question, write force words in the margin before picking.
2. Grade with `night-35-quiz-answers.json`.
3. Misses → note which distractor type (1–5 above) got you.

---

## Tomorrow (Night 36)

Storage force words only: object / block / file / SMB / iSCSI / gateway / SFTP / write-once lock / Transfer Acceleration. Same method, narrower map.
