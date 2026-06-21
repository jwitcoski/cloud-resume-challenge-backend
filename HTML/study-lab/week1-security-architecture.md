# Week 1 — Security architecture (draw on paper)

Night 7 block 1 (~30 min). Draw two diagrams side by side. Label encryption, IAM roles, and trust boundaries.

## Site A — witcoskitech.com (Cloud Resume Challenge)

```
Internet
   │
   ▼
Route 53 (witcoskitech.com)
   │
   ▼
CloudFront ── ACM cert (us-east-1) ── Shield Standard (L3/L4)
   │  redirect-to-https, GET/HEAD only
   ▼
S3 bucket witcoskitech.com
   • Default encryption: SSE-S3 (AES256)
   • study-lab/kms-test/ prefix: SSE-KMS (CMK alias/saa-study-witcoskitech)
   • Public read via bucket policy (legacy pattern — Config NON_COMPLIANT)
   • Modern fix: private bucket + OAC

CI/CD (trust boundary):
GitHub Actions ──IAM user/policy──► s3:PutObject (sync HTML/out)
                                  └──► cloudfront:CreateInvalidation
```

**Annotate on your drawing:**
- Where TLS terminates (CloudFront viewer cert)
- Where data is encrypted at rest (S3 default + KMS test prefix)
- Deploy principal vs end-user access (IAM user vs anonymous GET)
- What you tore down Week 1 (Config, CloudTrail trail, Access Analyzer — or note what remains)

Reference: `study-lab/witco-cf.json`

---

## Site B — globalskiatlas.com (Global Ski Atlas frontend)

```
Internet
   │
   ▼
Route 53 (globalskiatlas.com)
   │
   ▼
CloudFront ── ACM (us-east-1) ── [WAF CLOUDFRONT scope — Night 4 lab, torn down]
   │
   ├── Default: S3 globalskiatlas.com (static Next.js export)
   │              CloudFront Function: redirect-to-canonical
   │
   ├── /api/wiki*     ──► API Gateway (WikiApi) ──► Lambda (wiki-api)
   │                                              ├──► DynamoDB (WikiPages, Revisions, Comments)
   │                                              ├──► Cognito (JWT validate)
   │                                              └──► Secrets Manager (saa-study/gsa-wiki-cognito)
   │                                                   + kms:Decrypt on Night 2 CMK
   │
   └── /api/iceberg-stats ──► API Gateway ──► Lambda ──► S3 Iceberg / stats

Auth boundary:
  Anonymous GET wiki pages │ POST/PUT/PATCH/DELETE require Cognito JWT

Backend (separate trust zone — label but don't detail yet):
  GitHub Actions ──► ECR ──► ECS Fargate (Iceland pipeline) ──► S3 GeoParquet output
  IAM: github-actions-globalskiatlas v4 — scoped ecs:RunTask ARN
```

**Annotate on your drawing:**
- Three CloudFront origins (S3 + 2 API Gateway)
- Execution role vs task role (ECS backend — Week 2 VPC)
- Secrets flow: Secrets Manager → Lambda env COGNITO_SECRET_ARN
- WAF placement: CLOUDFRONT scope, us-east-1 (not on distribution now — cost)

Reference: `study-lab/cf-dist-config.json`, Night 3–4 labs

---

## Account-level controls (Week 1 labs — now torn down)

Draw a small box below both sites:

| Service | Purpose | Week 1 status |
|---------|---------|---------------|
| CloudTrail | API audit (who/when/what) | Torn down Night 6 — re-enable before exam if needed |
| Config | Continuous compliance rules | Torn down — charges ~$2–5/mo |
| Access Analyzer | External access on resource policies | Torn down |
| KMS CMK | saa-study-* keys | **Kept** — wiki secret + kms-test |

---

## Self-check (before moving to quiz)

1. Can you explain why public S3 + CloudFront works but Config flags NON_COMPLIANT?
2. Where would you attach WAF for the wiki POST path?
3. Which role pulls ECR images for Fargate — execution or task?
4. What's still running that costs money after Week 1 teardown?
