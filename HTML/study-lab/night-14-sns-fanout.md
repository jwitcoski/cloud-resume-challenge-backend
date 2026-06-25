# Night 14 — SNS fan-out (failure alerts + subscriptions)

~2 hr. **Very low AWS spend** — SNS is cheap; first 1M publishes/month free. Night 12 schedule and Night 13 SQS completion path should still be up (or re-run those labs first).

## Block 1 (~20 min) — Why SNS after SQS?

### The problem Night 13 leaves open

Night 13 routes **successful** Iceland runs to an SQS completion queue for async downstream work. Two gaps remain:

| Gap | Symptom | SNS fix |
|-----|---------|---------|
| **Container exit 1** | No message on completion queue — pattern filters `exitCode: 0` only | EventBridge failure rule → SNS |
| **Ops needs multiple channels** | Email + ticketing queue + Lambda hook from one alert | SNS fan-out to many subscribers |
| **Night 12 infra alarm** | `FailedInvocations` on schedule rule — EventBridge could not call ECS | CloudWatch alarm → SNS action |

**SQS = pull buffer for workers. SNS = push fan-out for notifications.**

### Extended architecture

```
Night 12 schedule ──► RunTask (Iceland)
        │
        ├── exit 0 ──► Night 13 rule ──► SQS completion queue ──► consumer polls
        │
        └── exit ≠ 0 ──► Night 14 failure rule ──► SNS topic
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              email (opt)    SQS inbox      Lambda (later)
              subscriber     (fan-out demo)

Night 12 CloudWatch alarm (FailedInvocations) ──► same SNS topic
```

**Classic exam combo:** SNS → multiple SQS queues (each subscriber gets a copy) — different from one shared SQS queue where workers compete for messages.

### Core vocabulary (exam)

| Term | Meaning |
|------|---------|
| **Topic** | Named channel; publishers send one message, SNS delivers to all confirmed subscribers |
| **Subscription** | Protocol + endpoint — `email`, `sms`, `sqs`, `lambda`, `https`, `firehose` |
| **Fan-out** | One publish → N independent deliveries (not shared polling) |
| **Message filtering** | Subscription filter policy — subset of messages per subscriber |
| **Delivery policy** | Retry / throttle for HTTP/SMS; SQS/Lambda use SNS retry + DLQ on failure |
| **FIFO topic** | `.fifo` suffix; strict ordering + dedup; pairs with FIFO queues |

### Decision tree (memorize)

```
Need to notify or fan out?
│
├─ Many subscribers, push delivery, no polling?
│     → SNS topic (+ subscriptions)
│
├─ Buffer work for one worker tier; order optional?
│     → SQS (Night 13)
│
├─ SNS fan-out + each team wants its own durable queue?
│     → SNS → multiple SQS queues (SNS→SQS pattern)
│
├─ Route AWS service events on schedule or pattern?
│     → EventBridge (Night 12) — can target SNS directly
│
└─ Orchestrate multi-step workflow?
      → Step Functions
```

### SNS vs SQS vs EventBridge (one-liners)

| Service | Model | Exam cue |
|---------|-------|----------|
| **SNS** | Push fan-out | Email + Lambda + SQS from one event |
| **SQS** | Pull buffer | Worker pools, back-pressure, DLQ |
| **EventBridge** | Event router | Schedule + pattern match across AWS |

### Exam traps

- **Email/SMS subscriptions** — `PendingConfirmation` until user clicks link; messages are not delivered until confirmed.
- **SNS → SQS** — queue policy must allow `sns.amazonaws.com` with `aws:SourceArn` = topic ARN (not just IAM on the publisher).
- **EventBridge → SNS** — topic policy must allow `events.amazonaws.com` with `aws:SourceArn` = rule ARN.
- **SNS is not a queue** — no long polling; subscribers must handle duplicates (at-least-once).
- **FIFO SNS** — throughput limits; use when order matters across subscribers.
- **FailedInvocations ≠ exit code 1** — Night 12 alarm is infra; Night 14 failure rule is app-level.

---

## Block 2 (~70 min) — Lab 2C (part 2)

### What the lab creates

