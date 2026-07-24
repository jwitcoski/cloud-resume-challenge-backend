export const experienceData = [
    {
        icon: "/images/icon/asana-icon.svg",
        role: "Geographer | DRT Strategies (CDC)",
        location: "Remote",
        startYear: "2022",
        endYear: "Present",
        bulletPoints: [
            "Develop web mapping applications and dashboards with ArcGIS Enterprise, JavaScript, React, and Power BI for CDC surveillance programs",
            "Use R and Python to build PMTiles and GeoParquet datasets that feed those dashboards and web maps",
            "Build SQL Server and PostgreSQL/PostGIS databases and Python/SQL ETL pipelines for recurring geospatial updates"
        ]
    },
    {
        icon: "/images/icon/tailwind-icon.svg",
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
        icon: "/images/icon/tailwind-icon.svg",
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
        icon: "/images/icon/asana-icon.svg",
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
        icon: "/images/icon/tailwind-icon.svg",
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
        icon: "/images/icon/asana-icon.svg",
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
    { date: "2007", title: "Master of Science in Geography", subtitle: "University of Tennessee, Knoxville" },
    { date: "—", title: "Bachelor of Arts, Geography and Anthropology", subtitle: "Penn State University — Minor in GIS" },
    { date: "2021", title: "AWS Certified Cloud Practitioner", subtitle: "Amazon Web Services" },
    { date: "2026", title: "AWS Solutions Architect – Associate (SAA-C03)", subtitle: "In progress — see study plan", url: "/aws-solutions-architect-study.html" }
];

export const projectOverview = {
    sideProjects: [
        { name: "Global Ski Atlas", url: "https://globalskiatlas.com" },
        { name: "Vector Scope AI", url: "https://vectorscopeai.com" },
        { name: "Raiders of Antikythera", url: "https://github.com/jwitcoski/raiders-of-antikythera" },
        { name: "MapTiler Playground", url: "/maptiler-playground/" },
        { name: "AWS SAA Study Plan", url: "/aws-solutions-architect-study.html" },
    ]
};

export const featureWork = [
    {
        title: "Global Ski Atlas",
        description: "Web GIS of 3,000+ ski areas on a MapTiler basemap, with Python ETL and automated geospatial workflows.",
        roles: ["MapTiler", "JavaScript", "Python", "ETL", "Web GIS"],
        image: "/images/feature-work/feature-img-1.jpg",
        url: "https://globalskiatlas.com"
    },
    {
        title: "Vector Ledger",
        description: "ArcGIS-integrated editing and validation tools with Python pipelines and REST APIs.",
        roles: ["ArcGIS", "Python", "REST APIs", "SQL Server"],
        image: "/images/feature-work/VectorLedger_AWS_ESRI_Architecture.png",
        url: "https://vectorscopeai.com"
    },
    {
        title: "Admin Boundary Tool",
        description: "Punch any state or province out of a country polygon for map highlights (MapTiler + GeoJSON).",
        roles: ["MapTiler", "GeoJSON", "Natural Earth", "Web GIS"],
        image: "/images/feature-work/admin-boundary-tool.png",
        url: "/admin-boundaries/tool.html"
    },
    {
        title: "MapTiler Playground",
        description: "Why I build with MapTiler — plus the maps, dig games, labs, and agent graders I've shipped on the SDK.",
        roles: ["MapTiler SDK", "Web GIS", "PMTiles", "Agent eval"],
        image: "/images/feature-work/maptiler-agent-grader.png",
        url: "/maptiler-playground/"
    },
    {
        title: "Raiders of Antikythera",
        description: "Indiana Jones–flavored dig game on real Antikythera Survey Project tracts — fogged GeoJSON, PMTiles finds, MapTiler satellite, glory ranks, and chapter recovery.",
        roles: ["MapTiler SDK", "PMTiles", "GeoJSON", "Game design"],
        image: "/images/feature-work/raiders-of-antikythera.png",
        url: "/maptiler-playground/antikythera-dig.html"
    }
];
