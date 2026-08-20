# Consulting Copy Audit — witcoskitech.com

**Date:** August 20, 2026  
**Scope:** Public-facing English copy on the Next.js resume site (`HTML/`), static platform playgrounds (`HTML/public/*-playground/`), downloadable résumés, History archive, Cloud Resume Challenge blog, and AWS study section UI chrome.  
**Out of scope for this pass:** Quiz question bodies and nightly study guides in `HTML/study-lab/` (~630 questions, 30 guides). Those are exam-prep content, not consulting positioning. They can be audited separately if needed.

---

## Methodology

### Skills note

The requested `ai-check` and `humanize` skills were **not found** in this environment (no SKILL.md, CLI, or package under `/workspace`, `/home/ubuntu/.cursor`, or project dependencies). This audit applies the criteria from your brief manually:

- **ai-check:** Flag empty promises, consultant clichés, unsupported claims, formulaic phrasing, excessive enthusiasm, CV-style biography, banned words, and em dashes.
- **humanize:** Propose the smallest rewrite that improves clarity, specificity, rhythm, and credibility without inventing facts.

No application files were changed. Awaiting your approval before editing webpage files.

### Files reviewed (primary consulting/resume surface)

| Area | Files |
|------|-------|
| Homepage | `HTML/src/app/components/home/hero-section/index.tsx`, `about-me/index.tsx`, `featured-work/index.tsx`, `side-projects/index.tsx`, `platform-labs/index.tsx`, `contact/index.tsx`, `experience/index.tsx`, `education/index.tsx` |
| Global metadata | `HTML/src/app/layout.tsx` |
| Content data | `HTML/src/data/site-data.ts` |
| Footer | `HTML/src/app/components/layout/footer/index.tsx`, `VisitorCount.tsx` |
| History | `HTML/src/app/history/page.tsx`, `HTML/src/data/history-data.ts` |
| Platform hubs | `HTML/public/maptiler-playground/index.html`, `mapbox-playground/index.html`, `esri-playground/index.html`, `google-maps-playground/index.html`, `aws-playground/index.html`, `azure-playground/index.html`, `gcp-playground/index.html` |
| Long-form pages | `HTML/src/app/cloud-resume-challenge/page.tsx`, `HTML/src/app/aws-solutions-architect-study/page.tsx` |
| Downloads | `HTML/public/Jonathan_Witcoski_Resume_2026.md` (+ variant résumés) |

---

## Executive summary

The site already avoids the worst AI landing-page patterns. Case studies name specific services, tradeoffs, and constraints (Lambda limits, Parquet reuse, TBD labels). That specificity is a strength worth keeping.

The main gaps are **positioning**, not polish:

1. The homepage reads like a strong résumé, not a client-facing introduction. A visitor learns what Jonathan has done, but not clearly **who he helps**, **what problems he takes on**, or **how to start a conversation** beyond a generic contact form.
2. Several high-visibility strings use **insider jargon** ("Solutions Architect lens," "product-grade," "table stakes") or **marketing cadence** ("platform tax," "thrilled to announce") that undercut the calm, credible voice you want.
3. **Em dashes** appear in key homepage and playground copy; your style guide asks to avoid them.
4. There is **no dedicated services, audience, process, FAQ, or privacy** copy. Those are content gaps for Jonathan to fill, not for AI to invent.

---

## Proposed revisions