| Resource | Name |
|----------|------|
| SNS topic | `saa-study-gsa-iceland-alerts` |
| SQS fan-out inbox | `saa-study-gsa-iceland-alerts-inbox` (SNS subscriber) |
| EventBridge rule | `saa-study-gsa-iceland-failure-to-sns` |
| Event pattern | `ECS Task State Change` — STOPPED, Iceland task family, `exitCode != 0` |
| CloudWatch alarm action | `saa-study-gsa-iceland-task-failed` → SNS (if Night 12 alarm exists) |
| Email subscription | Optional — `-Email you@example.com` (confirm in inbox) |

### Run the lab

```bash
# Git Bash / WSL (from repo root)
bash HTML/study-lab/night-14-lab-sns-setup.sh
bash HTML/study-lab/night-14-lab-sns-setup.sh --email you@example.com
bash HTML/study-lab/night-14-lab-sns-setup.sh --test-publish
bash HTML/study-lab/night-14-lab-sns-inbox.sh
```

```powershell
# PowerShell (Windows)
.\HTML\study-lab\night-14-lab-sns-setup.ps1
.\HTML\study-lab\night-14-lab-sns-setup.ps1 -Email you@example.com
.\HTML\study-lab\night-14-lab-sns-setup.ps1 -TestPublish
.\HTML\study-lab\night-14-lab-sns-inbox.ps1
```

| Flag | Use |
|------|-----|
| `--email` / `-Email` | Subscribe an email endpoint (confirm via AWS email before delivery) |
| `--test-publish` / `-TestPublish` | Publish synthetic failure alert; inbox script should receive a copy |
| Inbox script | Long-poll the SNS→SQS fan-out queue (simulates ticketing integration) |

### End-to-end validation

1. **Synthetic:** `night-14-lab-sns-setup.ps1 -TestPublish` then `night-14-lab-sns-inbox.ps1` — prints SNS-wrapped JSON.
2. **Email (optional):** Confirm subscription, re-run `-TestPublish`, check inbox.
3. **Real failure (advanced):** Force Iceland task exit 1 (bad env var / missing S3 perm), wait for STOPPED event → SNS → inbox.
4. **Night 12 alarm path:** If `FailedInvocations` fires on schedule rule, same topic receives CloudWatch alarm JSON.

**Troubleshoot order (no message in inbox after publish):**

1. SNS subscription `PendingConfirmation`? `aws sns list-subscriptions-by-topic --topic-arn <arn>`
2. SQS queue policy `aws:SourceArn` matches topic ARN? `sns-sqs-subscriber-policy.json`
3. EventBridge failure rule enabled? Pattern matches non-zero exit on Iceland task family?
4. SNS topic policy allows `events.amazonaws.com` with rule ARN? `sns-iceland-alerts-topic-policy.json`
5. CloudWatch → **AWS/Events** → `FailedInvocations` on failure rule (if using EventBridge path)

### IAM / policy files (reference)

- `sns-iceland-alerts-topic-policy.json` — EventBridge + CloudWatch publish to topic
- `sns-sqs-subscriber-policy.json` — SNS → SQS fan-out queue policy

### Teardown

```bash
bash HTML/study-lab/night-14-lab-sns-teardown.sh
```

```powershell
.\HTML\study-lab\night-14-lab-sns-teardown.ps1
```

Removes SNS topic, subscriptions, inbox queue, failure rule. Restores Night 12 alarm without SNS actions. **Does not** touch Night 13 SQS completion queues or Night 9 VPC.

---

## Block 3 (~30 min) — Quiz

**File:** `night-14-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-14-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=14`.

---

## Application Integration domain map (updated)

| Topic | One-liner |
|-------|-----------|
| EventBridge | Schedule + event routing — Night 12 trigger, Night 13 success, Night 14 failure |
| SQS | Buffer work; consumers poll — Night 13 |
| **SNS** | Fan-out push — **tonight** |
| Step Functions | Orchestrate multi-step with retries |
| API Gateway | HTTP front door |

---

## 5 flashcards (write tonight)

1. **SNS vs SQS** — when is push fan-out better than a shared work queue?
2. **SNS → SQS** — what two policies are required (topic side vs queue side)?
3. **Email subscription** — why is status `PendingConfirmation`?
4. **FailedInvocations vs exit code 1** — which Night 12 alarm catches which?
5. **FIFO SNS + FIFO SQS** — when do you need both?

---

## Night 15 preview

RDS + Aurora deep dive — Multi-AZ vs read replicas, Aurora Serverless v2, when relational beats DynamoDB for the Global Ski Atlas stats layer.
