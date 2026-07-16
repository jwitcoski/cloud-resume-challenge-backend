# Night 36 — Keywords: storage + hybrid

~2 hr. **$0 AWS spend.** Apply Night 35’s method to storage stems. These dominated several Practice Exam 1 misses when “just use S3” felt right.

---

## Plain language first

S3 is default for **objects**. The stem tells you when it is not.

```
Underline interface words first:
  object / URL / bucket / lifecycle / Glacier
  block / volume / boot / iSCSI
  POSIX / mount / concurrent Linux
  SMB / Windows file share / AD
  SFTP / managed transfer
  local cache + on-prem protocol
```

---

## Block 1 (~30 min) — Force-word → service map

| Force words in stem | Pick | Near-miss kill |
|---------------------|------|----------------|
| object, unlimited, static site, analytics files, lifecycle to Glacier | **S3** | EBS, EFS |
| boot volume, single-instance DB disk, persistent **block** for one EC2 | **EBS** | Instance Store (ephemeral), S3 |
| POSIX, shared, many EC2, Multi-AZ Linux | **EFS** | bigger EBS, S3 “as filesystem” |
| Windows SMB, AD integration, file share migrate | **FSx Windows** | EFS (Linux), EBS |
| Windows + **block** / iSCSI + Multi-AZ HA | **FSx NetApp ONTAP** | FSx Windows (file only) |
| parallel HPC / ML hot scratch | **FSx Lustre** (+ S3 cold) | EFS “good enough” |
| on-prem SMB/NFS + **local cache** + objects in AWS | **File Gateway** | DataSync (no cache), Tape Gateway |
| SFTP + encrypt + HA + delete after N days + least ops | **Transfer Family → S3** + lifecycle expire | EC2+SFTP; EFS lifecycle (≠ delete); Transfer “retention policy” |
| WORM timed + even root | **Object Lock compliance + retention** | governance; legal hold “for 1 year” |
| accidental delete, still allow deletes | **Versioning + MFA Delete** | Deny Delete policy |
| restrict S3 access to one VPC | **S3 Access Point (VPC)** | Network Firewall on bucket |
| many private files, **don’t change URLs** | **CloudFront signed cookies** | signed URL |
| fastest long-haul upload to a Region bucket | **Transfer Acceleration + multipart** | CRR (slower), Site-to-Site VPN |

### Soft rules

- **EFS lifecycle** transitions IA — it does **not** delete files.
- **Legal hold** has **no** duration — never pair with “for one year.”
- **Instance Store** dies with the instance — never “mission-critical persistent.”
- **One Zone-IA** is not “archival.”

---

## Block 2 (~60 min) — Stem drills (write force words → pick)

Do these without options first (10), then take the quiz.

1. CMS on ASG EC2; uploads on one EBS; need scalable HA POSIX shared store.
2. Trading app on Windows; Multi-AZ; low-latency shared **block**.
3. Confidential docs via SFTP; encrypt; HA; auto-delete at 30 days; least ops.
4. On-prem corporate docs over SMB; local cache; Glacier after months.
5. Clinical data; no overwrite/delete for 1 year including root.
6. Junior deleted S3 objects; prevent accident; allow intentional delete.
7. Tax docs; WORM; requests only from one VPC.
8. Member-only media library; many files; keep current URLs.
9. Global weather sites; one-time 500 GB each → us-east-1 ASAP (no DX partner).
10. Persistent block for EC2; object backups; after 30d to archival storage.

<details>
<summary>Key</summary>

1. EFS  
2. FSx ONTAP iSCSI  
3. Transfer Family → S3 + lifecycle expire  
4. File Gateway + S3 lifecycle → Glacier  
5. Object Lock compliance + retention  
6. Versioning + MFA Delete  
7. Access Point (VPC) + Object Lock  
8. Signed cookies  
9. Transfer Acceleration + multipart  
10. EBS + S3 + lifecycle → Glacier Flexible Retrieval  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-36-quiz.json`** (20 Q). Margin: interface force word before answering.

---

## Tomorrow

Databases: Multi-AZ vs read replica vs Aurora Global vs DynamoDB; DMS vs refactor; custom endpoints; IAM DB auth.
