# Night 32 — Lab 4C: Step Functions capstone (ECS → SQS → Lambda → SNS)

~2 hr. **~$0–$3 AWS spend** — Step Functions transitions are pennies per run; **`-TestStartExecution` launches a real Iceland Fargate task** (~2 hr wall clock, same cost as Night 10/12). Default deploy creates the state machine + schedule only.

---

## Plain language first

### What is Step Functions?

**AWS Step Functions** runs a **workflow** as a state machine — each step (run ECS, send SQS, invoke Lambda) has its own **Retry**, **Catch**, and visible status in the console.

**Analogy (GSA Iceland):** Nights 12–14 used separate **timers and message boards** (EventBridge rules + SQS + SNS). Step Functions is the **printed runbook** taped to the lift ops desk: every step numbered, with explicit “if this fails, call patrol on channel 14.”

### When Step Functions beats EventBridge + SQS alone

| Need | Pick |
|------|------|
| Cron only, one API call | EventBridge schedule (Night 12) |
| Buffer slow workers | SQS (Night 13) |
| Fan-out alerts | SNS (Night 14) |
| **Multi-step with different retries, Catch routing, wait for ECS STOPPED** | **Step Functions Standard** |

### Standard vs Express (exam)

| Type | Duration | History | GSA capstone |
|------|----------|---------|--------------|
| **Standard** | Up to 1 year | Full audit trail | **Tonight** |
| **Express** | Up to 5 min | Optional discard | High-volume short flows only |

### Service integrations (memorize)

| Pattern | ARN suffix | GSA step |
|---------|------------|----------|
| Run Fargate and wait | `ecs:runTask.sync` | Iceland container |
| Enqueue completion | `sqs:sendMessage` | Night 13 queue |
| Run worker | `lambda:invoke` | Night 17 stats uploader |
| Alert operators | `sns:publish` | Night 14 topic |

---

## Block 1 (~20 min) — Map + ASL reading

### Read `gsa-stepfunctions-map.md`

Trace the **before** (Nights 12–14) vs **after** (Night 32) diagrams. Label every resource name.

### Open `sam-pipeline-orchestrator/statemachine/pipeline.asl.json`

| State | Type | Exam note |
|-------|------|-----------|
| `RunIcelandTask` | Task + `runTask.sync` | Non-zero container exit fails the state → `Catch` |
| `EnqueueCompletion` | Task + `sqs:sendMessage` | Direct handoff — replaces Night 13 EventBridge rule in capstone |
| `InvokeStatsUploader` | Task + `lambda:invoke` | Sync invoke; Night 17 handler accepts plain dict |
| `PublishSuccess` / `PublishFailureAlert` | Task + `sns:publish` | Reuse Night 14 topic |

### Exam minimums (write in notes)

- **State transition billing** — Standard workflows charge per state transition; one monthly run is cheap.
- **`iam:PassRole`** — Step Functions execution role must pass ECS execution + task roles on `RunTask`.
- **`runTask.sync`** — Optimized integration waits until task STOPPED; failed exit code fails the step.
- **Catch** — Routes to alternate state; does not retry unless you also configure **Retry**.
- **Express** — Wrong for 2-hour Iceland batch; use Standard.

### Decision tree (memorize)

```
Multi-step AWS workflow?
│
├─ Single cron → one target?
│     → EventBridge schedule
│
├─ Decouple producer/consumer speed?
│     → SQS (+ optional EventBridge router)
│
├─ Ordered steps + per-step Retry/Catch + operator visibility?
│     → Step Functions Standard
│
└─ Sub-5-min high volume, history optional?
      → Step Functions Express
```

---

## Block 2 (~80 min) — Lab: deploy `sam-pipeline-orchestrator`

### Prerequisites

| Requirement | How to check |
|-------------|--------------|
| AWS CLI | `aws sts get-caller-identity` |
| SAM CLI | `sam --version` |
| Night 9 VPC | `night-9-vpc-ids.json` |
| Night 13 SQS | `night-13-sqs-result.json` or queue exists |
| Night 14 SNS | `night-14-sns-result.json` or topic exists |
| Night 17 Lambda (optional for invoke step) | `saa-study-gsa-stats-uploader` — script warns if missing |
| ECS task def | `globalskiatlas-backend-k8s-iceland` |

**Spend note:** `sam deploy` alone ≈ $0. **Do not** pass `-TestStartExecution` unless you intend to run Iceland Fargate (~$0.15–$0.40 for a 2 hr task at 1 vCPU / 2 GiB).

### What the lab creates

| Resource | Name | Purpose |
|----------|------|---------|
| CloudFormation stack | `sam-pipeline-orchestrator` | SAM wrapper |
| State machine | `saa-study-gsa-iceland-pipeline` | Orchestrator |
| Schedule rule | `saa-study-gsa-iceland-monthly-sfn` | Monthly trigger |
| Result file | `night-32-stepfunctions-result.json` | ARNs + migration flags |

**Side effect (default):** Disables legacy `saa-study-gsa-iceland-monthly` EventBridge rule to prevent **double RunTask**. Use `-KeepLegacySchedule` to skip.

### Run the lab

