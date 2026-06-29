# Night 21 — Hybrid networking: VPN, Direct Connect, Transit Gateway, PrivateLink

~2 hr. **$0 AWS spend** — theory and paper diagrams only. Builds on Night 8–9 VPC fundamentals (IGW, NAT, subnets, VPC endpoints) and the Night 9 `saa-study-gsa-vpc` you already built for Fargate and Aurora.

---

## Plain language first

### What “hybrid” means on the exam

**Hybrid cloud** = your **on-premises network** (resort data center, corporate office) connected to **AWS VPCs** so traffic can flow privately or over encrypted tunnels — not only “users hit a public ALB on the internet.”

**GSA story:** Resort HQ runs legacy `resort_stats` PostgreSQL on-prem. Night 16 Aurora lives in `saa-study-gsa-vpc`. Tonight you learn **how HQ CIDRs reach that VPC** without exposing the database to `0.0.0.0/0`.

```
┌─────────────────────┐                    ┌──────────────────────────────┐
│  On-premises DC     │                    │  AWS (us-east-1)             │
│  192.168.0.0/16     │  ◄── hybrid ──►   │  saa-study-gsa-vpc           │
│  resort_stats DB    │      link          │  10.0.0.0/16 (Night 9)       │
│  staff VPN clients  │                    │  Aurora, Fargate, Lambda     │
└─────────────────────┘                    └──────────────────────────────┘
```

Three connection families the SAA exam mixes up — learn **what rides over the public internet** vs **dedicated fiber**:

| Family | Examples | Traffic path | Typical use |
|--------|----------|--------------|-------------|
| **Encrypted over internet** | Site-to-Site VPN, Client VPN | IPSec tunnels across public internet | Fast to stand up, backup path, branch offices |
| **Dedicated private link** | AWS Direct Connect (DX) | Customer router ↔ AWS Direct Connect location (partner colo) | Stable latency, high bandwidth, compliance |
| **Inside AWS only** | VPC peering, TGW, PrivateLink | AWS backbone (no on-prem) | Multi-VPC, multi-account, SaaS without public exposure |

### Neighborhood analogy (memorize this first)

Each **house** = a network (on-prem data center or VPC). **Traffic** = people/packages moving between houses.

| Service | Analogy | One-line technical tie-in |
|---------|---------|---------------------------|
| **Site-to-Site VPN** | **Walkie-talkies over the noisy street** — two houses agreed on a secret code; messages go over the public road (internet), scrambled (IPSec). Cheap and quick. AWS gives **two walkie-talkies** (tunnels) in case one dies. | Two fixed endpoints; quality varies with the public internet. |
| **Direct Connect (DX)** | **Private driveway** paved straight from your house to the AWS cul-de-sac — no public street. Consistent drive time; big trucks (bandwidth) welcome. Takes **weeks** to pave. Not a vault by default — add **VPN over DX** for an armored truck on the private road. | Dedicated circuit; stable latency; not encrypted by default. |
| **DX + VPN failover** | **Private driveway (primary) + walkie-talkies in the glove box (backup).** Driveway under construction? Flip to walkie-talkies until the driveway is back. | DX primary; Site-to-Site VPN to same TGW/VGW when DX fails. |
| **Transit Gateway (TGW)** | **Neighborhood roundabout / mail-sorting hub** — instead of a separate string between every pair of houses (12 houses = dozens of strings), everyone builds **one short driveway to the roundabout**. The hub decides where to send traffic. | **Transitive** — A can reach C through the hub (unlike peering). |
| **VPC peering** | **Backyard gate between exactly two adjacent houses** — Dev ↔ Staging can walk through freely. But Dev gates to Staging and Staging gates to Logging does **not** let Dev reach Logging through Staging. **Non-transitive.** Both houses need **different addresses** (no overlapping CIDRs). | 1:1 full private IP mesh; A↔B + B↔C ≠ A→C. |
| **PrivateLink** | **Service window on one house** — you don't get keys to the whole building. Vendor runs their API in **their** house; you get a **window in your house** that connects privately to **their counter** (NLB). No merged address books or route tables. | Consumer interface endpoint → provider service only. |
| **VPC Gateway endpoint (S3/DDB)** | **Free internal alley** from your house straight to the AWS grocery warehouse — skip the public street and NAT toll booth. Only for **AWS-owned** warehouses (S3, DynamoDB), not third-party shops. | Night 8/10 pattern; route table entry, not PrivateLink. |
| **Client VPN** | **Personal intercom for each remote worker** — Site-to-Site VPN is **whole data center ↔ AWS**; Client VPN is **Bob's laptop ↔ VPC** from a hotel. | Per-user remote access, not site-to-site WAN. |

