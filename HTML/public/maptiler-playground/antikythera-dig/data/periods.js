const PERIOD_LABELS = {
  MNLN: "Mid–Late Neolithic",
  FNEB1: "Final Neo / EB1",
  EB2: "Early Bronze 2",
  LPrePal: "Late Prepalatial",
  FPal: "First Palace",
  SPal: "Second Palace",
  TPal: "Third Palace",
  Arch: "Archaic",
  Class: "Classical",
  Hell: "Hellenistic",
  ERom: "Early Roman",
  MRom: "Middle Roman",
  LRom: "Late Roman",
  EByz: "Early Byzantine",
  MByz: "Middle Byzantine",
  Other: "Other / undated",
  Recent: "Recent",
};

/** Why a period find is cool — hover copy for excavated tracts. */
const PERIOD_WHY = {
  MNLN: "Mid–Late Neolithic material is vanishingly scarce here — early island visitors, not villages.",
  FNEB1: "Final Neolithic / early Bronze — the island’s first stubborn fingerprints, often tied to Melian obsidian.",
  EB2: "Early Bronze 2 pottery means farming families were already working this ground as Cretan culture stirred.",
  LPrePal: "Late Prepalatial sherds sit on the doorstep of Crete’s first palaces — Antikythera looking south.",
  FPal: "First Palace–period ware — Minoan-linked centuries when this isle was a farmed outpost.",
  SPal: "Second Palace pottery — still in the Minoan orbit, when Crete’s great houses ruled the sea lanes.",
  TPal: "Third Palace / Late Bronze traces — the last prehistoric farming pulse before long abandonments.",
  Arch: "Archaic pottery — after the Bronze Age gap, Greek-speaking centuries creeping back onto the map.",
  Class: "Classical sherds — city-state Greece’s wider world brushing this lonely rock.",
  Hell: "Hellenistic pottery — same centuries as the northern pirate stronghold and the famous wreck.",
  ERom: "Early Roman ware — the empire’s quiet farming reoccupation of a strategic speck.",
  MRom: "Middle Roman pottery — mid-imperial life in the fields, not just at the fort.",
  LRom: "Late Roman sherds are among the survey’s commonest — several villages reseeding the isle.",
  EByz: "Early Byzantine material is rare gold — a thin return after Late Antique decline.",
  MByz: "Middle Byzantine finds — glimpses of reoccupation, easy to miss unless you read the labels.",
  Other: "Undated or mixed pieces — still proof someone walked this square of earth.",
  Recent: "Recent material — modern noise for deep-time chapters, but it marks living memory of the land.",
};

const FIND_KIND_WHY = {
  pottery:
    "Fired clay outlasts empires. Every sherd is a dated breadcrumb of who cooked, traded, and farmed here.",
  lithics:
    "Struck stone tools — hunting kits and early craft. Obsidian can travel from Melos across a hundred kilometres of sea.",
  structures:
    "Built fabric in the tract — someone invested labour here beyond a one-night camp.",
  other:
    "Oddments from the sieve — small finds that still pin human presence to this patch of ground.",
  empty:
    "A clean miss teaches the map too — not every square of an island was lived on equally.",
};
const PERIOD_SCORE_KEYS = [
  "MNLN", "FNEB1", "EB2", "LPrePal", "FPal", "SPal", "TPal", "PPalPG", "Geom",
  "Arch", "Class", "Hell", "ERom", "MRom", "LRom", "EByz", "MByz",
  "EVen", "MVen", "LVen", "Recent", "Other",
];
export { PERIOD_LABELS, PERIOD_WHY, FIND_KIND_WHY, PERIOD_SCORE_KEYS };