```powershell
# PowerShell — from repo root
.\HTML\study-lab\night-32-lab-stepfunctions-setup.ps1
.\HTML\study-lab\night-32-lab-stepfunctions-setup.ps1 -TestStartExecution
.\HTML\study-lab\night-32-lab-stepfunctions-setup.ps1 -KeepLegacySchedule -DisableSuccessRule
```

```bash
# Git Bash / WSL
bash HTML/study-lab/night-32-lab-stepfunctions-setup.sh
bash HTML/study-lab/night-32-lab-stepfunctions-setup.sh --test-start
bash HTML/study-lab/night-32-lab-stepfunctions-setup.sh --keep-legacy-schedule --disable-success-rule
```

| Flag | What happens |
|------|----------------|
| `-TestStartExecution` / `--test-start` | `StartExecution` — **runs real ECS task** |
| `-KeepLegacySchedule` / `--keep-legacy-schedule` | Leave Night 12 monthly rule enabled |
| `-DisableSuccessRule` / `--disable-success-rule` | Disable Night 13 success→SQS rule (avoid duplicate messages) |

### End-to-end validation

1. **Result file:** `night-32-stepfunctions-result.json` — state machine ARN, schedule rule, legacy rule state.

2. **Step Functions console:** State machines → `saa-study-gsa-iceland-pipeline` → **Definition** — verify five states and Catch on `RunIcelandTask`.

3. **EventBridge console:** Rules → `saa-study-gsa-iceland-monthly-sfn` → target = state machine.

4. **Execution graph (if test started):** Green `RunIcelandTask` → `EnqueueCompletion` → `InvokeStatsUploader` → `PublishSuccess`.

5. **SQS (optional):** `aws sqs get-queue-attributes` on completion queue — message from Step Functions if test ran.

**Troubleshoot in this order:**

1. `sam deploy` failed on `PassRole`? Verify `EcsExecutionRoleArn` / `EcsTaskRoleArn` in result file match live IAM roles.
2. `RunIcelandTask` failed instantly? Subnets/SG from `night-9-vpc-ids.json` — same as Night 12.
3. `InvokeStatsUploader` failed? Deploy Night 17 Lambda first, or inspect CloudWatch Logs for VPC/Aurora errors.
4. Double Iceland runs? Legacy monthly rule still ENABLED — rerun setup without `-KeepLegacySchedule`.
5. Duplicate SQS messages? Disable Night 13 success rule with `-DisableSuccessRule`.

### Console reading (10 min)

- **Step Functions** → execution → **Event view** — see `TaskScheduled`, `TaskSucceeded` per state.
- **CloudWatch Logs** — `/aws/states/saa-study-gsa-iceland-pipeline` (if logging enabled in account).
- Compare **Night 28** integration audit — same SQS/SNS ARNs, new orchestration layer.

### Reference files

- `sam-pipeline-orchestrator/template.yaml` — SAM stack
- `sam-pipeline-orchestrator/statemachine/pipeline.asl.json` — ASL definition
- `gsa-stepfunctions-map.md` — before/after architecture
- `gsa-integration-map.md` — Nights 12–14 baseline

### Teardown

```powershell
.\HTML\study-lab\night-32-lab-stepfunctions-teardown.ps1
```

```bash
bash HTML/study-lab/night-32-lab-stepfunctions-teardown.sh
```

Runs `sam delete` on `sam-pipeline-orchestrator`, re-enables legacy Night 12 schedule if it was disabled, removes result file. **Does not** delete SQS, SNS, Lambda, or ECS resources from earlier nights.

---

## Block 3 (~20 min) — Quiz + integration notes

**File:** `night-32-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz/32/`.

**Write one sentence — why Step Functions for GSA:**

| Piece | Night 32 sentence |
|-------|-------------------|
| Orchestration | Visible ECS→SQS→Lambda chain with per-step Retry/Catch |
| Failure | `Catch` → same SNS topic as Night 14 |
| Cost | One monthly Standard execution ≪ NAT/Aurora steady state |
| Exam | Standard not Express for multi-hour batch |

---

## Week 5 map (continued)

| Topic | Night |
|-------|-------|
| S3 lifecycle + Cost Explorer | 30 |
| Fargate right-sizing | 31 |
| **Step Functions capstone** | **Tonight (32)** |
| Architecture write-up | 33 |

---

## 5 flashcards (write tonight)

1. **Standard vs Express** — 2-hour Iceland batch?  
   *(Standard — Express max 5 minutes.)*

2. **runTask.sync** — What does sync mean?  
   *(Step Functions waits until ECS task STOPPED; failed exit fails the state.)*

3. **Catch vs Retry** — Lambda throttled 3× then still failing?  
   *(Retry exhausts → Catch routes to SNS failure state.)*

4. **PassRole** — Who needs it on RunTask?  
   *(Step Functions execution role must PassRole to ECS execution + task roles.)*

5. **Double RunTask trap** — Two schedules on same cron?  
   *(Disable Night 12 rule when SFN schedule owns the monthly run.)*

---

## Night 33 preview

**Architecture write-up** — document GSA frontend + backend stacks; one security, resilience, and cost win per tier; link labs to Well-Architected pillars.

---

## Reference links

- [Step Functions Standard workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- [ECS RunTask integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-ecs.html)
- [SAM StateMachine resource](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-statemachine.html)
- [Error handling Catch and Retry](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