**String sharpened:** Site-to-Site VPN **is** a string between **two fixed houses** over the **public street** (encrypted). It does not scale to “every house talks to every house.” That is why the exam pushes **roundabout (TGW)** for many VPCs, **backyard gate (peering)** for exactly two neighbors, and **service window (PrivateLink)** when you only need one counter at a vendor's house — not the keys to their whole property.

**Exam pick chart (same analogy language):**

| If the exam says… | Analogy pick |
|-------------------|--------------|
| Fast cheap hybrid this week | Walkie-talkies (Site-to-Site VPN) |
| Stable 5 Gbps, no internet jitter | Private driveway (Direct Connect) |
| DX failed — need backup | Glove-box walkie-talkies (VPN failover) |
| 12 VPCs + on-prem | Roundabout (Transit Gateway) |
| Two VPCs, full private IP chat | Backyard gate (VPC peering) |
| Vendor SaaS API, no public internet | Service window (PrivateLink) |
| Fargate → S3 without NAT toll | Internal alley (S3 gateway endpoint) |
| Laptop engineer → VPC | Personal intercom (Client VPN) |

---

## Site-to-Site VPN

**Site-to-Site VPN** = IPSec tunnel between your **customer gateway** (on-prem router/firewall) and an AWS **virtual private gateway (VGW)** attached to **one VPC**, or a **Transit Gateway** attachment.

```
On-prem router                    AWS
(Customer Gateway)                (Virtual Private Gateway on VPC)
      │                                    │
      │──────── IPSec tunnel #1 ──────────►│
      │──────── IPSec tunnel #2 ──────────►│  (AWS requires 2 tunnels for HA)
      │         (public internet)          │
```

| Piece | Plain English |
|-------|---------------|
| **Customer Gateway (CGW)** | Your side — public IP + BGP ASN (or static routes) |
| **Virtual Private Gateway (VGW)** | AWS edge for VPN on a **single VPC** |
| **VPN connection** | Two tunnels; route tables learn on-prem prefixes via **BGP** or static routes |
| **Accelerated VPN** | Optional — uses AWS Global Accelerator edge for better performance over internet |

**When exam picks VPN:**

- Need hybrid connectivity **this week**, low setup cost
- Bandwidth in **hundreds of Mbps** over internet is acceptable
- **Backup** path when Direct Connect fails (DX + VPN is a classic pair)
- Single VPC or hub already using **Transit Gateway**

**Exam traps:**

- VPN does **not** replace NAT for private subnet outbound internet — different problem (Night 8)
- **Overlapping CIDR** with VPC (e.g. on-prem `10.0.0.0/16` and VPC `10.0.0.0/16`) — **will not work**; redesign CIDR or use NAT/proxy
- **Client VPN** (OpenVPN) = **individual laptops**, not site-to-site DC links

---

## Direct Connect (DX)

**Direct Connect** = **physical dedicated network connection** (or hosted connection via partner) from your router to an **AWS Direct Connect location**. Traffic stays on private paths — **not** encrypted by default (you add VPN over DX if you need encryption).

