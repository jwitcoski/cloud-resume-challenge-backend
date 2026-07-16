# Night 38 — Keywords: security service selection

~2 hr. **$0 AWS spend.** Most security misses are **right intent, wrong product**. Force words tell you prevention vs detection vs data classification vs DDoS vs edge auth.

---

## Plain language first

Ask in order:

```
1. Are we BLOCKING requests or DETECTING threats?
2. Is the attack L7 (HTTP/SQLi) or volumetric DDoS?
3. Data classification / PII discovery?
4. Key control / WORM / identity federation?
5. Multi-account reuse of rules?
```

---

## Block 1 (~30 min) — Map

| Force words | Pick | Kill |
|-------------|------|------|
| SQLi / XSS on ALB or CloudFront; block patterns | **AWS WAF** (+ managed rule groups) | GuardDuty, Macie, Inspector |
| same WAF/security policy **across accounts** | **Firewall Manager** | Security Hub alone as “enforcer” |
| large DDoS on ELB/CloudFront/Route 53 | **Shield Advanced** | WAF alone, SG+NACL alone |
| discover PII in S3; privacy findings | **Macie** | Kendra, Fraud Detector, Polly |
| compliance reports / SOC/PCI docs for auditors | **Artifact** | Security Hub, IAM |
| encrypt data before upload; master key never to AWS | **client-side encryption + client master key** | SSE-KMS |
| full key control; remove material from KMS; audit ≠ CloudTrail | **KMS custom key store → CloudHSM** | AWS owned/managed keys; material in S3 |
| K8s secrets encrypted in **etcd** | **EKS secrets encryption (CMK)** | Secrets Manager; EBS default encrypt |
| outbound IPv6 only; no inbound IPv6; inspect/filter | **Egress-only IGW + Network Firewall** | NAT for IPv6 egress-only; GuardDuty as filter |
| SSH only from one IP | SG **inbound TCP 22 /32** | UDP 22; outbound-only rules |
| Redis AUTH long-lived password + transit encrypt | **auth-token + transit encryption** | IAM token (short-lived; not for MULTI/EXEC need) |
| federation from corporate AD to console | **AD Connector or SAML/AD FS + IAM roles** | invent IAM users for everyone |

### Soft rules

- **Detection ≠ prevention.** GuardDuty finds; WAF/Shield/NFW enforce.
- **Macie** = sensitive data in S3; not SQLi firewall.
- **Network Firewall** protects VPC traffic flows — not “associate to ALB like WAF.”
- Encryption **never** creates private routing (that’s VPC endpoints).

---

## Block 2 (~60 min) — Stem drills

1. SQLi surge on ALBs in multiple accounts; need managed SQLi rules reused.
2. DDoS against ELB-fronted apps; need advanced mitigation + DRT.
3. Census PII in S3; alert on privacy/policy issues beyond inventory.
4. Keys customer-controlled; can purge material from KMS; independent audit.
5. EKS; passwords/API keys must be encrypted inside etcd.
6. IPv6 VPC; outbound Internet only; inspect/filter traffic.
7. EC2 SSH only from 110.238.98.71.
8. Auditors need AWS compliance reports for the account.
9. Unencrypted data and master keys must never be sent to AWS (S3).
10. Private subnet must reach S3/DynamoDB with no NAT / no public Internet.

<details>
<summary>Key</summary>

1. WAF + Firewall Manager  
2. Shield Advanced  
3. Macie  
4. KMS custom key store + CloudHSM  
5. EKS secrets encryption with CMK  
6. Egress-only IGW + Network Firewall  
7. SG inbound TCP 22 /32  
8. Artifact  
9. Client-side encryption with client master key  
10. VPC endpoints (security *and* network force words)  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-38-quiz.json`** (20 Q).

---

## Tomorrow

Compute scale timing, VPC endpoints vs DX, ASG policy math, streams vs Kinesis paths, Lambda@Edge vs multi-Region.
