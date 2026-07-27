import { MAX_WORKERS, MIN_WORKERS, money } from '../game/state.js';

const FIELD_EVENTS = [
  {
    id: "benefactor",
    tone: "good",
    eyebrow: "Cable from Athens",
    title: "A wealthy benefactor",
    blurb:
      "A industrialist who once wintered on Kythera wires funds to your dig account — “for science, and a footnote.”",
    weight: 1.1,
    apply(s) {
      const n = 1200 + Math.floor(Math.random() * 1300);
      s.money += n;
      return `Purse +${money(n)}.`;
    },
  },
  {
    id: "students",
    tone: "good",
    eyebrow: "Boat from Piraeus",
    title: "Archaeology students arrive",
    blurb:
      "A sunburned seminar group staggers ashore with notebooks and idealism. They work for board and glory.",
    weight: 1,
    canFire(s) { return s.workers < MAX_WORKERS; },
    apply(s) {
      const n = Math.min(2, MAX_WORKERS - s.workers);
      s.workers += n;
      return `Crew +${n} (now ${s.workers}).`;
    },
  },
  {
    id: "tourists",
    tone: "mixed",
    eyebrow: "Day-trippers",
    title: "Tourists with deep pockets",
    blurb:
      "A steamer unloads sightseers hungry for “real archaeology.” They tip generously — and commandeer half your crew as guides.",
    weight: 1.15,
    canFire(s) { return s.workers >= 2; },
    apply(s) {
      const pay = 800 + Math.floor(Math.random() * 900);
      const busy = Math.max(1, Math.floor(s.workers / 2));
      s.money += pay;
      s.busyWorkers = busy;
      s.busyDigsLeft = 3;
      return `+${money(pay)}, but ${busy} digger${busy > 1 ? "s" : ""} busy with tourists for the next 3 digs.`;
    },
  },
  {
    id: "rainstorm",
    tone: "bad",
    eyebrow: "Weather report",
    title: "Aegean rainstorm",
    blurb:
      "The sky opens. Trenches flood, notebooks dissolve, and the foreman declares an early knock-off.",
    weight: 1.2,
    apply(s) {
      const d = 8 + Math.floor(Math.random() * 10);
      s.days = Math.max(0, s.days - d);
      return `−${d} days on the permit.`;
    },
  },
  {
    id: "desertion",
    tone: "bad",
    eyebrow: "Dawn roll-call",
    title: "Half the crew vanishes",
    blurb:
      "Beds empty, boots gone. Rumour says a better-paying survey on Crete — or a quarrel over last night’s raki.",
    weight: 0.85,
    canFire(s) { return s.workers >= 3; },
    apply(s) {
      const lost = Math.max(1, Math.floor(s.workers / 2));
      s.workers = Math.max(MIN_WORKERS, s.workers - lost);
      s.busyWorkers = Math.min(s.busyWorkers, Math.max(0, s.workers - 1));
      return `Crew −${lost} (now ${s.workers}).`;
    },
  },
  {
    id: "museum_grant",
    tone: "good",
    eyebrow: "Official letter",
    title: "Museum grant approved",
    blurb:
      "A dusty committee in Athens stamps your petition. The cheque is smaller than promised — still a cheque.",
    weight: 1,
    apply(s) {
      const n = 900 + Math.floor(Math.random() * 800);
      s.money += n;
      return `Purse +${money(n)}.`;
    },
  },
  {
    id: "fair_weather",
    tone: "good",
    eyebrow: "Barometer rising",
    title: "A week of perfect skies",
    blurb:
      "No wind, no rain, no ferry drama. The crew works like a machine and you claw back schedule.",
    weight: 1,
    apply(s) {
      const d = 6 + Math.floor(Math.random() * 8);
      s.days += d;
      return `+${d} days restored to the calendar.`;
    },
  },
  {
    id: "customs",
    tone: "bad",
    eyebrow: "Harbour office",
    title: "Customs seizes a crate",
    blurb:
      "Inspectors decide your “study collection” looks like smuggling. Fines, forms, and a lost afternoon.",
    weight: 1,
    apply(s) {
      const fine = 400 + Math.floor(Math.random() * 500);
      const d = 3 + Math.floor(Math.random() * 5);
      s.money = Math.max(0, s.money - fine);
      s.days = Math.max(0, s.days - d);
      return `−${money(fine)} · −${d} days.`;
    },
  },
  {
    id: "ferry_strike",
    tone: "bad",
    eyebrow: "Harbour gossip",
    title: "Ferry strike",
    blurb:
      "No boats, no bread, no new shovels. You wait for the mainland to remember Antikythera exists.",
    weight: 1,
    apply(s) {
      const d = 5 + Math.floor(Math.random() * 8);
      s.days = Math.max(0, s.days - d);
      return `−${d} days stranded.`;
    },
  },
  {
    id: "food_poisoning",
    tone: "bad",
    eyebrow: "Camp infirmary",
    title: "Bad octopus",
    blurb:
      "Last night’s stew was a mistake. Half the crew is green; trenches stay quiet.",
    weight: 1,
    canFire(s) { return s.workers >= 2; },
    apply(s) {
      const d = 4 + Math.floor(Math.random() * 5);
      s.days = Math.max(0, s.days - d);
      s.busyWorkers = Math.max(s.busyWorkers, Math.floor(s.workers / 2));
      s.busyDigsLeft = Math.max(s.busyDigsLeft, 2);
      return `−${d} days · half the crew sick for 2 digs.`;
    },
  },
  {
    id: "permit_paper",
    tone: "bad",
    eyebrow: "Ephorate memo",
    title: "Permit paperwork",
    blurb:
      "A missing stamp. A wrong form. A clerk who has never heard of your dig. Bureaucracy is its own archaeology.",
    weight: 1,
    apply(s) {
      const fine = 250 + Math.floor(Math.random() * 350);
      const d = 2 + Math.floor(Math.random() * 4);
      s.money = Math.max(0, s.money - fine);
      s.days = Math.max(0, s.days - d);
      return `−${money(fine)} · −${d} days.`;
    },
  },
  {
    id: "goats",
    tone: "bad",
    eyebrow: "Incident report",
    title: "Goats in the trench",
    blurb:
      "A local herd discovers your open squares. Context is scrambled; tempers are worse.",
    weight: 0.9,
    apply(s) {
      const g = 40 + Math.floor(Math.random() * 80);
      const d = 2 + Math.floor(Math.random() * 3);
      s.score = Math.max(0, s.score - g);
      s.days = Math.max(0, s.days - d);
      return `−${g} glory · −${d} days re-trowelling.`;
    },
  },
  {
    id: "rival",
    tone: "bad",
    eyebrow: "Camp rumour",
    title: "Rival team poaches a digger",
    blurb:
      "A smoother-talking director from another permit offers higher wages. One of yours takes the bait.",
    weight: 1,
    canFire(s) { return s.workers > MIN_WORKERS; },
    apply(s) {
      s.workers = Math.max(MIN_WORKERS, s.workers - 1);
      s.busyWorkers = Math.min(s.busyWorkers, Math.max(0, s.workers - 1));
      return `Crew −1 (now ${s.workers}).`;
    },
  },
  {
    id: "tent_storm",
    tone: "bad",
    eyebrow: "Night watch",
    title: "Gale shreds the tents",
    blurb:
      "Canvas flies toward Crete. You replace gear at island prices — which is to say, piracy.",
    weight: 1,
    apply(s) {
      const cost = 350 + Math.floor(Math.random() * 450);
      s.money = Math.max(0, s.money - cost);
      return `−${money(cost)} for new canvas and rope.`;
    },
  },
  {
    id: "journal",
    tone: "good",
    eyebrow: "Press cutting",
    title: "Your dig makes the papers",
    blurb:
      "A breathless column in a mainland paper calls you “the new Schliemann” — inaccurate, but useful.",
    weight: 0.95,
    apply(s) {
      const g = 80 + Math.floor(Math.random() * 120);
      s.score += g;
      return `+${g} glory.`;
    },
  },
  {
    id: "fisherman",
    tone: "good",
    eyebrow: "Harbour tip",
    title: "A fisherman’s tip",
    blurb:
      "Over coffee he sketches the northern cliffs: “Old walls up there, where the pirates watched the ships.”",
    weight: 1,
    apply(s) {
      const g = 50 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · check the northern citadel when you can.`;
    },
  },
  {
    id: "film_crew",
    tone: "mixed",
    eyebrow: "Hollywood on a mule",
    title: "A film crew barges in",
    blurb:
      "They pay for “atmosphere,” block your best trench for “continuity,” and leave cigarette butts in a Late Roman bag.",
    weight: 0.9,
    apply(s) {
      const pay = 600 + Math.floor(Math.random() * 700);
      const d = 3 + Math.floor(Math.random() * 4);
      s.money += pay;
      s.days = Math.max(0, s.days - d);
      return `+${money(pay)} · −${d} days of disruption.`;
    },
  },
  {
    id: "supply_boat",
    tone: "good",
    eyebrow: "Cargo manifest",
    title: "Supply boat early",
    blurb:
      "Tinned beef, fresh pencils, and a crate of decent wine arrive a week ahead of schedule.",
    weight: 1,
    apply(s) {
      const n = 500 + Math.floor(Math.random() * 400);
      const d = 3 + Math.floor(Math.random() * 4);
      s.money += n;
      s.days += d;
      return `+${money(n)} · +${d} days of morale.`;
    },
  },
  {
    id: "local_feast",
    tone: "mixed",
    eyebrow: "Village invitation",
    title: "Saint’s day feast",
    blurb:
      "You cannot refuse. Dancing until dawn, free lamb, and a crew that will not lift a trowel tomorrow.",
    weight: 0.95,
    apply(s) {
      const d = 1 + Math.floor(Math.random() * 2);
      const g = 30 + Math.floor(Math.random() * 40);
      s.days = Math.max(0, s.days - d);
      s.score += g;
      return `−${d} day${d > 1 ? "s" : ""} · +${g} glory (and a hangover).`;
    },
  },
  {
    id: "volunteer_priest",
    tone: "good",
    eyebrow: "Unexpected ally",
    title: "The priest lends a hand",
    blurb:
      "He knows every terrace path and every goat track. For a week, your survey lines run true.",
    weight: 0.9,
    apply(s) {
      const d = 4 + Math.floor(Math.random() * 5);
      s.days += d;
      if (s.workers < MAX_WORKERS && Math.random() < 0.4) {
        s.workers += 1;
        return `+${d} days · crew +1 (now ${s.workers}).`;
      }
      return `+${d} days of good guidance.`;
    },
  },
  {
    id: "earthquake",
    tone: "bad",
    eyebrow: "Seismograph",
    title: "A tremor cracks the baulk",
    blurb:
      "The island shrugs. A carefully cut wall collapses into the trench — a day of digging becomes a day of sorting rubble.",
    weight: 0.85,
    apply(s) {
      const d = 3 + Math.floor(Math.random() * 5);
      const g = 20 + Math.floor(Math.random() * 40);
      s.days = Math.max(0, s.days - d);
      s.score = Math.max(0, s.score - g);
      return `−${d} days · −${g} glory (context scrambled).`;
    },
  },
  {
    id: "eclipse",
    tone: "good",
    eyebrow: "Sky omen",
    title: "Solar eclipse over the dig",
    blurb:
      "Work stops. The crew watches the sun go out over the Aegean. Someone mutters about the Mechanism. Morale soars.",
    weight: 0.75,
    apply(s) {
      const g = 90 + Math.floor(Math.random() * 110);
      const d = 1;
      s.score += g;
      s.days = Math.max(0, s.days - d);
      return `+${g} glory · −${d} day of awe.`;
    },
  },
  {
    id: "wedding",
    tone: "mixed",
    eyebrow: "Village invitation",
    title: "You are guest of honour",
    blurb:
      "A wedding on the island — you cannot refuse. Wine, dancing, a gift purse… and a crew that sleeps until noon.",
    weight: 0.9,
    apply(s) {
      const pay = 200 + Math.floor(Math.random() * 300);
      const g = 40 + Math.floor(Math.random() * 50);
      const d = 1 + Math.floor(Math.random() * 2);
      s.money += pay;
      s.score += g;
      s.days = Math.max(0, s.days - d);
      return `+${money(pay)} gift · +${g} glory · −${d} day${d > 1 ? "s" : ""}.`;
    },
  },
  {
    id: "heatwave",
    tone: "bad",
    eyebrow: "Thermometer",
    title: "Heatwave shuts the trenches",
    blurb:
      "The rock radiates. Trowels burn to the touch. The foreman calls it: siesta until the haze breaks.",
    weight: 1,
    apply(s) {
      const d = 4 + Math.floor(Math.random() * 6);
      s.days = Math.max(0, s.days - d);
      return `−${d} days waiting out the sun.`;
    },
  },
  {
    id: "mechanism",
    tone: "good",
    eyebrow: "Dream from the deep",
    title: "A diver’s rumour",
    blurb:
      "An old sponge diver swears bronze gears once came up in a net north of the cape — a sky-machine older than the empire. You cannot dig the wreck from shore… but the rumour is glory enough to fill a museum.",
    weight: 0.45,
    canFire(s) {
      return (
        !s.mechanismFound &&
        (s.chaptersSolved.has("hellenistic") || (s.periods.Hell || 0) >= 2 || s.digsDone >= 10)
      );
    },
    apply(s) {
      s.mechanismFound = true;
      const g = 220 + Math.floor(Math.random() * 120);
      s.score += g;
      return `+${g} glory · the Mechanism enters the journal.`;
    },
  },
  {
    id: "philip-coin",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4327"],
    eyebrow: "Special find",
    title: "Philip’s copper",
    blurb:
      "In the sieve: a thumb-sized copper coin. The portrait is worn, but the catalogue already knows him — Philip II of Macedon, 359–336 BC. A king’s face from before Alexander, lying in Antikythera dust.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 200 + Math.floor(Math.random() * 100);
      s.score += g;
      return `+${g} glory · National Geographic would kill for this headline.`;
    },
  },
  {
    id: "binda-button",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["3017"],
    eyebrow: "Special find",
    title: "A Binda · Milano",
    blurb:
      "Not ancient gold — a copper-alloy button with a naval emblem on the face and, on the reverse, a maker’s boast: *A BINDA * MILANO. Some sailor’s coat left its calling card in the scrub.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 120 + Math.floor(Math.random() * 80);
      s.score += g;
      return `+${g} glory · modern flotsam with a story.`;
    },
  },
  {
    id: "bayonet",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["3003"],
    eyebrow: "Grid note",
    title: "Bayonet",
    blurb:
      "The square notebook is almost rude in its brevity: bayonet. Steel in the scrub — a soldier’s leftover, not a hoplite’s. Someone walked this grid and wrote one word that still rings.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 110 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · wartime iron in the catalogue.`;
    },
  },
  {
    id: "buckle",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["3004"],
    eyebrow: "Grid note",
    title: "Buckle?",
    blurb:
      "Next square over, equally terse: buckle? The question mark does half the work. Belt furniture, kit strap, or wishful thinking — the surveyors left the doubt in the record.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 90 + Math.floor(Math.random() * 60);
      s.score += g;
      return `+${g} glory · a question mark that stuck.`;
    },
  },
  {
    id: "american-clip",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["12394"],
    eyebrow: "Special find",
    title: "Possibly American?",
    blurb:
      "A copper-alloy bullet-clip turns up in a grab sample. The catalogue hedges: possibly American? Mid-century flotsam on a Classical isle — someone else’s war washing ashore in brass.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 130 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · WWII vibes, Aegean dust.`;
    },
  },
  {
    id: "cartridge",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["8102"],
    eyebrow: "Special find",
    title: "Pinched & pierced",
    blurb:
      "A cartridge case, pinched and pierced — spent, then punched for string or scrap. Not a museum piece; a field note with a bang still echoing in the metal.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 100 + Math.floor(Math.random() * 60);
      s.score += g;
      return `+${g} glory · brass with a second life.`;
    },
  },
  {
    id: "gunstock",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["8143"],
    eyebrow: "Special find",
    title: "Gunstock?",
    blurb:
      "Iron in the bag, labelled gunstock? — the surveyor’s shrug preserved forever. Stock furniture, trigger guard, or something else entirely. The question mark earns its keep.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 100 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · another lonely “?” in the ledger.`;
    },
  },
  {
    id: "lepta-coin",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["8058"],
    eyebrow: "Special find",
    title: "Two lepta, pierced",
    blurb:
      "A humble 2-lepta copper, pierced for suspension — worn as a charm, not spent at market. Someone hung a coin around a neck on this rock. Cheap metal; expensive story.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 140 + Math.floor(Math.random() * 80);
      s.score += g;
      return `+${g} glory · jewelry from small change.`;
    },
  },
  {
    id: "solarised-glass",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["10195"],
    eyebrow: "Special find",
    title: "Solarised purple",
    blurb:
      "Light purple glass — solarised? — the faceted base of a bottle about 5 cm across. Sunlight chemically blushed the glass; the catalogue kept the question, and the colour kept the mystery.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 120 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · sun-bleached glass in the bag.`;
    },
  },
  {
    id: "fish-scale-glass",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["3019"],
    eyebrow: "Special find",
    title: "Fish-scale glass",
    blurb:
      "Light blue glass with a raised fish-scale pattern on the exterior. Decorative, deliberate, a little flashy for a speck of island — someone liked their bottles fancy.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 130 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · scales without the fish.`;
    },
  },
  {
    id: "blue-bead",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["8071"],
    eyebrow: "Special find",
    title: "Imitation stone",
    blurb:
      "A blue glass bead with white incised lines — probably meant to imitate cut stone. Fake gemstone, real craft. The wearer wanted marble; they got glass and attitude.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 140 + Math.floor(Math.random() * 80);
      s.score += g;
      return `+${g} glory · costume jewelry of antiquity.`;
    },
  },
  {
    id: "rotary-quern",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4050"],
    eyebrow: "Special find",
    title: "Rotary quern · 34 cm",
    blurb:
      "A rotary quern with a circular hole and two flat sides — diameter 34 cm. Farm furniture you can still feel in your shoulders. Grain was ground here; the island ate.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 150 + Math.floor(Math.random() * 80);
      s.score += g;
      return `+${g} glory · bread’s heavy cousin.`;
    },
  },
  {
    id: "bee-swarm",
    tone: "mixed",
    once: true,
    weight: 0,
    relicTracts: ["8001"],
    eyebrow: "Walker dispatch",
    title: "Bee stings & swarms",
    blurb:
      "Walkers 002 & 005 abandon their lines — bee stings and chasing swarms. Replacements clock in at 11:35. The archaeology waits; the bees do not.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 80 + Math.floor(Math.random() * 50);
      const d = 2 + Math.floor(Math.random() * 3);
      s.score += g;
      s.days = Math.max(0, s.days - d);
      return `+${g} glory · −${d} days (first aid & courage).`;
    },
  },
  {
    id: "dead-bunny",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["15072"],
    eyebrow: "Walker dispatch",
    title: "Dead bunny",
    blurb:
      "The tract note opens without ceremony: Dead bunny. Then rock caves, cuttings, and a square limestone block. Science continues. The bunny does not.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 70 + Math.floor(Math.random() * 50);
      s.score += g;
      return `+${g} glory · shortest field note, longest memory.`;
    },
  },
  {
    id: "recent-bones",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["1006"],
    eyebrow: "Walker dispatch",
    title: "Recent bones",
    blurb:
      "Rock overhang with recent bones in it — not the glamorous kind. Modern brick nearby, half-finished house upslope. The past shares the ledge with whoever slept here last.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 90 + Math.floor(Math.random() * 60);
      s.score += g;
      return `+${g} glory · context, not treasure.`;
    },
  },
  {
    id: "goat-skull",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["11190"],
    eyebrow: "Walker dispatch",
    title: "Walker 48’s goat skull",
    blurb:
      "Sherds: orange, fine. And then, casually: Walker 48 found a goat skull. No drama in the notebook. Plenty in the bag.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 85 + Math.floor(Math.random() * 55);
      s.score += g;
      return `+${g} glory · osteology by accident.`;
    },
  },
  {
    id: "dead-goat-cavity",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4219"],
    eyebrow: "Walker dispatch",
    title: "Dead goat inside",
    blurb:
      "A bedrock cavity — probably natural — with a dead goat inside. A few sherds around the rim, including red micaceous. Nature reclaimed the niche first; pottery came second.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 95 + Math.floor(Math.random() * 55);
      s.score += g;
      return `+${g} glory · pastoral archaeology at its frankest.`;
    },
  },
  {
    id: "goat-carcass-cave",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["1065"],
    eyebrow: "Walker dispatch",
    title: "Cave · carcass · tomb?",
    blurb:
      "Large cave at 70–80 m: lots of goat droppings and a goat carcass. Probably — (illegible). And possibly a tomb. The notebook holds its nose and keeps writing.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 110 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · sacred and unsanitary.`;
    },
  },
  {
    id: "snail-tomb",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["1064"],
    eyebrow: "Walker dispatch",
    title: "Full of snails",
    blurb:
      "Deepish rock cavity, full of snails. Possible tomb? The surveyors put the fauna first and the funerary question second. Both may be correct.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 100 + Math.floor(Math.random() * 60);
      s.score += g;
      return `+${g} glory · gastropods hold the ground.`;
    },
  },
  {
    id: "snail-cobbling",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["7058"],
    eyebrow: "Walker dispatch",
    title: "Snails & cobbling?",
    blurb:
      "Plenty of plastic, four old houses, a well — and a large concentration of snail shells. Wooden something hanging from the eaves; possible cobbling industry. Domestic life, messy and legible.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 105 + Math.floor(Math.random() * 65);
      s.score += g;
      return `+${g} glory · industry or lunch? Both.`;
    },
  },
  {
    id: "furniture-pigeons",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4163"],
    eyebrow: "Walker dispatch",
    title: "Furniture & pigeons",
    blurb:
      "An old house, partially collapsed, still filled with old furniture and equipment — pigeons kept in one room. The past didn’t pack. It just stopped locking the door.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 120 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · domestic archaeology with feathers.`;
    },
  },
  {
    id: "foil-house",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4285"],
    eyebrow: "Walker dispatch",
    title: "House of foil man",
    blurb:
      "House of foil and a small private church — built by house of foil man — holy mother Mirtodiossa and saints Nektarios and Nicholas. Modern devotion wrapped in shiny scrap. The sherds are mostly recent; the faith is not.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 150 + Math.floor(Math.random() * 90);
      s.score += g;
      return `+${g} glory · three saints and a roll of foil.`;
    },
  },
  {
    id: "underground-sanctuary",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["4303"],
    eyebrow: "Walker dispatch",
    title: "Underground sanctuary",
    blurb:
      "Walker 29 passes over an underground sanctuary — 3–4 chambers, main entrance, second overhead opening. Nearby: rock cavities with built walls, and the high end of a shipshed. The citadel’s underworld peeks through.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 200 + Math.floor(Math.random() * 100);
      s.score += g;
      return `+${g} glory · chambers under the scrub.`;
    },
  },
  {
    id: "andronicos-mill",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["8294"],
    eyebrow: "Standing structure",
    title: "Andronicos",
    blurb:
      "A watermill on the map, tagged simply “Andronicos.” A name stuck to stone and water — someone’s mill, someone’s pride, now a survey point with a surname.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 130 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · a name that outlived the wheel.`;
    },
  },
  {
    id: "lighthouse-1926",
    tone: "good",
    once: true,
    weight: 0,
    relicTracts: ["12387"],
    eyebrow: "Standing structure",
    title: "Lighthouse · 1926",
    blurb:
      "The lighthouse comment is a date: built in 1926. Modern light on ancient rock — ships still needed a warning, and the surveyors still needed a landmark.",
    canFire() {
      return false;
    },
    apply(s) {
      const g = 120 + Math.floor(Math.random() * 70);
      s.score += g;
      return `+${g} glory · a century of warning flashes.`;
    },
  },
];

/** Relics tied to real survey tracts / structures (weight 0 — dig-triggered only). */
export function relicEvents() {
  return FIELD_EVENTS.filter((ev) => Array.isArray(ev.relicTracts) && ev.relicTracts.length);
}

/** Field notes for landscape desk (geology Type → dig guidance). */
export { FIELD_EVENTS };
