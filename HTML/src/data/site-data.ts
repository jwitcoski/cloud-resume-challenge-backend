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
            "Design, build, and maintain enterprise geodatabases and geospatial workflows with ArcGIS Enterprise, Online, and Desktop for IC and USPIS missions",
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
            "Build ArcGIS-connected web tools and Python pipelines for map editing, validation, and data extraction",
            "Ship Global Ski Atlas (3,000+ ski areas) as a live MapTiler web map with automated ETL"
        ]
    },
    {
        initials: "DRT",
        role: "Geographer | DRT Strategies (CDC)",
        location: "Remote",
        startYear: "2022",
        endYear: "2026",
        bulletPoints: [
            "Develop web mapping applications and dashboards with ArcGIS Enterprise, JavaScript, React, and Power BI for CDC surveillance programs",
            "Use R and Python to build PMTiles and GeoParquet datasets that feed those dashboards and web maps",
            "Build SQL Server and PostgreSQL/PostGIS databases and Python/SQL ETL pipelines for recurring geospatial updates"
        ]
    },
    {
        initials: "NG",
        role: "GIS Data Engineer & Scrum Master | Saicon (National Grid)",
        location: "Remote",
        startYear: "2021",
        endYear: "2022",
        bulletPoints: [
            "Migrated large utility GIS datasets to cloud-hosted ArcGIS Enterprise using Python and SQL",
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
        role: "Geospatial Analyst | Booz Allen Hamilton (DHS/FEMA)",
        location: "Philadelphia, PA & Arlington, VA",
        startYear: "2009",
        endYear: "2014",
        bulletPoints: [
            "Built maps, spatial analysis workflows, and web GIS tools for FEMA and DHS disaster response",
            "Supported situational awareness and decision-making during major disaster operations"
        ]
    },
];

export const educationData = [
    { date: "2007", title: "Master of Science in Geography", subtitle: "University of Tennessee, Knoxville — thesis & archive", url: "/history/#thesis" },
    { date: "2004", title: "Bachelor of Arts, Geography and Anthropology", subtitle: "Penn State University — Minor in GIS" },
    { date: "2021", title: "AWS Certified Cloud Practitioner", subtitle: "Amazon Web Services" },
    { date: "2026", title: "AWS Solutions Architect – Associate (SAA-C03)", subtitle: "In progress — see study plan", url: "/aws-solutions-architect-study.html" }
];

/** Architecture / cloud / systems design — what SE/SA hiring managers should see first. */
export const featureWork = [
    {
        title: "Global Ski Atlas",
        description: "Live ski-resort product on AWS — Step Functions, Lambda, DynamoDB, and S3 feeding a MapTiler web map.",
        outcome: "Production serverless GIS backend keeps 3,000+ ski areas current via automated ETL instead of hand-edited layers.",
        roles: ["AWS", "Step Functions", "Lambda", "DynamoDB", "Python ETL"],
        image: "/images/feature-work/feature-img-1.jpg",
        url: "https://globalskiatlas.com"
    },
    {
        title: "Vector Ledger",
        description: "ArcGIS-connected editing and validation bridged to lakehouse patterns.",
        outcome: "Map updates become validated, versioned, and queryable across Iceberg, GeoParquet, and changelog history.",
        roles: ["ArcGIS", "AWS", "Iceberg", "GeoParquet", "REST APIs"],
        image: "/images/feature-work/VectorLedger_AWS_ESRI_Architecture.png",
        url: "https://vectorscopeai.com"
    },
    {
        title: "Cloud Resume Challenge",
        description: "This site’s AWS stack — S3, CloudFront, Route 53, API Gateway, Lambda, DynamoDB, SAM, and CI/CD.",
        outcome: "End-to-end cloud architecture you can click: static edge frontend plus a live visitor-counter API.",
        roles: ["S3", "CloudFront", "Lambda", "DynamoDB", "SAM", "CI/CD"],
        image: "/images/cloud-resume-challenge/CloudResumeArchitecture.png",
        url: "/cloud-resume-challenge/"
    },
];

/** Cartography, tools, and experiments — real GIS craft, not architecture case studies. */
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