### Homepage and global metadata

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/src/app/components/home/about-me/index.tsx` | I'm Jonathan, a Solutions Architect–track GIS engineer with 15+ years designing cloud and enterprise geospatial systems for CDC, utilities, and federal clients. I choose platforms and services — ArcGIS, AWS, and spatial data pipelines — so maps become scalable products. | Opens like a résumé summary; em dashes; "scalable products" is vague product-marketing language; self-centered framing | I help public-sector and utility teams design geospatial systems on ArcGIS and AWS: databases, ETL, web maps, and the cloud services behind them. I have 15+ years doing this work for CDC programs, a major utility, and federal agencies. | Shifts to client problem first; removes em dashes and vague "scalable products"; keeps named sectors | No |
| `HTML/src/app/components/home/about-me/index.tsx` | Currently Geospatial Engineer at INCATech. Previously DRT Strategies (CDC), National Grid, U.S. Census Bureau, C2 Solutions, and Booz Allen Hamilton (FEMA/DHS). Studying for AWS Solutions Architect – Associate; shipping cloud-backed tools at Vector Scope AI. | Reads like a CV footer; mixes employment, certification study, and side business without explaining what Vector Scope AI is | I am a Geospatial Engineer at INCATech. Before that I worked at DRT Strategies (CDC), National Grid, the U.S. Census Bureau, C2 Solutions, and Booz Allen Hamilton (FEMA/DHS). I am studying for AWS Solutions Architect – Associate and building side projects through Vector Scope AI LLC. | Shorter sentences; clearer W-2 vs personal LLC distinction; less list-like | Yes — confirm Vector Scope AI LLC should be named and whether it represents consulting availability |
| `HTML/src/app/components/home/featured-work/index.tsx` | Case studies in how cloud platforms and services ship a product — the Solutions Architect lens, not a feature checklist. | Em dash; "Solutions Architect lens" is insider jargon; assumes reader knows SA hiring context | Each project explains a platform choice: why Docker instead of Lambda, why one Parquet file feeds both map and wiki, and what broke along the way. | Concrete preview of what the reader will get; removes jargon | No |
| `HTML/src/app/layout.tsx` | Solutions Architect–track GIS engineer. 15+ years designing enterprise geospatial systems on ArcGIS, AWS, and spatial data platforms for CDC, utilities, and federal clients. | Mirrors résumé summary; "enterprise geospatial systems" and "spatial data platforms" stack abstractions | GIS engineer with 15+ years building ArcGIS and AWS systems for CDC, utilities, and federal clients. Case studies and side projects on this site. | Search/snippet copy should match homepage voice; shorter | No |
| `HTML/src/app/components/home/hero-section/index.tsx` | Get in touch | Acceptable but generic; does not signal what happens next | Ask about a project | More concrete CTA for prospective clients/collaborators | No |
| `HTML/src/app/components/home/contact/index.tsx` | Get in touch | Same as hero; no guidance on what to write | Start a conversation | Pairs with improved form intro (see content gaps) | No |
| `HTML/src/app/components/home/contact/index.tsx` | Your message | Placeholder gives no context | Briefly describe your project, role, or question | Helps visitors know what belongs in the form | No |
| `HTML/src/app/components/home/platform-labs/index.tsx` | Same hub pattern for each stack — why I use it, what I've built, and what's coming next. | Em dash; "hub pattern" is site-internal jargon | Each link opens a short write-up: when I pick that platform, what I have built with it, and what is still in progress. | Plain language for non-specialists | No |
| `HTML/src/app/components/home/side-projects/index.tsx` | Maps, tools, and experiments — GIS craft alongside the cloud architecture work above. | Em dash; fine but slightly formulaic | Maps, tools, and experiments from cartography and GIS work that sit alongside the cloud case studies above. | Slightly clearer; removes em dash | No |

### Case studies and experience data

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/src/data/site-data.ts` | End-to-end cloud architecture you can click through — proof of designing, deploying, and operating a full static+serverless product. | Em dash; "proof of" sounds self-congratulatory | You can click through the full stack on this site: static hosting, DNS, a serverless counter API, and the IaC/CI pipeline that deploys it. | Describes what the reader can verify; removes self-evaluation | No |
| `HTML/src/data/site-data.ts` | Composed managed AI services instead of a custom ML stack so learners get pronunciation feedback from a lightweight serverless architecture. | "Composed managed AI services" is slightly consultant-speak; otherwise specific | Used Transcribe and Bedrock instead of a custom ML stack so learners get pronunciation feedback from a small serverless setup. | Plain verbs; keeps factual services | No |
| `HTML/src/data/site-data.ts` | Holding the design pattern for versioned, queryable map updates across Esri and cloud analytics stacks until the product ships. | Abstract; "holding the design pattern" is vague | Documents the planned design for versioned map edits across ArcGIS and cloud analytics. The product is not built yet. | Honest TBD framing; clearer for clients | No |
| `HTML/src/data/site-data.ts` | Supported situational awareness and decision-making during major disaster operations | Generic federal résumé phrasing; no concrete detail | Built maps and spatial workflows used during major FEMA and DHS disaster operations. | Keeps scope honest without inflated "decision-making" claim | Yes — confirm this wording is acceptable for public site vs. résumé |
| `HTML/src/data/site-data.ts` | Design, build, and maintain enterprise geodatabases and geospatial workflows with ArcGIS Enterprise, Online, and Desktop for IC and USPIS missions | "IC" may be opaque to non-government readers; mission names may be sensitive | Design, build, and maintain geodatabases and geospatial workflows with ArcGIS Enterprise, Online, and Desktop for federal law-enforcement and postal missions. | More readable if mission names cannot be expanded publicly | Yes — confirm IC/USPIS can appear on a public site or should stay abbreviated |

