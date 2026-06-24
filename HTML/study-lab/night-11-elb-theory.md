# Night 11 — ELB theory (ALB vs NLB vs GWLB)

~2 hr, **no AWS spend**. Theory + paper diagram + quiz. Study VPC from Nights 9–10 stays up for Night 12.

## Block 1 (~50 min) — Which load balancer when?

### Decision tree (memorize)

```
What are you balancing?
│
├─ HTTP/HTTPS web app or API (path/host routing, WAF, Cognito)?
│     → Application Load Balancer (ALB) — Layer 7
│
├─ Raw TCP/UDP/TLS passthrough, static IP, ultra-low latency, millions RPS?
│     → Network Load Balancer (NLB) — Layer 4
│
└─ Inline third-party firewall/IDS/IPS appliances (GENEVE)?
      → Gateway Load Balancer (GWLB) — NOT for general apps
```

### ALB — Application Load Balancer (Layer 7)

| When to pick | Why |
|--------------|-----|
| REST/HTTP APIs behind one hostname | Path rules (`/api/*` → API TG, `/*` → web TG) |
| Host-based routing (`api.example.com` vs `www.example.com`) | Listener rules on Host header |
| WebSockets, HTTP/2, gRPC (with TLS) | L7 protocol awareness |
| WAF, OIDC/Cognito at the edge of VPC | WAF attaches to ALB; authenticate users before targets |
| ECS/Fargate services with path routing | Target type `ip` for awsvpc tasks |

**Not for:** non-HTTP protocols (raw MQTT, custom TCP game protocol) — use NLB.

**Exam traps:**
- ALB terminates TLS **or** passes through (HTTPS listener → HTTP target is common).
- ALB is **Regional** — one per Region; use Route 53 for multi-Region.
- **Cross-zone load balancing** is on by default (can disable to save cross-AZ data charges).
- **Sticky sessions** — duration-based cookie (`AWSALB`); useful for legacy stateful apps.

### NLB — Network Load Balancer (Layer 4)

| When to pick | Why |
|--------------|-----|
| Need **static IP or Elastic IP per AZ** | NLB can have fixed IPs; ALB cannot |
| TCP/UDP (DNS, gaming, IoT, VoIP) | L4 — no HTTP parsing |
| Extreme performance / connection churn | Handles millions of requests/sec, preserves connections on target failure briefly |
| Preserve client source IP without Proxy Protocol | Default behavior at L4 (ALB needs X-Forwarded-For) |
| TLS passthrough (terminate on target) | TCP listener forwards encrypted stream |

**Not for:** path-based routing, WAF at L7 (use ALB or CloudFront+WAF in front).

**Exam traps:**
- NLB **cross-zone load balancing is off by default** — enable if you want even AZ spread (adds cross-AZ cost).
- Health checks can be TCP, HTTP, or HTTPS — but routing is still L4.
- **PrivateLink** and NLB: NLB is a common NLB-as-a-service endpoint target.

### GWLB — Gateway Load Balancer

| When to pick | Why |
|--------------|-----|
| Centralized **inspection** (firewall, IDS/IPS, DPI) | Traffic routed through partner appliances |
| Replace hairpinning through a single EC2 firewall | Scales appliance fleet behind GWLB |
| East-west or north-south **security inspection** | GENEVE encapsulation (port 6081) |

**Architecture sketch (draw on paper):**

```
Client / workload subnet
        │
        ▼
  GWLB Endpoint (VPC subnet)
        │
        ▼
  Gateway Load Balancer
        │
        ▼
  Appliance fleet (3rd-party AMIs in dedicated subnets)
        │
        ▼
  Return via GWLB → original destination
```

**Not for:** distributing HTTP traffic to web servers — that is ALB/NLB.

**Exam traps:**
- GWLB uses **GENEVE**, not HTTP headers.
- Deploy **GWLB endpoint** in each VPC that sends traffic for inspection.
- Distinct from **Network Firewall** (managed) and **NAT Gateway**.