```
On-prem router ──fiber/cross-connect──► DX Location ──► AWS Direct Connect endpoint
                                                              │
                                                              ▼
                                                    Virtual Interface (VIF)
                                                    • Private VIF → VPC (via VGW or DX Gateway)
                                                    • Public VIF  → AWS public services (S3 public endpoints, etc.)
                                                    • Transit VIF → Transit Gateway
```

| Type | What it reaches |
|------|-----------------|
| **Private VIF** | Your VPC CIDRs via **Virtual Private Gateway** or **Direct Connect Gateway** |
| **Public VIF** | AWS public IP space (e.g. S3 **public** endpoints, not same as VPC endpoints) |
| **Transit VIF** | **Transit Gateway** — one DX pipe to many VPCs/accounts |

**When exam picks Direct Connect:**

- **Consistent** network latency (ski-season ops dashboards)
- **1 Gbps – 100 Gbps** sustained throughput
- Compliance: traffic must **not** traverse public internet
- Primary hybrid link with **Site-to-Site VPN as failover**

**DX + VPN failover pattern (memorize sketch):**

```
Primary:  On-prem ──DX──► DX Gateway ──► TGW ──► VPCs
Backup:   On-prem ──VPN──► TGW (same hub)     ▲
         (automatic or manual failover when DX link down)
```

**Exam traps:**

- DX takes **weeks** to provision — not “launch by Friday”
- DX alone is **not encrypted** — exam may ask for **VPN over Direct Connect** for encryption
- **Direct Connect Gateway** vs **Transit Gateway**: DX Gateway aggregates VIFs toward multiple VPCs in **one Region**; **TGW** is the multi-VPC/multi-Region hub (often used together: DX → DXGW → TGW)

---

## Transit Gateway (TGW)

**Transit Gateway** = **regional hub** that connects VPCs, VPNs, and Direct Connect attachments with **centralized route tables** — replaces a mesh of VPC peerings.

```
                    ┌─────────────────┐
    VPC A ─────────►│                 │◄───────── VPC B
    (10.0.0.0/16)   │  Transit        │          (10.1.0.0/16)
                    │  Gateway        │
    VPN / DX ──────►│  (hub)          │◄───────── VPC C (shared account)
                    └─────────────────┘
```

| vs VPC peering | Transit Gateway |
|----------------|-----------------|
| **Transitive routing** | Peering is **non-transitive** (A↔B and B↔C does **not** give A↔C) | **Transitive** — spoke VPCs via hub |
| **Scale** | Full mesh = N(N−1)/2 peerings | One attachment per VPC |
| **Route control** | Per-VPC route tables only | **TGW route tables** — segment prod vs dev, blackhole routes |
| **Cross-account** | Peering accepter | **RAM** share TGW; separate route tables per tenant |

**GSA extension:** Night 9 VPC (`10.0.0.0/16`) + future **prod** VPC (`10.1.0.0/16`) + on-prem `192.168.0.0/16` → attach all three to **one TGW**; on-prem learns AWS routes via VPN or DX **Transit VIF**.

**Exam scenarios for TGW:**

- **10+ VPCs** and on-prem — stop drawing pairwise peering
- **Centralized egress** — inspection VPC with firewall appliance (GWLB Night 11 tie-in)
- **Multi-account landing zone** — shared services VPC (Directory, logging) reachable from all spokes

---

## VPC peering vs PrivateLink vs VPC endpoints

These three get conflated. Separate them by **who owns the service** and **whether routing is transitive**.

### VPC peering

- Connects **two VPCs** (same or different account/Region with **inter-Region peering**)
- **Non-transitive** — no “peering through” a middle VPC
- **No overlapping CIDRs**
- **Full network visibility** — routes to peer CIDR; security still via **SG/NACL**
- Use: two VPCs need **bidirectional** private IP reachability (app tier ↔ DB tier across VPCs)

