export const skills = [
    { name: "AWS", level: "primary" as const },
    { name: "ArcGIS Enterprise", level: "primary" as const },
    { name: "Python", level: "primary" as const },
    { name: "PostgreSQL/PostGIS", level: "primary" as const },
    { name: "System Design", level: "primary" as const },
    { name: "REST APIs", level: "secondary" as const },
    { name: "JavaScript / React", level: "secondary" as const },
    { name: "ETL Automation", level: "secondary" as const },
    { name: "GeoParquet / PMTiles", level: "secondary" as const },
    { name: "CI/CD", level: "secondary" as const },
];

export const experienceData = [
    {
        initials: "INCA",
        role: "Geospatial Engineer | INCATech",
        location: "Northern Virginia",
        startYear: "2026",
        endYear: "Present",
        bulletPoints: [
            "Design, build, and maintain enterprise geodatabases and geospatial workflows with ArcGIS Enterprise, Online, and Desktop for U.S. Postal Inspection Service (USPIS) missions",
            "Automate spatial analysis, data validation, and ETL with Python and SQL across Oracle, SQL Server, and PostgreSQL",
            "Produce web maps and visualizations, and support GIS users with troubleshooting, migrations, and documentation"
        ]
    },
    {
        initials: "VS",
        role: "Founder | Vector Scope AI LLC",
        location: "Remote",
        startYear: "2025",
        endYear: "Present",
        bulletPoints: [
            "Ship Vector Scope AI on AWS with Cognito sign in, DynamoDB proposals and approvals, ECS convert and apply workers, and a versioned GeoParquet and PMTiles lake",
            "Ship Global Ski Atlas (3,000+ ski areas) as a live MapTiler web map with Docker/ECS ETL (OSM → Parquet/PMTiles → DynamoDB for ywiki)"
        ]
    },
    {
        initials: "DRT",
        role: "Geographer | DRT Strategies (CDC)",
        location: "Remote",
        startYear: "2024",
        endYear: "2026",
        bulletPoints: [
            "Develop web mapping applications and dashboards with ArcGIS Enterprise, JavaScript, React, and Power BI for CDC surveillance programs",
            "Use R and Python to build PMTiles and GeoParquet datasets that feed those dashboards and web maps",
            "Build SQL Server and PostgreSQL/PostGIS databases and Python/SQL ETL pipelines for recurring geospatial updates"
        ]
    },
    {
        initials: "CDC",
        role: "Geographer | Centers for Disease Control and Prevention",
        location: "Remote",
        startYear: "2022",
        endYear: "2024",
        bulletPoints: [
            "Same CDC Geographer role as a federal employee: surveillance web maps, dashboards, and geospatial ETL with ArcGIS Enterprise, Python, and SQL"
        ]
    },
    {
        initials: "NG",
        role: "GIS Data Engineer & Scrum Master | Saicon (National Grid)",
        location: "Remote",
        startYear: "2021",
        endYear: "2022",
        bulletPoints: [
            "Migrated large utility GIS datasets to Azure-hosted ArcGIS Enterprise using Python and SQL",
            "Led Agile delivery of migration milestones and spatial data quality checks"
        ]
    },
    {
        initials: "CB",
        role: "Geographer | U.S. Census Bureau",
        location: "Suitland, MD",
        startYear: "2016",
        endYear: "2021",
        bulletPoints: [
            "Developed Python tools and ArcGIS API workflows for census geography production",
            "Automated spatial processing workflows across large national datasets"
        ]
    },
    {
        initials: "C2",
        role: "GIS Systems Administrator & Software Engineer | C2 Solutions Group Inc.",
        location: "Reston, VA",
        startYear: "2014",
        endYear: "2016",
        bulletPoints: [
            "Administered ArcGIS Server and Portal deployments backed by SQL Server for federal clients",
            "Built secure web mapping applications used by hundreds of concurrent users"
        ]
    },
    {
        initials: "BAH",
        role: "Geospatial Analyst | Booz Allen Hamilton (DHS)",
        location: "Philadelphia, PA & Arlington, VA",
        startYear: "2009",
        endYear: "2014",
        bulletPoints: [
            "Built maps, spatial analysis workflows, and web GIS tools for DHS disaster response",
            "Processed and analyzed raster and imagery datasets during major disaster operations"
        ]
    },
];

export const educationData = [
    { date: "2007", title: "Master of Science in Geography", subtitle: "University of Tennessee, Knoxville — thesis & archive", url: "/history/#thesis" },
    { date: "2004", title: "Bachelor of Arts, Geography and Anthropology", subtitle: "Penn State University — Minor in GIS" },
    { date: "2021", title: "AWS Certified Cloud Practitioner", subtitle: "Amazon Web Services" },
    { date: "2026", title: "AWS Solutions Architect – Associate (SAA-C03)", subtitle: "In progress — see study plan", url: "/aws-solutions-architect-study.html" }
];

/**
 * Cloud architecture case studies — what Solutions Architect hiring managers should see first.
 * Each entry is framed around platform/service choices that ship a product, not feature lists.
 */