### Platform playground hubs (shared patterns)

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/public/maptiler-playground/index.html` | Maps without the platform tax | Catchy marketing headline; "platform tax" is startup idiom | Maps without stacking multiple vendors | Same idea in plain language | No |
| `HTML/public/mapbox-playground/index.html` | Vector maps when the UX has to feel product-grade. | "product-grade" is buzzword-heavy | Vector maps when the interface needs to feel polished and fast. | Removes banned-adjacent marketing term | No |
| `HTML/public/aws-playground/index.html` | Cloud architecture with a GIS engineer's bias toward working systems. | Strong, human line; minor note: "bias toward" is slightly clever | Cloud architecture from a GIS engineer who cares that systems actually run in production. | Slightly clearer for non-engineers | No |
| `HTML/public/aws-playground/index.html` | Knowing cache behaviors, OAC, and DNS quirks is table stakes for Solutions Architects. | "table stakes" is insider jargon; audience on AWS playground may be technical, but phrase excludes GIS hiring managers | Knowing cache behaviors, OAC, and DNS quirks comes up on almost every static-site architecture review. | Keeps point without SA-exam slang | No |
| `HTML/public/esri-playground/index.html` | TS/SCI environments, Portal auth, and network isolation change how you design maps. This hub will document those constraints honestly. | TS/SCI claim on public site may overstate or misrepresent clearance | Portal auth, network isolation, and classified-environment constraints change how you design maps. This hub will document those constraints honestly. | Removes specific clearance label unless verified for public marketing | Yes — confirm TS/SCI can be referenced on a public personal site |
| `HTML/public/azure-playground/index.html` | I've migrated utility GIS datasets to cloud-hosted ArcGIS Enterprise on Azure — same GIS outcomes, different control plane. | First-person claim ties to National Grid work; verify Azure vs AWS hosting detail | I migrated utility GIS datasets to cloud-hosted ArcGIS Enterprise (Azure-based hosting in that engagement). | More precise if migration was Azure-specific | Yes — confirm National Grid migration was on Azure, not another cloud |
| All playground `index.html` files (labs section) | Mapping and cloud playgrounds — each hub explains why I use the platform and links demos as they ship. | Repeated verbatim across 7 hubs; formulaic symmetry | (Per hub, vary slightly) Example for MapTiler: "Other mapping and cloud stacks I work with. Each page explains when I choose it and links to demos." | Breaks template repetition | No |
| `HTML/public/azure-playground/index.html` | Multi-cloud fluency | Consultant phrase | Working across AWS, Azure, and GCP when the client's estate requires it. | Client-centered; removes "fluency" buzzword | No |
| `HTML/public/gcp-playground/index.html` | The point of this lab isn't GCP-only loyalty — it's knowing when BigQuery beats Athena, or when Maps Platform beats MapLibre. | Conversational and good; em dash | The point of this lab is not picking one cloud. It is knowing when BigQuery beats Athena, or when Maps Platform beats MapLibre. | Removes em dash | No |

### Cloud Resume Challenge blog

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/src/app/cloud-resume-challenge/page.tsx` | Hello everyone, I'm Jonathan. | Blog-opener tone; less professional than rest of site | I am Jonathan Witcoski. | Calmer, professional | No |
| `HTML/src/app/cloud-resume-challenge/page.tsx` | utilizing products already produced in cloud services rather than designing them | "utilizing" is on banned list | using cloud products other teams had built rather than designing the architecture myself | Plain language | No |
| `HTML/src/app/cloud-resume-challenge/page.tsx` | After two years of effort, I'm thrilled to announce that I've completed the challenge! | Exclamation point; "thrilled to announce" is marketing/LinkedIn cadence | After two years of on-and-off work, I finished the challenge in 2024. | Factual, calm; verify completion year | Yes — confirm completion year (text says "After two years" but timeline sections span 2021–2024) |
| `HTML/src/app/cloud-resume-challenge/page.tsx` | Feel free to reach out if you have any questions about Cloud Computing, GIS, or Skiing! | Casual; exclamation; mixes professional topics with hobby | Reach out if you have questions about cloud architecture, GIS, or any project on this site. | Professional close; removes exclamation | No |

