# GIS Professional Portfolio Copy Audit — witcoskitech.com

**Date:** August 20, 2026 (copy edits applied after owner answers)  
**Site purpose:** Online résumé and portfolio for a **GIS professional** transitioning toward solution architecture. **Not a consulting business.**  
**Scope:** Public-facing English copy on the Next.js site (`HTML/`), platform playgrounds, downloadable résumés, History archive, Cloud Resume Challenge blog, and AWS study UI chrome.  
**Out of scope:** Quiz/study-guide corpus in `HTML/study-lab/` (~630 questions, 30 guides).

**Status:** Approved copy edits have been applied to webpage and résumé files. No routes, APIs, schema, analytics, or styling were changed.

---

## Owner clarifications (confirmed)

| Topic | Your answer | How copy treats it |
|-------|-------------|-------------------|
| Role | GIS professional, not a professor | Practitioner voice |
| Consulting | Not doing consulting | Contact is for hiring managers/recruiters, not billable work |
| Vector Scope AI LLC | Playground (you had no preferred slogan) | "a playground for experimental GIS and cloud projects" |
| Clearance | No TS/SCI | Removed from Esri playground |
| Current employer mission | USPIS, not IC/USPIS | First mention spelled out: U.S. Postal Inspection Service (USPIS) |
| Career start | 2007, keep **15+ years** (Q1c) | Homepage, Esri lede, and main résumé keep "15+ years" |
| Contact | Employers/recruiters (Q2a) | Contact intro added; CTA stays "Get in touch" |
| Tagline | "Whatever pays the most" (Q3) | Keep **Solutions Architect · GIS & Cloud** |
| National Grid | Azure (Q5) | Experience bullets now say Azure-hosted ArcGIS Enterprise |
| DRT / CDC | Finished 2026 (Q6) | Timeline stays 2022–2026; "Previously DRT Strategies (CDC)" |
| Booz Allen | DHS only, remove FEMA (Q7) | FEMA removed from site, playgrounds, and résumé variants |
| SAA-C03 | Still in progress (Q8) | Education/homepage unchanged |
| Cloud Resume Challenge | Completed **2023** (Q9) | Blog opener updated |
| Public names | Fine as-is (Q11) | CDC, National Grid, Census, DHS, Booz Allen remain |
| Esri years (Q12) | No preference | Keep 15+ years to match Q1c |

---

## Methodology

The `ai-check` and `humanize` skills were **not installed** in this environment. This audit applies your brief manually: flag vague or marketing language, propose minimal credible rewrites, and mark anything still needing your input.

### Files reviewed

| Area | Files |
|------|-------|
| Homepage | `hero-section`, `about-me`, `featured-work`, `side-projects`, `platform-labs`, `contact`, `experience`, `education` |
| Global metadata | `HTML/src/app/layout.tsx` |
| Content data | `HTML/src/data/site-data.ts` |
| Footer | `footer/index.tsx`, `VisitorCount.tsx` |
| History | `history/page.tsx`, `history-data.ts` |
| Platform hubs | All `HTML/public/*-playground/index.html` |
| Long-form | `cloud-resume-challenge/page.tsx`, `aws-solutions-architect-study/page.tsx` |
| Downloads | `Jonathan_Witcoski_Resume_*.md` variants |

---

## Executive summary (revised plan)

The site is already strong on **technical specificity** (named AWS services, architecture tradeoffs, honest TBD labels). That should stay.

The revised goal is not "win consulting clients" but help **employers, teammates, and technical peers** quickly understand:

1. Who you are (GIS professional, SA-track)
2. What kind of work you do (ArcGIS, AWS, spatial pipelines)
3. Where you have done it (CDC, utilities, Census, federal)
4. What you build on your own (Vector Scope AI playground, case studies, labs)
5. How to reach you

**Copy problems addressed in this pass:**

1. **Accuracy:** IC/USPIS → U.S. Postal Inspection Service (USPIS); TS/SCI removed; FEMA removed (DHS only); Azure named for National Grid; Vector Scope AI described as an experimental playground.
2. **Tone:** Reduced jargon ("Solutions Architect lens," "product-grade," "table stakes"), em dashes in key spots, and blog hype ("thrilled to announce," "utilizing").
3. **Positioning:** About Me and contact copy now speak to employers/recruiters, not consulting clients.
4. **Not added:** Services page, engagement model, or sales CTAs.

---

## Proposed revisions

### Priority A — Factual corrections (apply once confirmed)

