const VESSEL_TYPE = {
  U: "Unidentified vessel",
  JCon: "Closed jar / container",
  "JCon?": "Closed jar / container?",
  CPot: "Cooking pot",
  "CPot?": "Cooking pot?",
  LOpe: "Large open vessel",
  "LOpe?": "Large open vessel?",
  SOpe: "Small open vessel",
  "SOpe?": "Small open vessel?",
  JOpe: "Open jar",
  "JOpe?": "Open jar?",
  Pith: "Pithos (storage jar)",
  "Pith?": "Pithos?",
  Clo: "Closed form",
  Oth: "Other form",
  Open: "Open form",
  SClo: "Small closed form",
};

const VESSEL_PART = {
  B: "Body sherd",
  H: "Handle",
  R: "Rim",
  Ba: "Base",
  "R?": "Rim?",
  "Ba?": "Base?",
  L: "Leg / foot",
  "H?": "Handle?",
  "R and H": "Rim and handle",
  T: "Spout / tube",
  U: "Unidentified part",
};

const COARSENESS = { C: "Coarse", F: "Fine", M: "Medium" };
const THICKNESS = { M: "Medium wall", Tn: "Thin wall", Tk: "Thick wall" };

const LITHIC_MATERIAL = {
  o: "Obsidian (likely Melos)",
  wc: "White / pale chert",
  rc: "Red chert",
  Ba: "Basalt",
  Wq: "White quartz",
  gc: "Grey chert",
  Brn: "Brown stone",
  Beach: "Beach pebble",
  c: "Chert",
};

const LITHIC_BLANK = {
  flake: "Flake",
  shatter: "Shatter",
  blade: "Blade",
  core: "Core",
  chip: "Chip",
  indeterminate: "Indeterminate blank",
  spall: "Spall",
};

const LITHIC_TOOL = {
  n: "Unretouched piece",
  pe: "Pièce esquillée (splintered piece)",
  "retouched blade": "Retouched blade",
  "other retouched tools": "Retouched tool",
  "flake scraper": "Flake scraper",
  "retouched flake": "Retouched flake",
  "biface fragment": "Biface fragment",
  biface: "Biface",
};

/* Top 10 pottery vessel forms (normalized VesselType) — field sketches for hover */
const POTTERY_ART = {
  U: "pot-u",
  JCon: "pot-jcon",
  CPot: "pot-cpot",
  LOpe: "pot-lope",
  SOpe: "pot-sope",
  JOpe: "pot-jope",
  Pith: "pot-pith",
  Clo: "pot-clo",
  Oth: "pot-oth",
  Open: "pot-open",
};

/* Top 10 lithic classes: finished tools first, else blank × material */
const LITHIC_TOOL_ART = {
  pe: "lithic-pe",
  "retouched blade": "lithic-retouched-blade",
  "other retouched tools": "lithic-scraper",
  "flake scraper": "lithic-scraper",
  "retouched flake": "lithic-scraper",
  "biface fragment": "lithic-biface",
  biface: "lithic-biface",
};

const LITHIC_BLANK_ART = {
  "flake|c": "lithic-flake-chert",
  "flake|o": "lithic-flake-obsidian",
  "shatter|c": "lithic-shatter",
  "shatter|o": "lithic-shatter",
  "blade|o": "lithic-blade-obsidian",
  "chip|o": "lithic-chip",
  "core|c": "lithic-core",
};
export {
  VESSEL_TYPE, VESSEL_PART, COARSENESS, THICKNESS,
  LITHIC_MATERIAL, LITHIC_BLANK, LITHIC_TOOL,
  POTTERY_ART, LITHIC_TOOL_ART, LITHIC_BLANK_ART,
};
