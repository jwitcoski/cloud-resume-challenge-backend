# Night 13 — SQS decoupling (completion queue + DLQ)

~2 hr. **Very low AWS spend** — SQS is cheap; first 1M requests/month free. Night 12 EventBridge schedule should still be up (or re-run Night 12 first).

## Block 1 (~25 min) — Why SQS after EventBridge?

### The problem Night 12 leaves open

Night 12 fires Iceland `RunTask` on a schedule. The batch job writes OSM output to S3 and exits. A **downstream stats uploader** (aggregate metadata, update DynamoDB, trigger a report) should not:

- Poll ECS until the task stops (tight coupling, wasted API calls)
- Run synchronously inside the Iceland container (one failure kills the whole pipeline)
- Block the next monthly run if the uploader is slow

**SQS buffers completion events** so producers and consumers run at different speeds.

### Extended architecture

```
Night 12 schedule rule
        │
        ▼
   ecs:RunTask (Iceland Fargate)
        │
        │  S3 PutObject (task role)
        ▼
   Container exits 0
        │
        │  ECS Task State Change event (default bus)
        ▼
Night 13 rule ──► SQS standard queue  ──► consumer polls (script / Lambda)
        │              │
        │              └── redrive (3×) ──► DLQ
        │
   (alternative: task calls sqs:SendMessage directly — see below)
```

**Two producer patterns (both on the exam):**

| Pattern | Who sends to SQS | When to use |
|---------|------------------|-------------|
| **App publishes** | Iceland container via `sqs:SendMessage` on task role | You control the message body; works without EventBridge |
| **Event-driven** | EventBridge rule on `ECS Task State Change` → SQS target | No container code change; message is the ECS event JSON |

This lab uses **EventBridge → SQS** so you do not modify the Iceland image. Optional: attach `sqs-iceland-send-policy.json` to `globalskiatlas-backend-k8s-ecs-task` if you want app-side publish practice.

### Core vocabulary (exam)

| Term | Meaning |
|------|---------|
| **Standard queue** | At-least-once delivery; best-effort ordering; nearly unlimited throughput |
| **FIFO queue** | Exactly-once (with dedup); strict order; suffix `.fifo`; lower throughput |
| **Visibility timeout** | After a consumer receives a message, it is hidden for N seconds — must delete or it reappears |
| **DLQ** | Dead-letter queue — poison messages after `maxReceiveCount` failed processing attempts |
| **Long polling** | `WaitTimeSeconds` up to 20 — fewer empty `ReceiveMessage` calls, lower cost |
| **Message retention** | 1 min – 14 days (default 4 days) |

### Decision tree (memorize)

```
Need to decouple components?
│
├─ One consumer, buffer spikes, order does not matter?
│     → SQS standard queue
│
├─ Strict ordering + no duplicates (order IDs, ledger)?
│     → SQS FIFO + content-based deduplication
│
├─ Fan-out to many subscribers (email, Lambda, multiple queues)?
│     → SNS (Night 14) — often SNS → multiple SQS queues
│
├─ Schedule or route AWS service events?
│     → EventBridge (Night 12) — can target SQS directly
│
└─ Orchestrate multi-step workflow with branches?
      → Step Functions
```

### SQS vs SNS vs EventBridge (one-liners)

| Service | Model | Exam cue |
|---------|-------|----------|
| **SQS** | Pull — consumer polls | Buffer, back-pressure, worker pools |
| **SNS** | Push — fan-out | Notify many subscribers at once |
| **EventBridge** | Event router | Schedule + match event patterns across AWS |

**Classic combo:** EventBridge rule → SQS → Lambda/ECS worker (what this lab builds).

### Exam traps

- **Visibility timeout < processing time** → duplicate processing (message becomes visible again while worker still runs). Set timeout ≥ max handler duration, or use heartbeat (ChangeMessageVisibility).
- **DLQ without redrive policy** → useless; must set `maxReceiveCount` on source queue.
- **FIFO throughput** — 300 msg/s without batching; standard is virtually unlimited.
- **SQS is not a database** — no query by attribute; only poll by queue URL.
- **Cross-account SQS** — queue policy + IAM on sender; EventBridge needs `aws:SourceArn` on queue policy.

---

## Block 2 (~65 min) — Lab 2C