### Downloadable résumé (public PDF source)

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/public/Jonathan_Witcoski_Resume_2026.md` | Senior GIS Developer with 15+ years building enterprise ArcGIS web applications, spatial databases, and automated geospatial workflows for federal agencies and utilities. Strong match for ArcGIS Enterprise/Online/Pro, Python, JavaScript, SQL, SQL Server, PostgreSQL/PostGIS, and REST API development. | "Strong match for" is job-application language, not consulting voice; stacks technologies | Senior GIS developer with 15+ years building ArcGIS web applications, spatial databases, and automated workflows for federal agencies and utilities. Core tools: ArcGIS Enterprise/Online/Pro, Python, JavaScript, SQL, SQL Server, PostgreSQL/PostGIS, REST APIs. | Résumé summary should still read human when downloaded from a consulting site | No |

### AWS study section (UI chrome only)

| File path | Current text | AI-like, vague, or credibility issue (`ai-check`) | Proposed revision (`humanize`) | Reason for the change | Verification needed |
|-----------|--------------|-----------------------------------------------------|--------------------------------|----------------------|---------------------|
| `HTML/src/app/aws-solutions-architect-study/page.tsx` | This page is my public study log: what I already know from those systems, what I don't, and exactly what I'm doing each night to close the gap. | Good, honest tone; no change required | *(keep as is)* | Models credible self-assessment; supports SA transition narrative | No |

### Copy that passed review (no change recommended)

These strings already meet the target voice: specific, credible, and human.

- Hero tagline: **Solutions Architect · GIS & Cloud**
- Featured work project descriptions in `site-data.ts` (Global Ski Atlas, ywiki, Learn Bosnian) — concrete service names and tradeoffs
- Side project blurbs — short, factual, no hype
- History page intro — honest archive framing
- Contact success/error messages — clear and neutral
- Footer copyright and links — fine
- Esri Validation Desk demo copy — practical, rule-based language

---

## Questions requiring verification

1. **"Professor" framing:** Your brief references a professor's academic background. The site lists an M.S. in Geography (2007), archaeology field work, and geographer/GIS roles. There is no professor title, university affiliation as faculty, or teaching portfolio on the site. Should any copy reference teaching/advising, or was "professor" meant as a voice reference only?

2. **Consulting vs employment:** Is Vector Scope AI LLC an active consulting practice open to clients, a project studio, or a placeholder for future work? The homepage mentions it in one line but does not describe services, availability, or engagement model.

3. **IC / USPIS mission naming:** Can INCATech role copy name IC and USPIS on a public website, or should it use broader descriptors?

4. **TS/SCI reference:** Esri playground copy mentions TS/SCI environments. Can that appear on a public personal site?

5. **Azure at National Grid:** Azure playground states utility GIS migration on Azure. Résumé and `site-data.ts` say "cloud-hosted ArcGIS Enterprise" without naming Azure. Which is accurate for public copy?

6. **15+ years experience:** Employment starts October 2009 (Booz Allen). As of August 2026 that is closer to 17 years. Is "15+" intentional rounding, or should copy use a different figure?

7. **DRT Strategies end date:** `site-data.ts` lists 2022–2026; About Me says "Previously DRT Strategies (CDC)." Is the role fully ended, and is 2026 accurate for public display?

8. **AWS SAA-C03 status:** Education lists "In progress" with date 2026. Study page says started June 2026. Should the homepage/education still say "studying for" if the exam is passed or scheduled?

9. **Cloud Resume Challenge completion date:** Opening paragraph says "After two years" and "completed" but section headers span 2021–2024+. What year should public copy cite as completion?

10. **Client logos and names:** CDC, National Grid, Census, FEMA/DHS, and Booz Allen appear by name. Confirm all are approved for a personal portfolio site (not implied endorsement).

11. **Consulting availability:** Should the site state whether Jonathan accepts contract work, advisory calls, speaking, or only full-time roles? No copy currently addresses this.

12. **FEMA bullet wording:** Proposed revision softens "decision-making" language. Confirm acceptable balance between impact and accuracy.

---

## Five highest-impact revisions

1. **Rewrite the About Me headline (`about-me/index.tsx`)** — This is the only place that explains who Jonathan is and what he does. Shifting from résumé-summary voice to client-problem voice ("I help public-sector and utility teams…") is the single biggest clarity win for prospective clients and hiring managers.

2. **Add a short "Who I work with / How to engage" block on the homepage** — Not a rewrite; new copy Jonathan must author. Without it, the site answers "what have you built?" but not "is this for me?" or "what happens if I contact you?"

3. **Replace the Cloud architecture section intro (`featured-work/index.tsx`)** — Removes insider "Solutions Architect lens" jargon and tells visitors what they will actually read in the case studies.

4. **Clarify Vector Scope AI LLC and consulting status in About Me** — Prevents readers from guessing whether the site represents employability only, side projects, or billable consulting.

5. **Tone-edit the Cloud Resume Challenge opening (`cloud-resume-challenge/page.tsx`)** — Remove "utilizing," "thrilled to announce," and exclamation-mark enthusiasm so the longest narrative page on the site matches the calm professional voice of the homepage.

---

## Recommended site voice statement

> I write as a GIS engineer moving into solution architecture: direct, specific, and focused on the client's problem. I name platforms, services, and tradeoffs. I describe what I built and what I would do differently, without promising outcomes I cannot verify. I keep academic and archaeology work in the archive, employment on the timeline, and experiments labeled honestly when they are not production systems. I use "I" when speaking as the practitioner and "you" when describing your next step.

---

## Content gaps (for Jonathan to fill — do not invent)

These are missing from the site today. AI should not draft them without your facts.

1. **Who the work is for** — A short audience paragraph: federal GIS teams, utilities, public-health mapping groups, cloud/architecture hiring managers, etc. Be explicit about who should *not* expect a fit (e.g., consumer app startups) if that is true.

2. **What you help with** — Even three bullets help: e.g., ArcGIS Enterprise architecture, AWS migration for geospatial pipelines, web map/dashboard delivery. Distinct from the job-history timeline.

3. **How engagements work** — Full-time roles vs contract vs advisory; typical first call; whether you work through Vector Scope AI LLC; geographic/remote constraints; response time you can actually meet.

4. **Contact form guidance** — One sentence above the form: what to include (organization, problem, timeline, role you are hiring for).

5. **Consulting vs W-2 vs research/teaching** — If you advise students, teach, or publish, say how that differs from paid client work.

6. **Testimonials or references** — None exist on the site. Do not add unless real quotes are provided.

7. **FAQ** — Common questions: clearance, Esri vs open stack, AWS certification status, availability, types of projects you decline.

8. **Privacy / contact data use** — Formspree submits name, email, and message. A brief privacy note is absent (even one paragraph).

9. **Services page or section label** — The site has case studies but no "Services" or "Work with me" heading. Visitors must infer offerings from experience bullets.

10. **Outcome metrics for case studies** — Projects describe architecture well but rarely state observable results (uptime, data volume, user count, delivery time). Add only verified numbers.

---

## Out of scope / lower priority

| Content | Note |
|---------|------|
| `HTML/study-lab/*.md` and quiz JSON | Exam prep; different audience; audit separately if desired |
| Demo UI inside playgrounds (ski drive-time labels, validation desk rules) | Functional microcopy; mostly fine |
| `HTML/public/archive/python/*` | Legacy notebook exports; historical |
| SEO metadata beyond `layout.tsx` page titles | Per your instructions, not modified in this audit |
| `/workspace/show/` | Unrelated HTML5 template; not part of live site |

---

## Next steps

1. Review this document and answer the verification questions.
2. Approve, edit, or reject proposed revisions table by table.
3. Provide copy for content gaps (audience, services, engagement model) or explicitly defer them.
4. After approval, apply approved changes only to user-facing English strings in the listed files.
