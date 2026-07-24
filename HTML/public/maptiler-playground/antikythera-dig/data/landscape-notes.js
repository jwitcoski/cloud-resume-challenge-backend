const GEOLOGY_NOTES = {
  Alluvium: {
    art: "geo-alluvium",
    title: "Alluvium",
    kind: "Soft valley fill · Quaternary",
    blurb:
      "Young valley and pocket soils washed down from higher ground. Softer to dig, better water retention — the kind of ground Mediterranean farmers chase.",
    dig: "Strong bet for Bronze Age and later farm pottery. Mark tracts that sit on these gold patches.",
  },
  "Nummulitic limestones": {
    art: "geo-nummulitic",
    title: "Nummulitic limestones",
    kind: "Hard bedrock",
    blurb:
      "Pale limestone packed with fossil coin-shaped forams (nummulites). Thin, rocky soils over tough rock.",
    dig: "Expect thinner artefact carpets. Useful near coasts for lithics; farms prefer the softer neighbours.",
  },
  "Rudist bearing limestones": {
    art: "geo-rudist",
    title: "Rudist-bearing limestones",
    kind: "Hard bedrock",
    blurb:
      "Limestone with fossil rudist clams — another hard shelf of the island’s skeleton.",
    dig: "Rocky and stingy for plough soils. Look for terraces where people forced farms onto the slopes.",
  },
  "Brecciated limestones": {
    art: "geo-brecciated",
    title: "Brecciated limestones",
    kind: "Broken / cemented rock",
    blurb:
      "Fractured limestone rubble cemented back together. Rough walking, patchy soils.",
    dig: "Mixed results — check adjoining alluvium or dense terrace webs before spending crew days.",
  },
  "Clastic carbonate series": {
    art: "geo-clastic",
    title: "Clastic carbonate series",
    kind: "Bedrock · mixed sediments",
    blurb:
      "Broken-up carbonate rocks and related sediments — somewhere between pure limestone and softer fills.",
    dig: "Decent middle ground. Pair with terrace density when choosing where to open fog.",
  },
  Flysch: {
    art: "geo-flysch",
    title: "Flysch",
    kind: "Softer bedrock · erodible",
    blurb:
      "Stacked sandstones, shales and related beds that weather faster than limestone. Often cut into terraces.",
    dig: "Good hunting for long-farmed slopes. Terrace lines on flysch are a classic Bronze / Roman signal.",
  },
  "Marls,Sandstones,Conglomerates": {
    art: "geo-marls",
    title: "Marls, sandstones & conglomerates",
    kind: "Mixed soft rock",
    blurb:
      "A muddle of marl, sandstone and pebble beds — more workeable than pure limestone, less forgiving than true alluvium.",
    dig: "Worth a shovel if terraces or structures sit nearby.",
  },
  Scree: {
    art: "geo-scree",
    title: "Scree",
    kind: "Slope debris",
    blurb:
      "Loose rock fallen from cliffs and slopes — not a soil people choose to farm.",
    dig: "Usually thin pickings. Walk past unless a chapter hint points you here.",
  },
};

const GEOLOGY_FALLBACK = {
  title: "Bedrock unit",
  kind: "Survey geology",
  blurb: "A mapped rock unit from the Antikythera Survey Project bedrock map.",
  dig: "Compare with terrace density and chapter field notes before you dig.",
};

/**
 * Terrace riser lines (ASP): each line is a wall holding a stepped farming shelf.
 * `code` is the survey’s class label on the riser (0–2); treat denser webs as long investment.
 */
const TERRACE_NOTES = {
  0: {
    art: "terrace-0",
    title: "Terrace riser · class 0",
    kind: "Agricultural terrace wall",
    blurb:
      "A terrace is a stepped farming shelf: a stone riser (this line) holds soil on a hillside so people can plough or plant where the slope would otherwise wash away.",
    dig: "Even sparse risers mark human labour. Prefer denser terrace neighbourhoods for farm-period finds.",
  },
  1: {
    art: "terrace-1",
    title: "Terrace riser · class 1",
    kind: "Agricultural terrace wall",
    blurb:
      "Clear terrace wall — part of the island’s ~12,000 mapped risers. These are landscape capital: generations of work, not a one-season camp.",
    dig: "Solid cue for Bronze Age / Roman / later farming. Dig fogged tracts that sit inside terrace webs.",
  },
  2: {
    art: "terrace-2",
    title: "Terrace riser · class 2",
    kind: "Agricultural terrace wall",
    blurb:
      "Well-expressed terrace riser. Dense copper-coloured hatchings = slopes people bothered to rebuild again and again.",
    dig: "Prime scouting signal. Chapter hints that say “south / farms” love these lines.",
  },
};

const TERRACE_FALLBACK = TERRACE_NOTES[2];