### Classic Load Balancer

Legacy — exam may mention “migrate to ALB/NLB.” No new features.

---

## Block 2 (~40 min) — Target groups + health checks

### Target group basics

| Concept | Detail |
|---------|--------|
| **Target types** | Instance (EC2), IP (Fargate awsvpc, on-prem), Lambda, ALB (nested) |
| **One TG per protocol:port** | e.g. `HTTP:80`, `HTTPS:443`, `TCP:5432` |
| **Register/deregister** | ASG can attach automatically; manual for standalone EC2 |
| **Deregistration delay** | Connection draining — default 300 s; in-flight requests finish |
| **Slow start** | Gradually ramp traffic to new targets (NLB/ALB) |

### Health checks — what the exam tests

| Setting | Typical ALB | Typical NLB |
|---------|-------------|-------------|
| Protocol | HTTP or HTTPS | TCP, HTTP, or HTTPS |
| Path | `/health` (must return 200) | N/A for TCP-only |
| Port | Traffic port or override | Traffic port or override |
| Interval | 30 s (default) | 30 s |
| Healthy threshold | 5 consecutive successes | 3 |
| Unhealthy threshold | 2 consecutive failures | 3 |
| Timeout | 5 s | 10 s (TCP) |

**Failure modes (troubleshoot order):**
1. Security group — LB SG must reach target port; target SG must allow **LB node IPs** (or reference LB SG on ALB).
2. NACL blocking health check return traffic.
3. Wrong path / wrong port / app returns 301 instead of 200.
4. Target in wrong subnet (no route from LB).
5. **Grace period** — new ASG instance still booting; health check fails until `HealthCheckGracePeriod` elapses.

### ALB + Auto Scaling (tie to your Week 2 VPC)

```
Internet → IGW → public subnets → ALB (nodes in public or private)
                                      │
                         listener rules → target groups
                                      │
                         private subnets → EC2/ECS tasks
```

For **Fargate behind ALB**: tasks in **private subnets**, ALB in **public** (or internal ALB in private for corp). Task SG: inbound **only from ALB SG** on app port.

### Listener rules (ALB only)

Priority order — first match wins:
1. Host `api.globalskiatlas.com` → TG-api
2. Path `/health` → TG-health (or fixed response)
3. Default → TG-web

### 5 flashcards (write tonight)

1. **ALB vs NLB** — L7 HTTP routing vs L4 TCP/UDP + static IP?
2. **GWLB** — what traffic and what encapsulation?
3. **Health check SG** — who must allow whom?
4. **Cross-zone** — ALB default on, NLB default off — cost implication?
5. **Deregistration delay** — what happens during ASG scale-in?

### Paper diagram (15 min)

Extend `week2-vpc-plan.md` with:
- ALB spanning public-a + public-b
- Target group → Fargate tasks in private-a / private-b
- SG arrows: ALB-SG → Fargate-SG:8080
- Health check path `/health` on task port

---

## Block 3 (~30 min) — Quiz

**File:** `night-11-quiz.json` — 20 timed scenario questions (resilience domain, ~32 min at 96 sec each).

Answer without `night-11-quiz-answers.json` first. Score on the study site: `/aws-solutions-architect-study/quiz?night=11`.

---

## Resilience domain map (what else shows up with ELB)

| Topic | One-liner |
|-------|-----------|
| **Route 53** | Failover/weighted/latency routing + health checks on ALB |
| **Auto Scaling** | ASG registers with TG; replace unhealthy instances |
| **Multi-AZ** | ALB/NLB nodes per AZ; RDS Multi-AZ is separate pattern |
| **RTO/RPO** | Failover DNS vs warm standby — Night 19 goes deeper |
| **SQS/SNS** | Decouple so LB traffic spikes do not crush sync backends — Night 12–14 |

---

## Night 12 preview

EventBridge cron → `ecs:RunTask` for Iceland pipeline. ELB not required for batch RunTask; ALB matters when you expose a **long-running service**.
