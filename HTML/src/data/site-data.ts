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

/** Hiring-signal work — architecture, ETL, cartography, production systems. */
export const featureWork = [
    {
        title: "Global Ski Atlas",
        description: "Web GIS of 3,000+ ski areas on a MapTiler basemap, with Python ETL and automated geospatial workflows.",
        outcome: "Makes 3,000+ ski areas searchable on one live map, kept current by automated Python ETL instead of hand-edited data.",
        roles: ["MapTiler", "JavaScript", "Python", "ETL", "Web GIS"],
        image: "/images/feature-work/feature-img-1.jpg",
        url: "https://globalskiatlas.com"
    },
    {
        title: "Vector Ledger",
        description: "ArcGIS-integrated editing and validation tools with Python pipelines and REST APIs.",
        outcome: "Bridges ArcGIS editing with lakehouse patterns (Iceberg, GeoParquet) so map updates are validated, versioned, and queryable.",
        roles: ["ArcGIS", "Python", "REST APIs", "SQL Server"],
        image: "/images/feature-work/VectorLedger_AWS_ESRI_Architecture.png",
        url: "https://vectorscopeai.com"
    },
    {
        title: "Nepal Census Atlas 2011",
        description: "Story-driven choropleth atlas of Nepal’s 2011 census — war-era hills, three belts, Tarai schooling, remittance sex ratios, and the Kathmandu Valley before Gorkha.",
        outcome: "Turns imperfect public census data into geographically trustworthy chapters so a reader understands a place, not just a color ramp.",
        roles: ["Choropleth", "GADM", "Code for Nepal", "Narrative cartography"],
        image: "/images/feature-work/nepal-census-atlas.png",
        url: "https://jwitcoski.github.io/Census-Data-Code-For-Nepal-2011/"
    },
    {
        title: "BuildingPop (OSM)",
        description: "Draw a city-scale area, pull OpenStreetMap buildings via Overpass, and estimate population from houses, apartments, and demographic presets — with WorldPop / GHS-POP comparison.",
        outcome: "Shows how mapped building footprints become a transparent, adjustable population estimate instead of a black-box density layer.",
        roles: ["OpenStreetMap", "Overpass", "Leaflet", "WorldPop", "GHS-POP"],
        image: "/images/feature-work/osm-building-population.png",
        url: "https://jwitcoski.github.io/OpenStreetMapPopulation/"
    },
    {
        title: "Admin Boundary Tool",
        description: "Punch any state or province out of a country polygon for map highlights (MapTiler + GeoJSON).",
        outcome: "Turns a common cartography need into a reusable boundary workflow instead of manually clipping polygons every time.",
        roles: ["MapTiler", "GeoJSON", "Natural Earth", "Web GIS"],
        image: "/images/feature-work/admin-boundary-tool.png",
        url: "/admin-boundaries/tool.html"
    },
];

/** Playful / experimental — keep visible, clearly secondary to featured work. */
export const sideProjects = [
    {
        title: "Raiders of Antikythera",
        blurb: "Dig game on real Antikythera Survey Project tracts — fog-of-war GeoJSON, PMTiles finds, MapTiler satellite.",
        roles: ["MapTiler SDK", "PMTiles", "Game design"],
        image: "/images/feature-work/raiders-of-antikythera.png",
        url: "/maptiler-playground/antikythera-dig.html"
    },
    {
        title: "Map Agent Arena",
        blurb: "Compare Mapbox / MapTiler agent skill packs in a dedicated eval arena off the homepage.",
        roles: ["Mapbox GL JS", "MapTiler SDK", "Agent eval"],
        image: "/images/feature-work/maptiler-agent-grader.png",
        url: "https://jwitcoski.github.io/map-agent-arena/"
    },
];