| File path | Current text | Issue | Proposed revision | Verification |
|-----------|--------------|-------|-------------------|--------------|
| `HTML/src/data/site-data.ts` | …for IC and USPIS missions | Wrong agency label per owner | …for USPIS missions | **Confirmed** — USPIS only |
| `HTML/public/esri-playground/index.html` | CDC, utility, Census, and IC/DoD work I've shipped for 15+ years | IC/DoD inaccurate; years understated | CDC, utility, Census, and USPIS work I've shipped since 2007 | **Confirmed** USPIS; years pending your preference |
| `HTML/public/esri-playground/index.html` | TS/SCI environments, Portal auth, and network isolation change how you design maps. | Owner has no TS/SCI | Portal auth, network isolation, and enterprise security rules change how you design maps. | **Confirmed** — remove TS/SCI |
| `HTML/public/Jonathan_Witcoski_incatech_2026.md` | …for IC and USPIS missions | Same as site-data | …for USPIS missions | **Confirmed** |
| `HTML/public/Jonathan_Witcoski_incatech_2026.md` | Recent USPS ITS contract experience | May conflict with USPIS-only framing | *(pending your answer)* | See Q4 below |

### Priority B — Homepage and metadata (voice + clarity)

| File path | Current text | Issue (`ai-check`) | Proposed revision (`humanize`) | Verification |
|-----------|--------------|-------------------|-------------------------------|--------------|
| `HTML/src/app/components/home/about-me/index.tsx` | I'm Jonathan, a Solutions Architect–track GIS engineer with 15+ years designing cloud and enterprise geospatial systems for CDC, utilities, and federal clients. I choose platforms and services — ArcGIS, AWS, and spatial data pipelines — so maps become scalable products. | Em dashes; "15+ years" understates 2007 start; "scalable products" vague; "federal clients" sounds consultative | I'm Jonathan, a GIS engineer working toward AWS Solutions Architect certification. Since 2007 I've built ArcGIS and cloud geospatial systems for CDC programs, a major utility, the Census Bureau, and federal agencies. I pick ArcGIS, AWS, and spatial data pipelines based on what the system needs to run reliably. | Years phrasing — see Q1 |
| `HTML/src/app/components/home/about-me/index.tsx` | …Studying for AWS Solutions Architect – Associate; shipping cloud-backed tools at Vector Scope AI. | "Shipping" implies product company; Vector Scope role unclear | …Studying for AWS Solutions Architect – Associate. On the side I run Vector Scope AI, a playground where I try new GIS and cloud ideas (Global Ski Atlas, ywiki, and related experiments). | **Confirmed** playground framing; avoid "cutting-edge" unless you want that exact phrase |
| `HTML/src/app/layout.tsx` | Solutions Architect–track GIS engineer. 15+ years designing enterprise geospatial systems… | Same as About Me | GIS engineer (Solutions Architect track). Building ArcGIS and AWS geospatial systems since 2007 for CDC, utilities, and federal agencies. Portfolio and case studies on this site. | Years phrasing — see Q1 |
| `HTML/src/app/components/home/featured-work/index.tsx` | Case studies in how cloud platforms and services ship a product — the Solutions Architect lens, not a feature checklist. | Em dash; insider jargon | Each project explains a platform choice: why Docker instead of Lambda, why one Parquet file feeds both map and wiki, and what broke along the way. | No |
| `HTML/src/app/components/home/hero-section/index.tsx` | Get in touch | Generic | Say hello | Professional, not salesy; fits job/networking contact | See Q2 |
| `HTML/src/app/components/home/contact/index.tsx` | Get in touch / Your message | No context for non-consulting contact | Say hello / What would you like to talk about? | Pairs with one-line intro you approve | See Q2 |
| `HTML/src/app/components/home/platform-labs/index.tsx` | Same hub pattern for each stack — why I use it, what I've built, and what's coming next. | Em dash; internal jargon | Each link opens a short write-up: when I pick that platform, what I've built with it, and what is still in progress. | No |
| `HTML/src/app/components/home/side-projects/index.tsx` | Maps, tools, and experiments — GIS craft alongside the cloud architecture work above. | Em dash | Maps, tools, and experiments from cartography and GIS work, alongside the cloud case studies above. | No |

### Priority C — Case studies, playgrounds, long-form

