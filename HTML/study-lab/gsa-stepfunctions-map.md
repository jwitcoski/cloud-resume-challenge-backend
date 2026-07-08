# GSA Step Functions map — Night 32 capstone

Quick reference for **Global Ski Atlas** pipeline orchestration. Read before deploying `sam-pipeline-orchestrator` and before `night-32-quiz.json`.

---

## Before (Nights 12–14 + 17) — event-driven chain

```
EventBridge cron (Night 12)
  saa-study-gsa-iceland-monthly
        │
        ▼
   ecs:RunTask (Fargate)
        │
        ├── STOPPED exit 0 ──► EventBridge (Night 13) ──► SQS completion
        │                                              └──► Lambda (Night 17 SQS mapping)
        │
        └── exit ≠ 0 ──► EventBridge (Night 14) ──► SNS alerts
```

**Gap:** Retry/Catch policies differ per step; workflow state is scattered across EventBridge rules and queue depth.

---

## After (Night 32) — Step Functions Standard

```
EventBridge cron (new rule)
  saa-study-gsa-iceland-monthly-sfn
        │
        ▼
Step Functions Standard
  saa-study-gsa-iceland-pipeline
        │
        ├─ RunTask.sync (Iceland ECS)     ← visible state + per-step Retry/Catch
        │     ├─ Catch ──► SNS alerts (Night 14 topic)
        │     └─ success
        ├─ SendMessage → completion SQS   ← Night 13 queue (direct, not EB rule)
        ├─ Invoke stats Lambda            ← Night 17 function (sync invoke)
        │     ├─ Retry + Catch ──► SNS
        │     └─ success
        └─ SNS success publish (optional) → End
```

**Exam framing:** Step Functions when you need **auditable workflow state**, **branching**, **different retry policies per step**, and **operator visibility** — not for a lone cron or a single queue buffer.

---

## Resource names (study stack)

| Piece | Name / pattern |
|-------|----------------|
| SAM stack | `sam-pipeline-orchestrator` |
| State machine | `saa-study-gsa-iceland-pipeline` |
| Schedule rule | `saa-study-gsa-iceland-monthly-sfn` |
| ECS cluster | `globalskiatlas-backend-k8s` |
| Task family | `globalskiatlas-backend-k8s-iceland` |
| Completion queue | `saa-study-gsa-iceland-completion` |
| Alerts topic | `saa-study-gsa-iceland-alerts` |
| Stats Lambda | `saa-study-gsa-stats-uploader` |
| VPC subnets | `night-9-vpc-ids.json` private A/B |
| Fargate SG | `night-9-vpc-ids.json` → `securityGroups.fargate` |

---

## Standard vs Express (exam)

| | **Standard** | **Express** |
|--|--------------|-------------|
| Duration | Up to 1 year | Up to 5 minutes |
| History | Full, auditable | Can be discarded |
| Billing | Per state transition | Per execution + duration |
| GSA fit | **Tonight** — monthly batch + ECS wait | High-volume short fan-out only |

---

## Integration ARN patterns (Step Functions optimized)

| Step | Service integration | Why |
|------|---------------------|-----|
| Run Fargate + wait | `arn:aws:states:::ecs:runTask.sync` | Blocks until STOPPED — replaces manual Wait + DescribeTasks loop |
| Buffer work | `arn:aws:states:::sqs:sendMessage` | Durable handoff; Night 17 mapping still works if you skip sync invoke |
| Side-effect worker | `arn:aws:states:::lambda:invoke` | Synchronous UPSERT in capstone; exam also shows `.waitForTaskToken` for human approval |
| Operator alert | `arn:aws:states:::sns:publish` | Reuse Night 14 topic — fan-out to inbox + email |

---

## Migration checklist (lab script)

1. Deploy `sam-pipeline-orchestrator` (creates state machine + new schedule rule).
2. **Disable** legacy `saa-study-gsa-iceland-monthly` EventBridge → ECS target (avoid double RunTask).
3. **Optional:** Disable `saa-study-gsa-iceland-success-to-sqs` — Step Functions sends to SQS directly.
4. **Keep** Night 14 failure rule + CloudWatch alarm as backup paths until you trust SFN Catch.
5. Teardown: `sam delete` + re-enable legacy schedule if needed.

---

## Decision one-liner (flashcard)

**“Monthly ECS → queue → Lambda with different retries per step?”** → Step Functions Standard + `runTask.sync` + SQS `sendMessage` + `lambda:invoke` + SNS `Catch` — not another EventBridge rule.
