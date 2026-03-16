export const experienceData = [
    {
        icon: "/images/icon/tailwind-icon.svg",
        role: "Founder & GIS Architect | Vector Scope AI LLC",
        location: "Remote",
        startYear: "2025",
        endYear: "Present",
        bulletPoints: [
            "Building Vector Ledger—the lakehouse layer for ArcGIS: collaborative map updates for agencies with versioned GeoParquet and Iceberg",
            "Bridging ArcGIS Online/Enterprise with Spark/Sedona/Iceberg data lakes so staff edit via Esri web apps and output stays portable and analytics-ready",
            "Designing Ledger Editor, Dashboard, Lake (GeoParquet storage), and Ledger Grid (Kubernetes GIS) for agency pilot deployments",
            "Running Global Ski Atlas as live demo (3000+ resorts, web editor, public atlas) to prove the platform for boundaries and program areas",
            "Pursuing Esri Startup Program and pilot engagements for agencies needing collaborative editing and GeoParquet for ArcGIS"
        ]
    },
    {
        icon: "/images/icon/asana-icon.svg",
        role: "Senior Geographer & GIS Solutions Developer | DRT Strategies (CDC)",
        location: "Remote",
        startYear: "2022",
        endYear: "Present",
        bulletPoints: [
            "Lead design of GIS and AI solutions supporting CDC public health surveillance programs nationwide",
            "Architect enterprise geospatial software improving data timeliness by 60% for epidemiologists",
            "Develop interactive web mapping applications and dashboards using ArcGIS Enterprise, React, and Power BI",
            "Build spatial databases and ETL workflows processing 10M+ records monthly with 99.9% reliability",
            "Provide technical leadership across CDC divisions on enterprise GIS and automation best practices"
        ]
    },
    {
        icon: "/images/icon/tailwind-icon.svg",
        role: "GIS Data Engineer & Scrum Master | Saicon (National Grid)",
        location: "Remote",
        startYear: "2021",
        endYear: "2022",
        bulletPoints: [
            "Designed large-scale GIS migration for utility datasets affecting 1M+ customers to cloud platforms",
            "Led cross-functional Agile teams delivering migration milestones with 98%+ data quality",
            "Developed spatial ETL workflows using Python, SQL, and Azure services",
            "Configured high-availability ArcGIS Enterprise with 99.95% uptime and zero service interruptions"
        ]
    },
    {
        icon: "/images/icon/asana-icon.svg",
        role: "Senior Geographer & GIS Application Developer | U.S. Census Bureau",
        location: "Suitland, MD",
        startYear: "2016",
        endYear: "2021",
        bulletPoints: [
            "Developed mission-critical GIS tools using Python and ArcGIS APIs",
            "Created automated workflows reducing manual processing by 70%",
            "Supported disaster response with rapid geographic updates during hurricanes"
        ]
    },
    {
        icon: "/images/icon/tailwind-icon.svg",
        role: "GIS Systems Administrator & Software Engineer | C2 Solutions Group Inc.",
        location: "Reston, VA",
        startYear: "2014",
        endYear: "2016",
        bulletPoints: [
            "Designed and secured enterprise GIS solutions for federal clients",
            "Administered ArcGIS Server/Portal deployments supporting hundreds of concurrent users",
            "Developed secure web mapping applications following DevSecOps and OWASP standards",
            "Maintained 99.9% platform availability in mission-critical environments"
        ]
    },
    {
        icon: "/images/icon/asana-icon.svg",
        role: "Geospatial Analyst & Solutions Developer | Booz Allen Hamilton (DHS/FEMA)",
        location: "Philadelphia, PA & Arlington, VA",
        startYear: "2009",
        endYear: "2014",
        bulletPoints: [
            "Built GIS solutions for DHS and FEMA emergency response operations",
            "Developed spatial analysis workflows supporting real-time disaster response",
            "Created mapping applications improving operational decision support during major disasters"
        ]
    },
];

export const educationData = [
    { date: "2007", title: "Master of Science in Geography", subtitle: "University of Tennessee, Knoxville" },
    { date: "—", title: "Bachelor of Arts, Geography and Anthropology", subtitle: "Penn State University — Minor in GIS" },
    { date: "2021", title: "AWS Certified Cloud Practitioner", subtitle: "Amazon Web Services" }
];

export const projectOverview = {
    sideProjects: [
        { name: "Vector Scope AI", url: "https://vectorscopeai.com" },
        { name: "Global Ski Atlas", url: "https://globalskiatlas.com" },
        { name: "Cloud Resume Challenge", url: "/cloud-resume-challenge" },
    ]
};

export const featureWork = [
    {
        title: "Global Ski Atlas",
        description: "Full-stack web GIS with automated Python ETL and interactive JavaScript mapping.",
        roles: ["Python", "JavaScript", "Web GIS", "ETL"],
        image: "/images/feature-work/feature-img-1.jpg",
        url: "https://globalskiatlas.com"
    },
    {
        title: "Cloud Resume Challenge",
        description: "Cloud application with IaC, CI/CD pipelines, and secure APIs.",
        roles: ["AWS", "CI/CD", "IaC", "REST APIs"],
        image: "/images/cloud-resume-challenge/CloudResumeArchitecture.png",
        url: "/cloud-resume-challenge"
    }
];
