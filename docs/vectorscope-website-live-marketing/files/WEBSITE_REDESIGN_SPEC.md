# Vector Scope AI Website Redesign — Historical Spec

> **Status (2026):** Vector Ledger is **built and live**. Marketing copy and architecture on `index.html` / `pitch-deck.html` reflect the as-built AWS product (Cognito SPA, Lambda/API Gateway, DynamoDB proposals, ECS convert/apply, S3 GeoParquet + PMTiles).
>
> Do **not** treat the ArcGIS Online/Enterprise editor-of-record, Iceberg, or Athena sections below as current product. Those were the old target diagram.
>
> **Live:** [vectorscopeai.com](https://vectorscopeai.com) · [app.vectorscopeai.com](https://app.vectorscopeai.com) · [api.vectorscopeai.com](https://api.vectorscopeai.com)
>
> **Tagline:** Collaborative editing · approvals · versioned GeoParquet
>
> **Future (one line):** Iceberg table management and Athena analytics on the same GeoParquet lake.

---

## Original brief (superseded for product framing)

Implement a focused product startup layout. Deploy before submitting to the Esri Startup Program. **Prefer live pages over this document for messaging.**

---

## Design System

**Files to update:** `tailwind.config.js`, `css/index.css`, `index.html` (body background).

| Token | Value | Usage |
|-------|--------|--------|
| Primary | `#1A73E8` | Primary buttons, key links, accents |
| Secondary | `#34A853` | Green accent — secondary highlights |
| Background | `#F8F9FA` | Light gray — page/section backgrounds |
| Text | `#202124` | Near black — body and headings |

**Typography:**
- **Font:** Inter. Add to `index.html` head: `https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap`
- **Sizes:** H1 = 48px, H2 = 32px, body = 16px
- **Weights:** Headings = Inter Bold (700), body = Inter Regular (400)

**Tone:** Short sentences. Active voice. Focus on agency pain points (staff can't edit maps, data trapped in proprietary formats).

---

## Content to Remove (Must NOT Include)

- Contractor clients (CDC, DHS, FEMA as "our clients")
- "Full-stack GIS development"
- Long technical descriptions (Bedrock, SageMaker, LangChain, FISMA paragraphs)
- GitHub links
- R/Python mentions
- Sections: "AI-Powered Services" (four service cards), "AI Case Studies" (swiper carousel), "Why These Projects Succeeded", "Your AI Expert Who Understands Government" (long consultant bio)
- Swiper JS and carousel markup
- Secondary CTA "Discuss Your AI Project" / "Explore AI Services" — replace with product CTAs only
- Framing Vector Ledger as TBD / not built / architecture target only
- Claiming Apache Iceberg, Amazon Athena, or ArcGIS Online/Enterprise edit APIs as shipped product

---

## Current product CTAs (authoritative)

- Nav / footer: **Ledger App** → `https://app.vectorscopeai.com`
- Hero primary: **Open Vector Ledger** → `https://app.vectorscopeai.com`
- Product: **Open Vector Ledger App** → `https://app.vectorscopeai.com`
- Keep public playground embed: `https://app.vectorscopeai.com/public?embed=1`

---

## Legacy section notes (do not reinstate as current)

Early drafts of this file described Esri Experience Builder as the editor of record and an Iceberg/Athena lakehouse. That was the old target diagram—not what ships today.

**Live architecture caption:**

> Vector Ledger on AWS — Cognito-authenticated SPA, Lambda/API Gateway control plane, DynamoDB proposals, ECS convert/apply, S3 GeoParquet + PMTiles lake.