const STRUCTURE_NOTES = {
  "old house": {
    art: "struct-old-house",
    title: "Old house",
    kind: "Domestic ruin",
    blurb:
      "Abandoned dwelling fabric from earlier settlement pulses. Often stone footings and collapsed walls still readable in the landscape.",
    dig: "Settlement signal — dig neighbouring fogged tracts for pottery from the same occupation.",
  },
  "new house": {
    art: "struct-new-house",
    title: "New house",
    kind: "Recent domestic",
    blurb:
      "More recent housing stock. Useful as a landmark, less as a deep-time chapter clue.",
    dig: "Navigate by it; spend shovels on older farm ground and terrace webs nearby.",
  },
  shelter: {
    art: "struct-shelter",
    title: "Shelter",
    kind: "Agricultural / pastoral shelter",
    blurb:
      "A small built shelter for people, tools, or animals while working the fields — part of everyday farming kit.",
    dig: "Points to worked farmland. Open tracts around dense shelter clusters.",
  },
  "rock shelter": {
    art: "struct-rock-shelter",
    title: "Rock shelter",
    kind: "Natural overhang · cave-like",
    blurb:
      "A natural rock overhang or shallow cave used (or usable) as shelter. On Antikythera these sit with the island’s cliffs and limestone shelves — closest thing in the survey to “caves.”",
    dig: "Worth a look for lithics and early visits; also check Comments for tomb / rock-cutting notes.",
  },
  well: {
    art: "struct-well",
    title: "Well",
    kind: "Water source",
    blurb:
      "A dug well — scarce fresh water made these precious nodes. Farms and houses cluster toward reliable water.",
    dig: "High-value landmark. Dig fog around wells when chasing Roman or later village chapters.",
  },
  cistern: {
    art: "struct-cistern",
    title: "Cistern",
    kind: "Water storage",
    blurb:
      "Built tank for catching and storing rain — another answer to a dry island.",
    dig: "Same logic as wells: settlement and farming nearby are more likely.",
  },
  "threshing floor": {
    art: "struct-threshing-floor",
    title: "Threshing floor",
    kind: "Agricultural installation",
    blurb:
      "A circular or paved floor where grain was threshed after harvest. Classic Mediterranean farm furniture — proof of cereal agriculture, not just grazing.",
    dig: "Strong farm-period cue. Pair with terraces and alluvium when spending crew days.",
  },
  "wine press": {
    art: "struct-wine-press",
    title: "Wine press",
    kind: "Agricultural installation",
    blurb:
      "Rock-cut or built press for crushing grapes. Signals vine husbandry and processing on or near the plot.",
    dig: "Agricultural investment — dig adjacent tracts for related pottery.",
  },
  press: {
    art: "struct-press",
    title: "Press",
    kind: "Agricultural installation",
    blurb: "A processing press (often for oil or wine) recorded by the survey.",
    dig: "Treat like other farm kit — search the surrounding fog.",
  },
  "tomb?": {
    art: "struct-tomb",
    title: "Tomb?",
    kind: "Possible burial",
    blurb:
      "A feature the survey flagged as a possible tomb. Comments often note rock-cuttings or cist graves.",
    dig: "Mortuary spots can sit apart from dense farm pottery — still mark nearby tracts if a chapter needs them.",
  },
  "possible limekiln": {
    art: "struct-limekiln",
    title: "Possible limekiln",
    kind: "Industrial / craft",
    blurb: "A candidate lime-burning kiln — craft industry tied to building and field walls.",
    dig: "Landmark more than treasure; useful for reading post-medieval and recent activity.",
  },
  church: {
    art: "struct-church",
    title: "Church",
    kind: "Religious building",
    blurb: "A church or chapel — later landmark and community focus.",
    dig: "Orient yourself; dig older chapters in the farmland around it, not only at the door.",
  },
  windmill: {
    art: "struct-windmill",
    title: "Windmill",
    kind: "Industrial / milling",
    blurb: "Wind-powered mill — another processing node in the farming landscape.",
    dig: "Recent-leaning landmark; still a useful pin when navigating.",
  },
  watermill: {
    art: "struct-watermill",
    title: "Watermill",
    kind: "Industrial / milling",
    blurb: "Water-powered mill — rare and tied to reliable runoff.",
    dig: "Note the water story; dig nearby farm ground.",
  },
  "gun emplacement": {
    art: "struct-gun",
    title: "Gun emplacement",
    kind: "Military · modern",
    blurb:
      "Twentieth-century military fitting — Antikythera sat on strategic sea lanes well into WWII.",
    dig: "Modern noise for prehistoric chapters; ignore when hunting stone-age or Bronze Age glory.",
  },
  lighthouse: {
    art: "struct-lighthouse",
    title: "Lighthouse",
    kind: "Maritime landmark",
    blurb: "Coastal navigation aid — modern seamanship, not ancient pottery.",
    dig: "Use it to find yourself on the map, then dig inland farms and the northern citadel as needed.",
  },
};

const STRUCTURE_FALLBACK = {
  title: "Standing structure",
  kind: "Survey landmark",
  blurb:
    "A built or rock-cut feature recorded by the Antikythera Survey — houses, shelters, wells, presses, tombs, and more.",
  dig: "Read the type, then dig neighbouring fogged tracts for the pottery that dates the story.",
};
export {
  GEOLOGY_NOTES, GEOLOGY_FALLBACK, TERRACE_NOTES, TERRACE_FALLBACK,
  STRUCTURE_NOTES, STRUCTURE_FALLBACK,
};