```
VPC A (10.0.0.0/16) ◄──── peering ────► VPC B (10.1.0.0/16)
  route: 10.1.0.0/16 → pcx-xxx              route: 10.0.0.0/16 → pcx-xxx
```

### AWS PrivateLink (interface VPC endpoint **services**)

- **Consumer** VPC connects to a **provider service** via **interface endpoint (ENI)** in your subnets
- Traffic stays on **AWS private network**; **no VPC peering** between consumer and provider
- Provider exposes **NLB** behind a **VPC endpoint service**; consumer gets **private DNS**
- Use: **SaaS** (Snowflake, Datadog, partner API), **shared services in another account** without merging CIDRs or full peering

```
Consumer VPC                         Provider VPC (other account)
  Lambda / EC2 ──► interface endpoint ──► NLB ──► service instances
                   (private IP in your subnet)     (provider never peers your whole VPC)
```

### VPC endpoints (Night 8 — not PrivateLink to third parties)

| Endpoint type | Targets | Cost model |
|---------------|---------|------------|
| **Gateway** | **S3**, **DynamoDB** | Free; route table entry |
| **Interface** | Most other AWS APIs (ECR, Secrets Manager, etc.) | Per-AZ ENI hourly + data |

**Exam trap:** “Private access to **S3** from private subnet” → **S3 Gateway VPC endpoint** (Night 8/10), **not** PrivateLink and **not** Direct Connect Public VIF unless question explicitly says on-prem over DX.

### Decision table (write on flashcard)

| Need | Pick |
|------|------|
| On-prem DC ↔ one VPC, quick/cheap | **Site-to-Site VPN** |
| On-prem ↔ AWS, dedicated bandwidth/latency | **Direct Connect** (+ VPN backup) |
| Many VPCs + on-prem hub | **Transit Gateway** |
| Two VPCs, full private IP mesh, 1:1 | **VPC peering** |
| SaaS or partner service in another account, no CIDR merge | **PrivateLink** |
| Lambda in VPC → DynamoDB without NAT | **DynamoDB Gateway endpoint** |

---

## Block 1 (~60 min) — VPN + Direct Connect deep read

**Draw on paper (15 min):** Extend `week2-vpc-plan.md` with an on-prem box `192.168.0.0/16` and show **both** DX (primary) and VPN (backup) into a **Transit Gateway**, then TGW → `saa-study-gsa-vpc`.

**Read (30 min):**

- [Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/sgsitevpn-sitevpn.html) — CGW, VGW, two tunnels
- [Direct Connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html) — skim Private vs Public vs Transit VIF
- [Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html) — attachments and route tables

**Compare matrix (fill in from memory):**

| | Site-to-Site VPN | Direct Connect | Transit Gateway |
|--|------------------|----------------|-----------------|
| Connects on-prem to AWS? | **Yes** | **Yes** | Via VPN/DX attachment |
| Uses public internet? | **Yes** (IPSec) | **No** (private circuit) | N/A (AWS hub) |
| Setup time | Hours | Weeks | Hours (after VPCs exist) |
| Typical exam role | Backup / quick hybrid | Primary hybrid | Multi-VPC + hybrid hub |

---

## Block 2 (~30 min) — Three exam scenarios (diagram aloud)

Spend **10 minutes each**. Say out loud: *components, route direction, why not the wrong answer.*

### Scenario 1 — On-prem resort_stats → Night 9 VPC (hybrid ingress)

**Ask:** HQ `192.168.0.0/16` must query Aurora in private subnets **without** public `0.0.0.0/0` on the database. Leadership wants predictable latency for daily ETL; budget allows a dedicated circuit.

**Answer sketch:**

```
192.168.0.0/16 ──DX (primary)──► DX Gateway ──► TGW ──► saa-study-gsa-vpc
              └──VPN (backup)──► TGW attachment
Aurora SG: allow 5432 from on-prem CIDR (or ETL instance SG) — same idea as Night 16 Lambda SG rule
```

