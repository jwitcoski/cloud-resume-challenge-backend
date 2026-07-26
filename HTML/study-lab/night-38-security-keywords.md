# Night 38 — Keywords: security service selection

~2 hr. **$0 AWS spend.** Most security misses are **right intent, wrong product**. Force words tell you prevention vs detection vs data classification vs DDoS vs edge auth.

---

## Plain language first

Ask in order:

```
1. Are we BLOCKING requests or DETECTING threats?
2. Is the attack application-layer (HTTP / SQL injection) or volumetric DDoS?
3. Data classification / personal data discovery?
4. Key control / write-once lock / identity federation?
5. Multi-account reuse of rules?
```

---

## Block 1 (~30 min) — Map

| Force words | Pick | Kill |
|-------------|------|------|
| SQL injection / cross-site scripting on Application Load Balancer or CloudFront; block patterns | **AWS WAF** (+ managed rule groups) | GuardDuty, Macie, Inspector |
| same WAF/security policy **across accounts** | **Firewall Manager** | Security Hub alone as “enforcer” |
| large DDoS on load balancer / CloudFront / Route 53 | **Shield Advanced** | WAF alone, security groups + network ACLs alone |
| discover personal data in S3; privacy findings | **Macie** | Kendra, Fraud Detector, Polly |
| compliance reports / SOC/PCI docs for auditors | **Artifact** | Security Hub, IAM |
| encrypt data before upload; master key never to AWS | **client-side encryption + client master key** | server-side encryption with KMS |
| full key control; remove material from KMS; audit ≠ CloudTrail | **KMS custom key store → CloudHSM** | AWS owned/managed keys; material in S3 |
| Kubernetes secrets encrypted in **etcd** | **EKS secrets encryption (customer managed key)** | Secrets Manager; EBS default encrypt |
| outbound IPv6 only; no inbound IPv6; inspect/filter | **Egress-only internet gateway + Network Firewall** | NAT for IPv6 egress-only; GuardDuty as filter |
| SSH only from one IP | security group **inbound TCP 22 /32** | UDP 22; outbound-only rules |
| Redis AUTH long-lived password + encrypt in transit | **auth-token + transit encryption** | IAM token (short-lived; not for MULTI/EXEC need) |
| federation from corporate Active Directory to console | **AD Connector or SAML/AD FS + IAM roles** | invent IAM users for everyone |

### Soft rules

- **Detection ≠ prevention.** GuardDuty finds; WAF / Shield / Network Firewall enforce.
- **Macie** = sensitive data in S3; not a SQL-injection firewall.
- **Network Firewall** protects VPC traffic flows — not “associate to Application Load Balancer like WAF.”
- Encryption **never** creates private routing (that’s VPC endpoints).

---

## Block 2 (~60 min) — Stem drills

1. SQL injection surge on Application Load Balancers in multiple accounts; need managed SQL-injection rules reused.
2. DDoS against load-balancer-fronted apps; need advanced mitigation + AWS DDoS Response Team.
3. Census personal data in S3; alert on privacy/policy issues beyond inventory.
4. Keys customer-controlled; can purge material from KMS; independent audit.
5. EKS; passwords/API keys must be encrypted inside etcd.
6. IPv6 VPC; outbound Internet only; inspect/filter traffic.
7. EC2 SSH only from 110.238.98.71.
8. Auditors need AWS compliance reports for the account.
9. Unencrypted data and master keys must never be sent to AWS (S3).
10. Private subnet must reach S3/DynamoDB with no NAT gateway / no public Internet.

<details>
<summary>Key</summary>

1. WAF + Firewall Manager  
2. Shield Advanced  
3. Macie  
4. KMS custom key store + CloudHSM  
5. EKS secrets encryption with customer managed key  
6. Egress-only internet gateway + Network Firewall  
7. Security group inbound TCP 22 /32  
8. Artifact  
9. Client-side encryption with client master key  
10. VPC endpoints (security *and* network force words)  

</details>

---

## Block 3 (~30 min) — Quiz

**`night-38-quiz.json`** (20 questions).

---

## Tomorrow

Compute scale timing, VPC endpoints vs Direct Connect, Auto Scaling policy math, streams vs Kinesis paths, Lambda@Edge vs multi-Region.
