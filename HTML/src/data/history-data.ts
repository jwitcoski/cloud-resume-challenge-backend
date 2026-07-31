export const thesisAbstract = `Location-allocation models based on optimization criteria are appropriate tools for the analysis of archaeological settlement patterns. In early agricultural societies, elite classes might maximize their control of the population and resources by optimally situating their primary settlements. Location-allocation models can simulate the multiple factors that potentially underlie settlement site location decisions. I describe several maximal covering models and their applicability to understand the degree of political centralization in the Upper Tennessee River Valley during several Mississippian archaeological cultural phases (900 to 1600 A.D.). My results support the notion that the main objective of the Mississippian elite in choosing sites for administrative centers was to maximize control of the local population and the supporting agricultural economy. The results also support the work of anthropologists and archaeologists regarding the variable degrees of political complexity during time periods of the Mississippian culture. Cultures during the earliest time period (1000-1200 A.D.) and the northern part of the study area during the latest time period (1450-1600 A.D.) in the analysis were found to be the least complex, resembling simple tribal societies unable to maximize their control over the entire Valley population and its resources. Factors such as the location of trade routes and selected resource deposits were not accounted for in the location-allocation models developed for this research and may account for the less-than-optimal results in settlement system control.`;

export const thesisPdfPath = "/docs/witcoskithesis2007.pdf";

export const thesisTitle =
  "An Analysis of the Spatial Distribution of Chiefdom Settlements: Modeling the Mississippian Culture in the Tennessee River Valley";

export const archaeologyTimeline = [
  {
    date: "2000–2004",
    title: "Penn State University",
    subtitle: "B.A. Geography & Anthropology, GIS certification",
    body: "Studied at Penn State and earned a Bachelor's Degree in Geography and Anthropology and a Certification in GIS.",
    image: "/images/history/timeline/pennstate.jpg",
  },
  {
    date: "2002",
    title: "Washington State University Archaeological Field School",
    subtitle: "Eastern Oregon",
    body: "Excavated prehistoric cultures at the WSU field school in Eastern Oregon.",
    image: "/images/history/timeline/wsu.png",
  },
  {
    date: "2003",
    title: "NSF-REU — University of Southern Maine",
    subtitle: "Geography / Geology field school",
    body: "Mapped a colonial town in Maine as part of the NSF Research Experiences for Undergraduates program.",
    image: "/images/history/timeline/usm.jpg",
  },
  {
    date: "2004",
    title: "Cartography Technician — Archaeological Research Laboratory",
    subtitle: "University of Tennessee",
    body: "Performed data analysis and helped build a GIS database from prehistoric and historic sites associated with State Route 73 (U.S. 321) improvements in Tuckaleechee Cove, Townsend, Tennessee. Also took part in an archaeological survey of the Cumberland National Recreation Area on the Kentucky, Tennessee, and Virginia border.",
    image: "/images/history/timeline/ut.jpg",
  },
  {
    date: "2004–2007",
    title: "M.S. Geography — University of Tennessee",
    subtitle: "Master's thesis on Mississippian settlement patterns",
    body: "Completed graduate research on location-allocation modeling of chiefdom settlements in the Upper Tennessee River Valley.",
    image: "/images/history/timeline/ut.jpg",
  },
  {
    date: "2004–2007",
    title: "Volunteer — Fall Creek Falls Archaeological Survey",
    subtitle: "Tennessee",
    body: "Volunteered on the Fall Creek Falls Archaeological Survey while completing graduate studies.",
    image: "/images/history/timeline/fcf.jpg",
  },
];

export const printedMaps = {
  undergrad: [
    {
      src: "/images/history/maps/undergrad/image001.jpg",
      title: "NSF REU",
      year: "2003",
    },
    {
      src: "/images/history/maps/undergrad/image003.jpg",
      title: "Maps from the NSF REU study area",
      year: "2003",
    },
    {
      src: "/images/history/maps/undergrad/image005.jpg",
      title: "NSF REU",
      year: "2003",
    },
    {
      src: "/images/history/maps/undergrad/image007.jpg",
      title: "NSF REU",
      year: "2003",
    },
    {
      src: "/images/history/maps/undergrad/image009.jpg",
      title: "NSF REU",
      year: "2003",
    },
  ],
  masters: [
    {
      src: "/images/history/maps/masters/image001.jpg",
      title: "Map for master's thesis",
      year: "2007",
    },
    {
      src: "/images/history/maps/masters/image003.jpg",
      title: "Map for master's paper",
      year: "2005",
    },
    {
      src: "/images/history/maps/masters/image005.jpg",
      title: "Map for master's paper",
      year: "2005",
    },
  ],
};

/** ArcGIS Desktop–era tooling kept for history; Desktop is retired in favor of ArcGIS Pro. */
export const arcgisDesktopArchive = {
  title: "ArcPy Production Toolset",
  repoUrl: "https://github.com/jwitcoski/ArcpyProductionToolSet",
  notebookHref: "/archive/python/ProductionToolSet_addin.html",
  blurb:
    "An ESRI ArcPy production toolbar / add-in for ArcGIS Desktop workflows — search, merge, and other processing tools built for day-to-day cartography and geodatabase work.",
  retirementNote:
    "ArcGIS Desktop is no longer an Esri product (support ended; ArcGIS Pro is the successor). This repository is preserved as history of Desktop-era ArcPy automation, not as something to run on current stacks.",
};

export type EarlyPythonProject = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  notebookHref?: string;
};

export const earlyPythonProjects: EarlyPythonProject[] = [
  {
    title: "Plotly GDP chart",
    description: "GDP visualization using Plotly's JavaScript charting.",
    href: "/archive/python/plotly.html",
  },
  {
    title: "GeoPandas quick map",
    description: "Early geopandas notebook used to produce a map quickly.",
    href: "/archive/python/MyFirstPythonMap.html",
  },
  {
    title: "ArcPy search and merge",
    description: "Search and merge geodatabase feature classes with ArcPy.",
    href: "/archive/python/ArcPy-Search-and-Merge.html",
  },
  {
    title: "OSMNX street network map",
    description: "Download OpenStreetMap street data and render a network map.",
    href: "/archive/python/OSMNX.html",
  },
];