### What the lab creates

| Resource | Name |
|----------|------|
| DLQ | `saa-study-gsa-iceland-completion-dlq` |
| Main queue | `saa-study-gsa-iceland-completion` (redrive → DLQ after 3 receives) |
| EventBridge rule | `saa-study-gsa-iceland-success-to-sqs` |
| Event pattern | `ECS Task State Change` — STOPPED, exit 0, Iceland task family, study cluster |

Queue policy allows `events.amazonaws.com` to `sqs:SendMessage` only from that rule ARN.

### Run the lab

```bash
# Git Bash / WSL (from repo root)
bash HTML/study-lab/night-13-lab-sqs-setup.sh
bash HTML/study-lab/night-13-lab-sqs-setup.sh --test-message
bash HTML/study-lab/night-13-lab-sqs-consumer.sh
```

```powershell
# PowerShell (Windows)
.\HTML\study-lab\night-13-lab-sqs-setup.ps1
.\HTML\study-lab\night-13-lab-sqs-setup.ps1 -TestMessage
.\HTML\study-lab\night-13-lab-sqs-consumer.ps1
```

| Flag | Use |
|------|-----|
| `--test-message` / `-TestMessage` | Send a synthetic completion JSON (verify queue without waiting for Iceland) |
| Consumer script | Long-poll one message, print body, delete (simulates downstream stats worker) |

### End-to-end validation (with Night 12)

1. Ensure Night 12 rule exists: `aws events describe-rule --name saa-study-gsa-iceland-monthly --region us-east-1`
2. Fire Iceland once: `.\HTML\study-lab\night-12-lab-eventbridge-schedule.ps1 -TestFire` (or manual `night-10-lab-fargate-run.sh`)
3. After task **exit 0**: `aws sqs get-queue-attributes --queue-url <url> --attribute-names ApproximateNumberOfMessages --region us-east-1`
4. Run consumer script — should print ECS event JSON with `taskArn`, `containers`, etc.
5. Re-run consumer — queue should be empty (`ApproximateNumberOfMessages` = 0)

**Troubleshoot order (no message after successful task):**

1. EventBridge rule enabled? `aws events describe-rule --name saa-study-gsa-iceland-success-to-sqs`
2. Event pattern matches cluster + task family + exit 0?
3. Queue policy `aws:SourceArn` matches rule ARN?
4. Task actually exited 0? (`aws ecs describe-tasks` — exit code 1 does not match pattern)
5. CloudWatch → **AWS/Events** → `FailedInvocations` on the SQS rule

### IAM files (reference)

- `sqs-completion-queue-policy.json` — template; lab script fills queue + rule ARNs
- `sqs-iceland-send-policy.json` — optional `sqs:SendMessage` for task role (app-side producer)

### Teardown

```bash
bash HTML/study-lab/night-13-lab-sqs-teardown.sh
```

```powershell
.\HTML\study-lab\night-13-lab-sqs-teardown.ps1
```

Purges and deletes queues, removes EventBridge rule. **Does not** touch Night 12 schedule or Night 9 VPC.

---

## Block 3 (~30 min) — Quiz

**File:** `night-13-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Answer without `night-13-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=13`.

---

## Application Integration domain map (updated)

| Topic | One-liner |
|-------|-----------|
| EventBridge | Schedule + event routing — Night 12 trigger, Night 13 completion route |
| **SQS** | Buffer work; consumers poll — **tonight** |
| SNS | Fan-out push — Night 14 |
| Step Functions | Orchestrate multi-step with retries |
| API Gateway | HTTP front door |

---

## 5 flashcards (write tonight)

1. **Standard vs FIFO** — when is order/exactly-once worth the throughput trade-off?
2. **Visibility timeout** — what happens if the consumer crashes mid-process?
3. **DLQ + maxReceiveCount** — what problem does redrive solve?
4. **EventBridge → SQS vs app SendMessage** — pros/cons of each producer?
5. **Long polling** — why `WaitTimeSeconds=20` beats tight short polls?

---

## Night 14 preview

SNS topic + email/Lambda subscriptions — fan out Iceland failure alerts and completion notifications. Wire CloudWatch alarm from Night 12 to SNS; optional second subscriber on the SQS completion path via SNS → SQS fan-out pattern.