| File path | Current text | Issue | Proposed revision | Verification |
|-----------|--------------|-------|-------------------|--------------|
| `HTML/src/data/site-data.ts` | End-to-end cloud architecture you can click through — proof of designing… | Em dash; self-congratulatory "proof of" | You can click through the full stack on this site: static hosting, DNS, a serverless counter API, and the IaC/CI pipeline that deploys it. | No |
| `HTML/src/data/site-data.ts` | Supported situational awareness and decision-making during major disaster operations | Generic résumé phrasing | Built maps and spatial workflows used during major FEMA and DHS disaster operations. | See Q7 |
| `HTML/public/maptiler-playground/index.html` | Maps without the platform tax | Marketing idiom | Maps without stacking multiple vendors | No |
| `HTML/public/mapbox-playground/index.html` | Vector maps when the UX has to feel product-grade. | Buzzword | Vector maps when the interface needs to feel polished and fast. | No |
| `HTML/public/aws-playground/index.html` | …table stakes for Solutions Architects. | Insider jargon | …comes up on almost every static-site architecture review. | No |
| `HTML/public/azure-playground/index.html` | Multi-cloud fluency | Consultant phrase | Working across AWS, Azure, and GCP when a project calls for it. | No |
| `HTML/public/azure-playground/index.html` | I've migrated utility GIS datasets to cloud-hosted ArcGIS Enterprise on Azure | Azure specificity unverified | *(keep or soften pending Q5)* | See Q5 |
| All playground lab footers | Mapping and cloud playgrounds — each hub explains… | Repeated verbatim 7× | Vary slightly per hub | No |
| `HTML/src/app/cloud-resume-challenge/page.tsx` | Hello everyone… utilizing… thrilled to announce! | Casual; banned word; hype | See Priority B tone edits | Cloud Resume completion year — see Q6 |
| `HTML/public/Jonathan_Witcoski_Resume_2026.md` | Strong match for ArcGIS Enterprise… | Job-application boilerplate | Core tools: ArcGIS Enterprise/Online/Pro, Python, … | No |

### Copy that still works (keep)

- Case study bodies in `site-data.ts` (Global Ski Atlas, ywiki, Learn Bosnian): specific, honest
- Side project blurbs: short and factual
- History archive intro: appropriate academic tone without claiming professor role
- AWS study page opener: credible self-assessment
- Contact success/error strings: fine

---

## Highest-impact changes (applied)

1. **Factual strings:** USPIS spelled out; IC/DoD and TS/SCI removed; FEMA removed (DHS only); National Grid named as Azure; "15+ years" kept.
2. **About Me:** SA-track GIS engineer; Vector Scope AI as experimental playground; federal agencies not clients; DHS not FEMA/DHS.
3. **Cloud architecture intro:** Platform-choice language instead of "Solutions Architect lens."
4. **Contact:** One sentence for hiring managers and résumé reviewers; placeholder "Role, team, or question."
5. **Cloud Resume Challenge:** Removed "utilizing" and "thrilled to announce"; completion year set to 2023.

---

## Recommended site voice statement (revised)

> I write as a GIS professional building toward solution architecture: direct, specific, and grounded in what I actually shipped. I name platforms, services, and tradeoffs. I describe what I built and what is still experimental. Vector Scope AI is my lab for trying new GIS and cloud ideas, not a consulting practice. Employment and federal work stay factual; side projects and TBD designs are labeled honestly. I use "I" when speaking as the practitioner.

---

## Remaining questions

**R1. CDC federal vs contractor split** — answered: federal for the first 2 years, then contractor for 2 (same Geographer job). Applied as CDC 2022–2024 (federal) and DRT Strategies 2024–2026 (contractor). Switch year is 2024; exact month of conversion was not given, so résumés keep March 2022 as the federal start and use 2024 as the contractor start year.

**R2. USPS ITS on the INCATech résumé variant** — keep (confirmed).

**R3. Downloadable PDF** — rebuilt from the updated markdown.

---

## Content gaps still optional (do not invent)

1. One-line site purpose under the hero ("Portfolio for GIS and cloud architecture roles")
2. Whether 2007 Tyco / WDG / Philmont should appear on the **homepage** timeline
3. Privacy note for the Formspree contact form
4. Verified metrics for case studies

**Not applicable:** services page, consulting FAQ, engagement model.

---

## Next steps

Copy edits from the approved audit are applied. Optional content gaps above can wait.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-20 | Initial audit |
| 2026-08-20 | Reframed as GIS professional portfolio (not consulting) |
| 2026-08-20 | Applied approved copy edits from owner answers (Q1c–Q12) |
| 2026-08-20 | Split CDC role: federal 2022–2024, DRT contractor 2024–2026; rebuilt downloadable PDFs |
