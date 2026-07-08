# GSA integration map — Nights 12–14 (+ Night 32 preview)

Quick reference for **Global Ski Atlas** study-lab decoupling. Read before Night 28 quiz and before Night 32 Step Functions capstone.

---

## Production Iceland pipeline (study stack)

```
EventBridge schedule (Night 12)
  saa-study-gsa-iceland-monthly
  cron(0 6 1 * ? *)  →  ecs:RunTask (Fargate, private subnets)
        │
        ▼
   Iceland container
        │
        ├── exit 0 + STOPPED ──► EventBridge (Night 13)
        │                         saa-study-gsa-iceland-success-to-sqs
        │                              │
        │                              ▼
        │                         SQS saa-study-gsa-iceland-completion
        │                              │ redrive ×3
        │                              ▼
        │                         DLQ saa-study-gsa-iceland-completion-dlq
        │                              │
        │                              └──► consumer (Night 13 script / Night 17 Lambda path)
        │
        └── exit ≠ 0 ──► EventBridge (Night 14)
                              saa-study-gsa-iceland-failure-to-sns
                                   │
                                   ▼
                              SNS saa-study-gsa-iceland-alerts
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              email (opt)   SQS inbox      (future Lambda)
              PendingConf   saa-study-gsa-iceland-alerts-inbox

CloudWatch alarm (Night 12/14)
  saa-study-gsa-iceland-task-failed  (FailedInvocations on schedule rule)
        └── alarm action ──► same SNS topic
```

---

## Service role cheat sheet

| Step | Service | Pattern | Why not the others? |
|------|---------|---------|---------------------|
| Monthly trigger | **EventBridge schedule** | Cron → ECS target | SQS cannot schedule; Step Functions overkill for one API call |
| Success handoff | **EventBridge → SQS** | ECS Task State Change pattern | SNS would push to all subs immediately — want pull buffer for uploader |
| Failure notify | **EventBridge → SNS** | Fan-out email + inbox queue | SQS alone cannot email; one queue cannot fan-out without SNS |
| Stats uploader | **SQS → worker** | Poll at own pace | EventBridge is push/router — not a durable work queue |
| Infra failure | **CloudWatch → SNS** | FailedInvocations alarm | Container exit 1 never ran — different signal than exit code |

---

## Night 32 capstone target (Step Functions)

**Night 32 deploys** `sam-pipeline-orchestrator` in `study-lab/sam-pipeline-orchestrator/` — see `gsa-stepfunctions-map.md` and `night-32-stepfunctions-capstone.md`.

Tonight you **design** this; Night 32 **deploys** `sam-pipeline-orchestrator`:

```
Start
  │
  ▼
RunTask (Iceland ECS)     ← replaces bare EventBridge-only trigger in capstone
  │
  ├─ Catch / timeout ──► SNS alert (reuse Night 14 topic)
  │
  ▼
Wait for task STOPPED (or Choice on sync path)
  │
  ▼
SendMessage → completion SQS   ← Night 13 queue
  │
  ▼
Lambda stats uploader          ← Night 17 pattern
  │
  ├─ Retry + Catch ──► DLQ / SNS
  │
  ▼
SNS success publish (optional)
  │
  ▼
End
```

**Exam framing:** Step Functions when you need **visible workflow state**, **branching**, **retries per step**, and **human approval** — not when you only need a cron or a single queue buffer.

---

## Kinesis vs GSA (exam only — not in study deploy)

| Use case | Pick | GSA analogue |
|----------|------|--------------|
| High-volume clickstream, custom consumers, replay | **Kinesis Data Streams** | Would ingest live wiki edit events — not built |
| Near-real-time delivery to S3/OpenSearch without code | **Kinesis Data Firehose** | Would land access logs to S3 for Athena (Night 24) |
| Managed Kafka API | **MSK** | Vendor Kafka migration scenarios |
| IoT video ingest | **Kinesis Video Streams** | Awareness only |

GSA today uses **batch monthly ECS + SQS**, not streaming — know the decision tree anyway.

---

## AppSync vs wiki API (awareness)

| | **API Gateway + Lambda REST** (GSA wiki) | **AppSync GraphQL** |
|--|------------------------------------------|---------------------|
| Protocol | REST/HTTP | GraphQL |
| Real-time | Polling or WebSocket elsewhere | **Subscriptions** built-in |
| Data sources | Lambda, HTTP, DynamoDB | DynamoDB, Lambda, OpenSearch, HTTP |
| Exam cue | CRUD HTTP APIs | Mobile apps needing **live** updates |

AppSync is **not** deployed in GSA study labs — recognize the exam pattern.
