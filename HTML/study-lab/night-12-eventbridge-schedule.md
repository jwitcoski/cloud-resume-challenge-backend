# Night 12 — EventBridge schedule → ECS RunTask

~2 hr. **Low AWS spend** — EventBridge rules are free; each scheduled Iceland run uses Fargate like Night 10. Study VPC from Nights 9–10 must still be up.

## Block 1 (~20 min) — EventBridge vs “just cron on a box”

### Why EventBridge for the Iceland pipeline?

| Approach | Problem |
|----------|---------|
| Cron on a laptop | Not reliable; no IAM audit trail |
| EC2 cron | You manage the instance; pays 24/7 for monthly job |
| **EventBridge schedule rule** | Serverless trigger; IAM role; same `RunTask` as GitHub Actions |

Night 10 proved the task runs in **private subnets** with `assignPublicIp: DISABLED`. Night 12 wires **when** it runs — not **how** networking works (that stays identical).

### Core vocabulary (exam)

| Term | Meaning |
|------|---------|
| **Event bus** | Router for events. Default bus receives AWS service events + your custom events |
| **Rule** | Matches schedule **or** event pattern → routes to targets |
| **Schedule expression** | `cron(0 6 1 * ? *)` or `rate(30 minutes)` |
| **Target** | ECS cluster, Lambda, SQS, SNS, Step Functions, API dest, etc. |
| **Input transformer** | Shape event JSON before it hits the target |

**EventBridge Scheduler** (newer) — one-off and recurring schedules with flexible time windows and retry policies. Exam may show either Scheduler or classic rules; both can call ECS.

### Decision tree (memorize)

```
Need to run something on a schedule?
│
├─ Single AWS API call (RunTask, StartExecution, invoke Lambda)?
│     → EventBridge rule (schedule) + IAM role on target
│
├─ Complex workflow with branches / human approval?
│     → Step Functions (often started by EventBridge)
│
├─ Decouple producers and consumers (buffer spikes)?
│     → SQS target — Night 13
│
└─ Fan-out notifications to many subscribers?
      → SNS target — Night 14
```

### EventBridge vs CloudWatch Events

Same API (`aws events`). Console says **Amazon EventBridge**. Legacy name “CloudWatch Events” still appears in old docs and exams.

---

## Block 2 (~70 min) — Lab 2B

### Architecture (extend your Week 2 diagram)

```
EventBridge rule (cron monthly)
        │
        │  assumes IAM role
        ▼
   ecs:RunTask ──► Fargate (private subnets) ──► S3 output
        ▲
        │
   Same network as Night 10:
   night-9-vpc-ids.json → privateA, privateB, fargate SG
```

**No ALB** — batch `RunTask` is fire-and-forget. ALB matters when you expose a long-running HTTP service (Night 11).

### IAM — who calls `RunTask`?

| Caller | Trust principal | Needs |
|--------|-----------------|-------|
| GitHub Actions user | (human/CI credentials) | `ecs:RunTask` + `iam:PassRole` on execution + task roles |
| **EventBridge rule** | `events.amazonaws.com` | **Dedicated role** with `ecs:RunTask` + `iam:PassRole` |

Files in `study-lab/`:
- `eventbridge-ecs-trust-policy.json` — trust `events.amazonaws.com`
- `eventbridge-ecs-run-policy.json` — scoped `RunTask` on Iceland task def + cluster + PassRole

**Exam trap:** EventBridge cannot use your GitHub Actions policy. The rule’s **target role** must exist separately.

### Run the lab

```bash
# Git Bash / WSL (from repo root)
bash HTML/study-lab/night-12-lab-eventbridge-schedule.sh
```

```powershell
# PowerShell (Windows — no bash required)
.\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1
.\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1 -Schedule test
.\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1 -TestFire
```

| Flag | Use |
|------|-----|
| `--schedule test` | `rate(30 minutes)` — see a fire without waiting for the 1st |
| `--test-fire` | Temporarily `rate(1 minute)`, wait, restore monthly cron |
| `--skip-alarm` | Skip CloudWatch `FailedInvocations` alarm |

**Verify checklist:**
1. `aws events describe-rule --name saa-study-gsa-iceland-monthly --region us-east-1`
2. `aws events list-targets-by-rule --rule saa-study-gsa-iceland-monthly --region us-east-1` — shows ECS cluster ARN + `RoleArn`
3. CloudWatch → **AWS/Events** → `Invocations` and `FailedInvocations` for the rule
4. After a scheduled fire: new task in ECS + logs in `/ecs/globalskiatlas-backend-k8s-iceland` + S3 prefix

**Troubleshoot order (if FailedInvocations > 0):**
1. Target role trust — `events.amazonaws.com`?
2. Target role policy — `ecs:RunTask` on task definition ARN + `iam:PassRole` with `ecs-tasks.amazonaws.com` condition?
3. Network config on target — same subnets/SG as Night 10?
4. Cluster name / task family typo?

### Schedule expressions (write on a flashcard)

| Expression | Meaning |
|------------|---------|
| `cron(0 6 1 * ? *)` | 06:00 UTC on the 1st of every month |
| `rate(30 minutes)` | Every 30 minutes |
| `cron(0 12 ? * MON-FRI *)` | Noon UTC weekdays |

**Cron fields (EventBridge):** `minutes hours day-of-month month day-of-week year` — use `?` when one of day-of-month / day-of-week is unused.

### CloudWatch alarm (lab default)

Alarm `saa-study-gsa-iceland-task-failed` watches **FailedInvocations** on the rule (EventBridge could not invoke ECS). For app-level failures (container exit 1), add an **event pattern rule** on `ECS Task State Change` → SNS — Night 14 ties SNS in.

### Teardown

```bash
bash HTML/study-lab/night-12-lab-eventbridge-teardown.sh
```

```powershell
.\HTML\study-lab\night-12-lab-eventbridge-teardown.ps1
```

Removes rule, IAM role/policy, alarm. **Does not** delete the Night 9 VPC.

---

## Block 3 (~30 min) — Quiz

**File:** `night-12-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-12-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=12`.

---

## Application Integration domain map

| Topic | One-liner |
|-------|-----------|
| **EventBridge** | Schedule + event routing; decouple microservices |
| **SQS** | Buffer work; consumers poll — Night 13 |
| **SNS** | Fan-out push; email/SMS/Lambda — Night 14 |
| **Step Functions** | Orchestrate multi-step with retries |
| **API Gateway** | HTTP front door (not needed for batch ECS) |

---

## 5 flashcards (write tonight)

1. **EventBridge ECS target** — which service assumes the IAM role?
2. **PassRole** — why does EventBridge need it for Fargate?
3. **Schedule vs event pattern** — cron rule vs `ECS Task State Change` rule?
4. **FailedInvocations** — what does it mean vs container exit code 1?
5. **RunTask vs ECS Service** — when is EventBridge + RunTask enough?

---

## Night 13 preview

SQS standard queue + DLQ — decouple pipeline completion from downstream stats upload. Iceland task publishes a message on success instead of synchronous chaining.