**Wrong answers to reject:** Public Aurora + security group `0.0.0.0/0`; NAT Gateway as “hybrid link”; VPC peering to on-prem (peering is **VPC-to-VPC only**).

### Scenario 2 — Multi-VPC hub (prod + dev + shared logging)

**Ask:** Three accounts each have a VPC. Every VPC must reach a **central logging VPC** and **on-prem SIEM**. No full mesh peering.

**Answer sketch:**

```
On-prem ──VPN──► TGW ◄── attach ── VPC prod
                    ◄── attach ── VPC dev
                    ◄── attach ── VPC logging (shared services)
TGW route table: propagate on-prem + logging CIDR to prod/dev; isolate prod ↔ dev if required
```

**Wrong answer:** VPC peering mesh (3 peerings still miss transitive on-prem); **PrivateLink** (for service exposure, not arbitrary IP routing between all VPCs).

### Scenario 3 — SaaS analytics vendor (PrivateLink)

**Ask:** A third-party ski-analytics SaaS runs in **their** AWS account. Your Fargate tasks in `saa-study-gsa-vpc` must call their API **without** traffic leaving AWS network to the public internet. Vendor offers AWS PrivateLink.

**Answer sketch:**

```
Fargate (private subnet) → interface endpoint (consumer) → vendor endpoint service → their NLB → API
No VPC peering; no inbound public IP on your tasks; SG egress to endpoint SG only
```

**Wrong answer:** Site-to-Site VPN to vendor (they don't run your CGW); Internet Gateway route for API calls; **Gateway endpoint** (only for **AWS** services like S3).

---

## Block 3 (~30 min) — Quiz + peering/PrivateLink reading

**File:** `night-21-quiz.json` — 15 timed scenario questions (~24 min at 96 sec each).

Score on the study site: `/aws-solutions-architect-study/quiz?night=21`.

**Reading (10 min, no deploy):**

- [VPC peering](https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html) — non-transitive rule
- [AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html) — consumer/provider model

---

## Hybrid networking domain map (Week 3 close-out)

| Topic | One-liner |
|-------|-----------|
| VPC IGW/NAT/endpoints | Night 8–10 |
| Aurora/Lambda in private VPC | Night 16–17 |
| **Site-to-Site VPN** | **Encrypted hybrid over internet** |
| **Direct Connect** | **Dedicated private hybrid** |
| **Transit Gateway** | **Transitive multi-VPC hub** |
| **VPC peering vs PrivateLink** | **Full VPC mesh vs SaaS/service exposure** |

---

## 5 flashcards (write tonight)

1. **Site-to-Site VPN vs Direct Connect** — internet path, setup time, bandwidth, encryption default.  
   *(VPN = IPSec over internet, hours; DX = private circuit, weeks; DX not encrypted by default — add VPN over DX if needed.)*

2. **DX failover** — What pairs with Direct Connect when the exam says “resilient hybrid”?  
   *(Site-to-Site VPN to same TGW/VGW — DX primary, VPN backup.)*

3. **Transit Gateway vs VPC peering** — transitive routing and when peering breaks down.  
   *(TGW = hub, transitive; peering = two VPCs only, A-B-C does not route A-C.)*

4. **PrivateLink vs VPC peering** — SaaS in another account; do you merge route tables?  
   *(PrivateLink = interface endpoint to NLB service; no full VPC peering or CIDR coordination.)*

5. **PrivateLink vs Gateway endpoint** — S3 from Fargate in private subnet.  
   *(Gateway endpoint for S3/DynamoDB to AWS; PrivateLink for third-party or cross-account published services.)*

---

## Night 22 preview

**Week 3 review** — draw full **3-tier VPC + ALB + Aurora** on one page; 30 timed practice questions across database, DR, migration, and hybrid networking; teardown checklist for Aurora study stack if you are done with Nights 16–17 labs.
