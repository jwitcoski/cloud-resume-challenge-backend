/**
 * Generates platform playground hub pages from a shared template.
 * Run: node scripts/generate-playground-hubs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const labs = [
  { id: "maptiler", href: "/maptiler-playground/", label: "MapTiler", kind: "Maps" },
  { id: "mapbox", href: "/mapbox-playground/", label: "Mapbox", kind: "Maps" },
  { id: "esri", href: "/esri-playground/", label: "Esri", kind: "Maps" },
  { id: "google-maps", href: "/google-maps-playground/", label: "Google Maps", kind: "Maps" },
  { id: "aws", href: "/aws-playground/", label: "AWS", kind: "Cloud" },
  { id: "azure", href: "/azure-playground/", label: "Azure", kind: "Cloud" },
  { id: "gcp", href: "/gcp-playground/", label: "GCP", kind: "Cloud" },
];

function labsHtml(currentId) {
  return labs
    .map((lab) => {
      const current = lab.id === currentId ? " is-current" : "";
      const aria = lab.id === currentId ? ' aria-current="page"' : "";
      return `        <a class="lab-chip${current}" href="${lab.href}"${aria}>
          <strong>${lab.label}</strong>
          <span>${lab.kind}</span>
        </a>`;
    })
    .join("\n");
}

function workHtml(items) {
  return items
    .map((item) => {
      if (item.soon) {
        return `        <div class="work is-soon">
          <div class="work-visual fallback">${item.fallback || item.title}</div>
          <div class="work-body">
            <p class="work-meta">${item.meta}</p>
            <h3 class="work-title">${item.title}</h3>
            <p class="work-desc">${item.desc}</p>
            <span class="work-go">Coming soon</span>
          </div>
        </div>`;
      }
      const target = item.external ? ' target="_blank" rel="noopener"' : "";
      const visual = item.image
        ? `<div class="work-visual">
            <img src="${item.image}" alt="${item.alt || item.title}" width="640" height="400" loading="lazy" />
          </div>`
        : `<div class="work-visual fallback">${item.fallback || item.title}</div>`;
      return `        <a class="work" href="${item.href}"${target}>
          ${visual}
          <div class="work-body">
            <p class="work-meta">${item.meta}</p>
            <h3 class="work-title">${item.title}</h3>
            <p class="work-desc">${item.desc}</p>
            <span class="work-go">${item.cta} →</span>
          </div>
        </a>`;
    })
    .join("\n\n");
}

function reasonsHtml(reasons) {
  return reasons
    .map(
      (r) => `        <article class="reason">
          <h3>${r.title}</h3>
          <p>${r.body}</p>
        </article>`
    )
    .join("\n");
}

function page(cfg) {
  const brandHtml = cfg.brandLines
    .map((line, i) => (i === 0 ? line : `<span>${line}</span>`))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${cfg.title}</title>
  <meta name="description" content="${cfg.description}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/playground-shared.css" />
  <style>
    :root {
      --ink: ${cfg.theme.ink};
      --muted: ${cfg.theme.muted};
      --line: ${cfg.theme.line};
      --accent: ${cfg.theme.accent};
      --accent-ink: ${cfg.theme.accentInk};
      --deep: ${cfg.theme.deep};
      --warm: ${cfg.theme.warm};
      --hero-glow: ${cfg.theme.heroGlow};
      --main-glow: ${cfg.theme.mainGlow};
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-canvas" aria-hidden="true"></div>
    <div class="hero-veil"></div>
    <div class="topo" aria-hidden="true"></div>

    <nav class="nav" aria-label="Primary">
      <a class="home" href="/">Witcoski Tech</a>
      <div class="nav-links">
        <a href="#why">${cfg.whyNav}</a>
        <a href="#work">Work</a>
        <a href="#labs">All labs</a>
        <a href="${cfg.vendorHref}" target="_blank" rel="noopener">${cfg.vendorLabel}</a>
      </div>
    </nav>

    <div class="hero-inner">
      <h1 class="brand">${brandHtml}</h1>
      <p class="headline">${cfg.headline}</p>
      <p class="lede">${cfg.lede}</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#work">See what's here</a>
        <a class="btn btn-ghost" href="#why">${cfg.whyNav}</a>
      </div>
    </div>
    <p class="map-credit">${cfg.credit}</p>
  </header>

  <main>
    <section class="section" id="why">
      <p class="eyebrow">${cfg.whyEyebrow}</p>
      <h2>${cfg.whyTitle}</h2>
      <p class="section-intro">${cfg.whyIntro}</p>
      <div class="reasons">
${reasonsHtml(cfg.reasons)}
      </div>
    </section>

    <section class="section" id="work">
      <p class="eyebrow">${cfg.workEyebrow}</p>
      <h2>${cfg.workTitle}</h2>
      <p class="section-intro">${cfg.workIntro}</p>
      <div class="work-list">
${workHtml(cfg.work)}
      </div>
      <div class="links-strip">
${cfg.links.map((l) => `        <a href="${l.href}"${l.external ? ' target="_blank" rel="noopener"' : ""}>${l.label}</a>`).join("\n")}
      </div>
    </section>

    <section class="section" id="labs">
      <p class="eyebrow">Platform labs</p>
      <h2>Same pattern, more stacks</h2>
      <p class="section-intro">
        Mapping and cloud playgrounds — each hub explains why I use the platform and links demos as they ship.
      </p>
      <div class="labs">
${labsHtml(cfg.id)}
      </div>
    </section>
  </main>

  <footer class="site-foot">
    <span>${cfg.footerLabel} · Jonathan Witcoski</span>
    <span>
      <a href="https://linkedin.com/in/jonathanwitcoski" target="_blank" rel="noopener">LinkedIn</a>
      ·
      <a href="/">Home</a>
    </span>
  </footer>
</body>
</html>
`;
}

const hubs = [
  {
    id: "mapbox",
    dir: "mapbox-playground",
    title: "Mapbox Playground — Jonathan Witcoski",
    description: "Mapbox GL JS ski drive-time, constellation clustering, and powder-day Directions.",
    brandLines: ["Map", "box"],
    headline: "Vector maps when the UX has to feel product-grade.",
    lede: "Ski drive-time isochrones, clustered resort UX, and powder-day routing — Mapbox APIs beside GL JS.",
    whyNav: "Why Mapbox",
    whyEyebrow: "Why Mapbox",
    whyTitle: "Style control at GL speed",
    whyIntro:
      "Mapbox is often the default when stakeholders already know Studio, or when a client needs tight control over look, navigation, and mobile SDKs alongside the web.",
    reasons: [
      {
        title: "Studio + GL JS",
        body: "Design once in Studio, ship everywhere with Mapbox GL JS — styles, expressions, and 3D buildings transfer cleanly into production apps.",
      },
      {
        title: "Navigation & search",
        body: "Directions, Matrix, Isochrone, and Search sit beside the map SDK — useful when the map is a workflow, not just a basemap.",
      },
      {
        title: "Agent skills",
        body: "Official mapbox-agent-skills teach assistants token security and geospatial API choice — graded in the Map Agent Arena.",
      },
      {
        title: "Contrast with MapLibre",
        body: "I also build on MapLibre/MapTiler. This lab keeps Mapbox-specific patterns honest — and documents when I'd pick which.",
      },
    ],
    workEyebrow: "Built with Mapbox",
    workTitle: "Playground projects",
    workIntro: "Drive-time, constellation clustering, and powder-day routing on this site; agent graders live in the Map Agent Arena.",
    work: [
      {
        href: "./ski-drive-time/",
        image: "/images/feature-work/ski-drive-time.png",
        alt: "Ski drive-time isochrones from Denver",
        meta: "Demo · Isochrone · Matrix",
        title: "Ski resorts by drive time",
        desc: "Road-network isochrones + Matrix ETAs — an improved take on the Global Ski Atlas drive-time map.",
        cta: "Open demo",
      },
      {
        href: "./resort-constellation/",
        image: "/images/feature-work/resort-constellation.png",
        alt: "Clustered ski resort constellation map",
        meta: "Demo · Cluster · Feature-state",
        title: "Resort constellation",
        desc: "Clustered ski resorts with hover feature-state — the GL JS UX pattern behind atlas-scale point layers.",
        cta: "Open demo",
      },
      {
        href: "./powder-day-route/",
        image: "/images/feature-work/powder-day-route.png",
        alt: "Powder-day driving route to Breckenridge",
        meta: "Demo · Directions · Geocoding",
        title: "Powder-day route",
        desc: "Home → resort Directions with traffic and a 9am first-chair leave-by time. Isochrone vs one chosen path.",
        cta: "Open demo",
      },
      {
        href: "https://jwitcoski.github.io/map-agent-arena/",
        external: true,
        image: "/images/feature-work/maptiler-agent-grader.png",
        alt: "Map Agent Arena",
        meta: "External · Agent eval",
        title: "Map Agent Arena",
        desc: "Royal Rumble + Mapbox/MapTiler skill graders — split into their own GitHub project.",
        cta: "Open arena",
      },
    ],
    links: [
      { href: "https://docs.mapbox.com/", label: "Mapbox docs", external: true },
      { href: "https://jwitcoski.github.io/map-agent-arena/", label: "Map Agent Arena", external: true },
      { href: "/maptiler-playground/", label: "MapTiler playground" },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://www.mapbox.com/",
    vendorLabel: "mapbox.com",
    credit: "Mapbox playground · GL JS demos",
    footerLabel: "Mapbox Playground",
    theme: {
      ink: "#eef2ff",
      muted: "#9aa3c7",
      line: "rgba(238, 242, 255, 0.14)",
      accent: "#7aa2ff",
      accentInk: "#0a1020",
      deep: "#070b16",
      warm: "#f0c14d",
      heroGlow: "rgba(122, 162, 255, 0.16)",
      mainGlow: "rgba(122, 162, 255, 0.07)",
    },
  },
  {
    id: "esri",
    dir: "esri-playground",
    title: "Esri Playground — Jonathan Witcoski",
    description: "ArcGIS Maps SDK validation desk and enterprise GIS patterns from federal and utility work.",
    brandLines: ["Esri", "ArcGIS"],
    headline: "Enterprise GIS where the system of record still wins.",
    lede: "ArcGIS Enterprise, Online, Pro, and the Maps SDK for JavaScript — the stack behind CDC, utility, Census, and IC/DoD work I've shipped for 15+ years.",
    whyNav: "Why Esri",
    whyEyebrow: "Why Esri",
    whyTitle: "When ArcGIS is the architecture",
    whyIntro:
      "Most of my career lives here: Portal, Server, geodatabases, Python ETL, and secure web maps. This lab is where I show modern Maps SDK patterns on top of that foundation.",
    reasons: [
      {
        title: "System of record",
        body: "Feature services, enterprise geodatabases, and identity — Esri still owns the operational GIS layer for many federal and utility orgs.",
      },
      {
        title: "Maps SDK for JS",
        body: "Modern web clients can sit on the same services as ArcGIS Pro. I use that bridge for dashboards, editing tools, and Vector Ledger–style workflows.",
      },
      {
        title: "Python + geoprocessing",
        body: "ArcPy, REST admin APIs, and scheduled ETL remain how large agencies keep layers trustworthy at scale.",
      },
      {
        title: "Security context",
        body: "TS/SCI environments, Portal auth, and network isolation change how you design maps. This hub will document those constraints honestly.",
      },
    ],
    workEyebrow: "Built with Esri",
    workTitle: "Playground projects",
    workIntro: "Live client work stays private. Public demos show the Maps SDK patterns behind Vector Ledger — without Portal secrets.",
    work: [
      {
        href: "./validation-desk/",
        fallback: "Validation",
        meta: "Demo · Maps SDK · Validation",
        title: "Validation Desk",
        desc: "Propose ski ops-note edits on a client-side FeatureLayer — domain, Colorado AOI, and uniqueness checks before accept. Vector Ledger lite.",
        cta: "Open demo",
      },
      {
        href: "https://vectorscopeai.com",
        external: true,
        image: "/images/feature-work/VectorLedger_AWS_ESRI_Architecture.png",
        alt: "Vector Ledger architecture",
        meta: "Product · ArcGIS · Lakehouse",
        title: "Vector Ledger",
        desc: "ArcGIS-connected editing and validation with lakehouse patterns — Iceberg, GeoParquet, and changelog history.",
        cta: "Visit Vector Scope AI",
      },
      {
        href: "https://jwitcoski.github.io/map-agent-arena/",
        external: true,
        fallback: "Arena",
        meta: "External · Agent eval",
        title: "Map Agent Arena",
        desc: "Esri seat is pending API packs — compare live seats in the dedicated arena repo.",
        cta: "Open arena",
      },
    ],
    links: [
      { href: "https://developers.arcgis.com/", label: "ArcGIS developers", external: true },
      { href: "https://jwitcoski.github.io/map-agent-arena/", label: "Map Agent Arena", external: true },
      { href: "https://vectorscopeai.com", label: "Vector Scope AI", external: true },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://www.esri.com/",
    vendorLabel: "esri.com",
    credit: "Esri / ArcGIS playground · Maps SDK validation desk",
    footerLabel: "Esri Playground",
    theme: {
      ink: "#e8f4f8",
      muted: "#8fadb8",
      line: "rgba(232, 244, 248, 0.14)",
      accent: "#3dd6c6",
      accentInk: "#04201c",
      deep: "#06141a",
      warm: "#f4a261",
      heroGlow: "rgba(61, 214, 198, 0.14)",
      mainGlow: "rgba(61, 214, 198, 0.06)",
    },
  },
  {
    id: "google-maps",
    dir: "google-maps-playground",
    title: "Google Maps Playground — Jonathan Witcoski",
    description: "Google Maps Platform — Places around ski resorts as a companion to Mapbox drive-time.",
    brandLines: ["Google", "Maps"],
    headline: "Familiar basemaps when the audience expects Google.",
    lede: "Maps JavaScript API, Places, Routes, and geometry libraries — strong when UX familiarity and Google's POI graph matter more than open styles.",
    whyNav: "Why Google Maps",
    whyEyebrow: "Why Google Maps",
    whyTitle: "Ubiquity as a feature",
    whyIntro:
      "Google Maps is what most users already know how to pan and search. I reach for it when product familiarity and Places data outweigh MapLibre-style open tiling.",
    reasons: [
      {
        title: "User muscle memory",
        body: "Store locators, trip planners, and consumer apps often convert better when the map already feels like Google.",
      },
      {
        title: "Places & POIs",
        body: "Rich place data and autocomplete save months of gazetteer work — when licensing fits the project.",
      },
      {
        title: "Routes & mobility",
        body: "Directions and distance matrix APIs pair cleanly with product backends and mobile clients.",
      },
      {
        title: "Know the tradeoffs",
        body: "Closed styles and pricing tiers push some GIS workloads elsewhere. This lab documents when Google is — and isn't — the right call.",
      },
    ],
    workEyebrow: "Built with Google Maps",
    workTitle: "Playground projects",
    workIntro: "Product-map patterns that contrast with MapLibre/MapTiler — especially when Google’s POI graph is the point.",
    work: [
      {
        href: "./after-the-powder/",
        fallback: "After Powder",
        meta: "Demo · Places Nearby · Autocomplete",
        title: "After the Powder",
        desc: "Lodging, parking, and hospitals around Rockies resorts — companion to Mapbox ski drive-time. Same product, Places strength.",
        cta: "Open demo",
      },
      {
        href: "/mapbox-playground/ski-drive-time/",
        fallback: "Drive Time",
        meta: "Companion · Mapbox Isochrone",
        title: "Ski drive-time (Mapbox)",
        desc: "Road-network reachable sets — the “can I get there” half of the After the Powder story.",
        cta: "Open Mapbox demo",
      },
      {
        href: "https://jwitcoski.github.io/map-agent-arena/",
        external: true,
        fallback: "Arena",
        meta: "External · Agent eval",
        title: "Map Agent Arena",
        desc: "Cross-vendor agent rubix — Google can take a seat when Maps Platform keys land.",
        cta: "Open arena",
      },
    ],
    links: [
      { href: "https://developers.google.com/maps", label: "Google Maps Platform docs", external: true },
      { href: "https://jwitcoski.github.io/map-agent-arena/", label: "Map Agent Arena", external: true },
      { href: "/maptiler-playground/", label: "MapTiler playground" },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://mapsplatform.google.com/",
    vendorLabel: "mapsplatform.google.com",
    credit: "Google Maps playground · Places around ski resorts",
    footerLabel: "Google Maps Playground",
    theme: {
      ink: "#eef3ff",
      muted: "#9aa8c4",
      line: "rgba(238, 243, 255, 0.14)",
      accent: "#8ab4f8",
      accentInk: "#0b1220",
      deep: "#0c111b",
      warm: "#fdd663",
      heroGlow: "rgba(138, 180, 248, 0.16)",
      mainGlow: "rgba(138, 180, 248, 0.07)",
    },
  },
  {
    id: "aws",
    dir: "aws-playground",
    title: "AWS Playground — Jonathan Witcoski",
    description: "AWS architecture labs — Cloud Resume Challenge, SAA study plan, and serverless GIS patterns.",
    brandLines: ["Amazon", "Web Services"],
    headline: "Cloud architecture with a GIS engineer's bias toward working systems.",
    lede: "S3, CloudFront, Lambda, API Gateway, DynamoDB, and the rest of the Well-Architected toolbox — practiced on this site and Global Ski Atlas.",
    whyNav: "Why AWS",
    whyEyebrow: "Why AWS",
    whyTitle: "Build, measure, certify",
    whyIntro:
      "AWS is where I learned cloud by shipping: this resume site, visitor counters, and ski-atlas pipelines. The SAA study plan turns that production muscle into exam-ready architecture judgment.",
    reasons: [
      {
        title: "Serverless GIS backends",
        body: "Lambda + API Gateway + DynamoDB is still the fastest path from a map idea to a durable API — the Cloud Resume Challenge pattern scaled up.",
      },
      {
        title: "Edge + static frontends",
        body: "S3 and CloudFront host this site. Knowing cache behaviors, OAC, and DNS quirks is table stakes for Solutions Architects.",
      },
      {
        title: "Study against real stacks",
        body: "My SAA nights map to production patterns from Global Ski Atlas and this site — not slide-only learning.",
      },
      {
        title: "IaC discipline",
        body: "SAM templates and CI/CD for the visitor counter taught me to treat infrastructure like code — and to separate frontend from backend deploys.",
      },
    ],
    workEyebrow: "Built on AWS",
    workTitle: "Playground projects",
    workIntro: "These pages are the AWS lab today — more architecture diagrams and mini-labs will join them.",
    work: [
      {
        href: "/cloud-resume-challenge/",
        image: "/images/cloud-resume-challenge/CloudResumeArchitecture.png",
        alt: "Cloud Resume Challenge architecture",
        meta: "Journey · S3 · CloudFront · Lambda · DynamoDB",
        title: "Cloud Resume Challenge",
        desc: "The full story behind this site — DNS rabbit holes, the visitor counter, SAM, and CI/CD.",
        cta: "Read the journey",
      },
      {
        href: "/aws-solutions-architect-study.html",
        fallback: "SAA-C03",
        meta: "Study · SAA-C03 · Labs",
        title: "Solutions Architect study plan",
        desc: "Nightly guides and quizzes aimed at AWS Solutions Architect – Associate, tied to real project patterns.",
        cta: "Open the study plan",
      },
      {
        href: "https://globalskiatlas.com",
        external: true,
        image: "/images/feature-work/feature-img-1.jpg",
        alt: "Global Ski Atlas",
        meta: "Product · Serverless · ETL",
        title: "Global Ski Atlas on AWS",
        desc: "Step Functions, Lambda, DynamoDB, and S3 powering a live ski-resort map product.",
        cta: "Visit globalskiatlas.com",
      },
    ],
    links: [
      { href: "https://aws.amazon.com/architecture/", label: "AWS Architecture Center", external: true },
      { href: "/cloud-resume-challenge/#visitor-counter", label: "Visitor counter explained" },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://aws.amazon.com/",
    vendorLabel: "aws.amazon.com",
    credit: "AWS playground · witcoskitech.com",
    footerLabel: "AWS Playground",
    theme: {
      ink: "#f5f0e8",
      muted: "#b5a894",
      line: "rgba(245, 240, 232, 0.14)",
      accent: "#ff9900",
      accentInk: "#1a1000",
      deep: "#0f1216",
      warm: "#ffb84d",
      heroGlow: "rgba(255, 153, 0, 0.14)",
      mainGlow: "rgba(255, 153, 0, 0.06)",
    },
  },
  {
    id: "azure",
    dir: "azure-playground",
    title: "Azure Playground — Jonathan Witcoski",
    description: "Azure cloud GIS patterns — ArcGIS on Azure, identity, and migration lessons from utility work.",
    brandLines: ["Micro", "soft Azure"],
    headline: "Cloud GIS when the estate already lives in Microsoft.",
    lede: "Azure hosting for ArcGIS Enterprise, Entra ID, storage, and data migration — patterns from National Grid and federal-adjacent environments.",
    whyNav: "Why Azure",
    whyEyebrow: "Why Azure",
    whyTitle: "Enterprise identity meets geospatial",
    whyIntro:
      "Utility and agency estates often standardize on Microsoft. Azure becomes the natural home for ArcGIS Enterprise lifts, secure storage, and Entra-backed apps.",
    reasons: [
      {
        title: "ArcGIS on Azure",
        body: "I've migrated utility GIS datasets to cloud-hosted ArcGIS Enterprise on Azure — same GIS outcomes, different control plane.",
      },
      {
        title: "Identity first",
        body: "Entra ID (Azure AD) shapes how portals, dashboards, and APIs authenticate. Architecture has to start there, not with the map.",
      },
      {
        title: "Hybrid reality",
        body: "Many GIS estates stay hybrid for years. Azure ExpressRoute, private endpoints, and landing zones matter as much as the web map.",
      },
      {
        title: "Multi-cloud fluency",
        body: "Solutions Architects rarely get one cloud forever. This lab keeps Azure patterns sharp next to AWS and GCP.",
      },
    ],
    workEyebrow: "Built on Azure",
    workTitle: "Playground projects",
    workIntro: "Public Azure demos are next. Until then, this hub captures why the platform shows up in my utility and enterprise work.",
    work: [
      {
        soon: true,
        meta: "Lab · ArcGIS Enterprise · Azure",
        title: "Enterprise GIS landing zone notes",
        desc: "Reference notes for hosting ArcGIS on Azure — identity, storage, and network patterns without client secrets.",
        fallback: "Landing Zone",
      },
      {
        soon: true,
        meta: "Demo · Entra · Maps",
        title: "Identity-aware map shell",
        desc: "A minimal Azure-hosted map page that documents Entra sign-in patterns for GIS apps.",
        fallback: "Entra Map",
      },
    ],
    links: [
      { href: "https://learn.microsoft.com/azure/", label: "Azure docs", external: true },
      { href: "/aws-playground/", label: "AWS playground" },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://azure.microsoft.com/",
    vendorLabel: "azure.microsoft.com",
    credit: "Azure playground · demos coming soon",
    footerLabel: "Azure Playground",
    theme: {
      ink: "#eaf6ff",
      muted: "#8fadb8",
      line: "rgba(234, 246, 255, 0.14)",
      accent: "#50e6ff",
      accentInk: "#041820",
      deep: "#07101c",
      warm: "#ffb900",
      heroGlow: "rgba(80, 230, 255, 0.14)",
      mainGlow: "rgba(80, 230, 255, 0.06)",
    },
  },
  {
    id: "gcp",
    dir: "gcp-playground",
    title: "Google Cloud Playground — Jonathan Witcoski",
    description: "Google Cloud architecture labs — BigQuery geospatial, Cloud Run, and GCP + Google Maps patterns.",
    brandLines: ["Google", "Cloud"],
    headline: "Data-heavy GIS when analytics wants BigQuery.",
    lede: "BigQuery GIS, Cloud Run, Cloud Storage, and the Google Maps Platform adjacency — another cloud lens for Solutions Architect work.",
    whyNav: "Why GCP",
    whyEyebrow: "Why Google Cloud",
    whyTitle: "Analytics-native cloud",
    whyIntro:
      "GCP shines when geospatial joins warehouse-scale SQL. BigQuery geography types and Cloud Run services are a different shape than DynamoDB counters or ArcGIS Server farms.",
    reasons: [
      {
        title: "BigQuery GIS",
        body: "Spatial SQL at warehouse scale — powerful for analytics layers that don't need an enterprise geodatabase.",
      },
      {
        title: "Maps Platform adjacency",
        body: "Google Maps and GCP billing/projects often travel together. Knowing both sides helps when products span map UX and cloud data.",
      },
      {
        title: "Cloud Run simplicity",
        body: "Containerized geospatial APIs without managing clusters — a clean contrast to Lambda and App Service.",
      },
      {
        title: "Multi-cloud judgment",
        body: "The point of this lab isn't GCP-only loyalty — it's knowing when BigQuery beats Athena, or when Maps Platform beats MapLibre.",
      },
    ],
    workEyebrow: "Built on GCP",
    workTitle: "Playground projects",
    workIntro: "BigQuery and Cloud Run demos will land here as I expand beyond AWS-first labs.",
    work: [
      {
        soon: true,
        meta: "Lab · BigQuery · GIS",
        title: "Spatial SQL notebook",
        desc: "Annotated BigQuery geography queries — buffers, joins, and tiling exports for web maps.",
        fallback: "BigQuery GIS",
      },
      {
        soon: true,
        meta: "Demo · Cloud Run · GeoJSON",
        title: "Geo API on Cloud Run",
        desc: "A tiny geospatial API container — health checks, GeoJSON responses, and IAM notes.",
        fallback: "Cloud Run",
      },
    ],
    links: [
      { href: "https://cloud.google.com/docs", label: "Google Cloud docs", external: true },
      { href: "/google-maps-playground/", label: "Google Maps playground" },
      { href: "/", label: "Back to witcoskitech.com" },
    ],
    vendorHref: "https://cloud.google.com/",
    vendorLabel: "cloud.google.com",
    credit: "Google Cloud playground · demos coming soon",
    footerLabel: "GCP Playground",
    theme: {
      ink: "#f1f3f4",
      muted: "#9aa0a6",
      line: "rgba(241, 243, 244, 0.14)",
      accent: "#fbbc04",
      accentInk: "#1a1400",
      deep: "#111418",
      warm: "#ea4335",
      heroGlow: "rgba(251, 188, 4, 0.14)",
      mainGlow: "rgba(251, 188, 4, 0.06)",
    },
  },
];

// Fix accidental typo in azure muted if any
hubs.forEach((h) => {
  if (typeof h.theme.muted === "string") {
    h.theme.muted = h.theme.muted.replace(/\s+/g, "");
  }
});

for (const hub of hubs) {
  const dir = path.join(publicDir, hub.dir);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "index.html");
  fs.writeFileSync(out, page(hub), "utf8");
  console.log("wrote", path.relative(publicDir, out));
}