export const featureWork = [
    {
        title: "Global Ski Atlas",
        description:
            "Containerized GIS pipeline on AWS: Docker runs Python ETL against OpenStreetMap, writes GeoParquet and PMTiles to S3, and loads Parquet into DynamoDB for ywiki — because Lambda hit time/memory limits on regional OSM extracts.",
        outcome:
            "Moved heavy ETL from Lambda to Docker containers so resort data, map tiles, and wiki seed rows stay in sync as one product pipeline.",
        roles: ["Docker", "ECS/Fargate", "OpenStreetMap", "GeoParquet", "PMTiles", "S3", "DynamoDB"],
        image: "/images/feature-work/architecture/global-ski-atlas.png",
        url: "https://globalskiatlas.com",
    },
    {
        title: "ywiki",
        description:
            "Markdown wiki on AWS: Cognito for write auth, Lambda/API Gateway for the wiki API, DynamoDB for pages/revisions/comments — seeded from Global Ski Atlas Parquet so resort entries start from the same pipeline that builds the map.",
        outcome:
            "Reused the atlas Parquet → DynamoDB load instead of a separate content DB, so wiki and map share one ski-area source of truth.",
        roles: ["Cognito", "Lambda", "DynamoDB", "SAM", "Parquet ingest"],
        image: "/images/feature-work/architecture/ywiki.png",
        url: "https://github.com/jwitcoski/ywiki",
    },
    {
        title: "Cloud Resume Challenge",
        description:
            "This site’s edge-to-API AWS stack: S3 + CloudFront + Route 53 for the static front, API Gateway + Lambda + DynamoDB for the visitor counter, SAM and GitHub Actions for IaC/CI/CD.",
        outcome:
            "You can click through the full stack on this site: static hosting, DNS, a serverless counter API, and the IaC/CI pipeline that deploys it.",
        roles: ["S3", "CloudFront", "Route 53", "API Gateway", "Lambda", "DynamoDB", "SAM", "CI/CD"],
        image: "/images/feature-work/architecture/cloud-resume.png",
        url: "/cloud-resume-challenge/",
    },
    {
        title: "Learn Bosnian",
        description:
            "Language-learning product on AWS: S3 + CloudFront host the lessons; Lambda ties Amazon Transcribe speech-to-text to Bedrock Nova for speak-check feedback.",
        outcome:
            "Used Transcribe and Bedrock instead of a custom ML stack so learners get pronunciation feedback from a small serverless setup.",
        roles: ["S3", "CloudFront", "Lambda", "Transcribe", "Bedrock"],
        image: "/images/feature-work/architecture/learn-bosnian.png",
        url: "https://github.com/jwitcoski/learnbosnian",
    },
    {
        title: "Vector Scope AI",
        description:
            "Collaborative map editing product on AWS. Staff sign in with Cognito, propose edits in the browser app, and reviewers approve or reject those proposals in DynamoDB. ECS workers convert shapefiles and apply approved changes into a private S3 lake of versioned GeoParquet and PMTiles.",
        outcome:
            "Approved edits become lake files for desktop GIS and tiles for web maps, so teams stop shipping shapefiles over email.",
        roles: ["Cognito", "Lambda", "DynamoDB", "ECS", "S3", "GeoParquet", "PMTiles"],
        image: "/images/feature-work/architecture/vector-ledger.png",
        url: "https://vectorscopeai.com",
    },
];

/** Cartography, tools, and experiments — GIS craft, not cloud architecture case studies. */
export const sideProjects = [
    {
        title: "Nepal Census Atlas 2011",
        blurb: "Story-driven choropleth atlas from Nepal’s 2011 census — place narrative over color ramps.",
        roles: ["Choropleth", "GADM", "Narrative cartography"],
        image: "/images/feature-work/nepal-census-atlas.png",
        url: "https://jwitcoski.github.io/Census-Data-Code-For-Nepal-2011/"
    },
    {
        title: "BuildingPop (OSM)",
        blurb: "Draw an area, pull OSM buildings via Overpass, estimate population vs WorldPop / GHS-POP.",
        roles: ["OpenStreetMap", "Overpass", "Leaflet"],
        image: "/images/feature-work/osm-building-population.png",
        url: "https://jwitcoski.github.io/OpenStreetMapPopulation/"
    },
    {
        title: "Admin Boundary Tool",
        blurb: "Punch any state or province out of a country polygon for map highlights.",
        roles: ["MapTiler", "GeoJSON", "Natural Earth"],
        image: "/images/feature-work/admin-boundary-tool.png",
        url: "/admin-boundaries/tool/"
    },
    {
        title: "Raiders of Antikythera",
        blurb: "Dig game on real Antikythera Survey Project tracts — fog-of-war GeoJSON, PMTiles finds.",
        roles: ["MapTiler SDK", "PMTiles", "Game design"],
        image: "/images/feature-work/raiders-of-antikythera.png",
        url: "https://jwitcoski.github.io/raiders-of-antikythera/"
    },
    {
        title: "Map Agent Arena",
        blurb: "Compare Mapbox / MapTiler agent skill packs in a dedicated eval arena.",
        roles: ["Mapbox GL JS", "MapTiler SDK", "Agent eval"],
        image: "/images/feature-work/maptiler-agent-grader.png",
        url: "https://jwitcoski.github.io/map-agent-arena/"
    },
];
