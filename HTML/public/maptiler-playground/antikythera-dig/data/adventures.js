/**
 * Connected side-path saga: binary tree of choices → one of 25 survey relics.
 * Choices fork the middle; each leaf cluster highlights a real tract-tied find.
 */
export const SIDE_PATH_ID = "side-path";

/** Theme clusters → relic event ids from field-events.js */
export const RELIC_CLUSTERS = {
  war: ["bayonet", "buckle", "american-clip", "cartridge", "gunstock"],
  glass: ["lepta-coin", "solarised-glass", "fish-scale-glass", "blue-bead", "binda-button"],
  farm: ["rotary-quern", "bee-swarm", "andronicos-mill"],
  domestic: ["furniture-pigeons", "foil-house", "snail-cobbling"],
  fauna: ["snail-tomb", "dead-goat-cavity", "goat-carcass-cave"],
  bones: ["recent-bones", "goat-skull", "dead-bunny"],
  sacred: ["underground-sanctuary", "philip-coin"],
  landmark: ["lighthouse-1926", "binda-button", "american-clip"],
};

export const ADVENTURES = [
  {
    id: SIDE_PATH_ID,
    title: "Side Path",
    folioLabel: "The trail found something",
    art: "images/events/adventure-gift-shop-idol.png",
    beats: [
      /* —— Layer 1: Coast or hills —— */
      {
        afterDigs: 3,
        start: "lead",
        art: "images/events/adventure-map-room-b0.png",
        nodes: {
          lead: {
            eyebrow: "Map Room",
            title: "Where does the trail go?",
            blurb:
              "Chalk rings crowd the bedsheet. One arrow points to the harbour cliffs and wartime flotsam. Another climbs inland toward goat paths, wine presses, and older stone. Which lead do you chase?",
            yes: "Harbour & coast",
            no: "Hills & goats",
            yesNext: "lead_coast",
            noNext: "lead_hills",
            art: "images/events/adventure-map-room-b0.png",
          },
          lead_coast: {
            eyebrow: "Coast lead",
            title: "Salt and scrap",
            blurb:
              "You circle the harbour approaches. Brass, glass, and sailors’ leftovers — the kind of finds that wash in and never quite leave.",
            flag: "path_coast",
            nextBeat: true,
            art: "images/events/adventure-ark-crate-b0.png",
          },
          lead_hills: {
            eyebrow: "Hills lead",
            title: "Goat country",
            blurb:
              "You mark the inland ridges. Wine-press terraces, rock cavities, and enough goats to populate a myth. The chalk skull looks pleased.",
            flag: "path_hills",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol-b1.png",
          },
        },
      },

      /* —— Layer 2: fork within path —— */
      {
        afterDigs: 7,
        startFor(flags) {
          return flags.has("path_coast") ? "harbor_ask" : "hills_ask";
        },
        nodes: {
          harbor_ask: {
            eyebrow: "Harbour ridge",
            title: "War junk or village lanes?",
            blurb:
              "Downslope: cartridges, clips, and kit that never made it home. Along the lanes: querns, ruined parlours, and glass charms on string. Which scatter do you walk?",
            yes: "War flotsam",
            no: "Village & farm",
            yesNext: "harbor_war",
            noNext: "harbor_village",
            art: "images/events/adventure-rival-whip-b0.png",
          },
          harbor_war: {
            eyebrow: "Scrap line",
            title: "Metal in the scrub",
            blurb:
              "You bag a mental map of brass and iron — and a glitter of purple glass from a sailor’s dump. Next fork will decide which catalogue page you open.",
            flag: "branch_war",
            nextBeat: true,
            art: "images/events/event-bayonet.png",
          },
          harbor_village: {
            eyebrow: "Terrace lanes",
            title: "Domestic scatter",
            blurb:
              "Querns, bee boxes, collapsed houses still full of someone else’s furniture. The island’s recent past is loud here.",
            flag: "branch_village",
            nextBeat: true,
            art: "images/events/adventure-map-room.png",
          },

          hills_ask: {
            eyebrow: "Inland noon",
            title: "Heat — or the citadel?",
            blurb:
              "The rock radiates. Someone passes a flask of raki “for science.” Inland also rises the old fortified ridge. Push into the heat haze, or climb toward ashlar and chambers?",
            yes: "Heat & raki",
            no: "Citadel stone",
            yesNext: "hills_heat",
            noNext: "hills_citadel",
            art: "images/events/event-heatwave.png",
          },
          hills_heat: {
            eyebrow: "Thermometer",
            title: "The haze thickens",
            blurb:
              "You drink. The horizon softens. Goat bells sound almost like pipes. The foreman says you’ll “see things” before you see sherds. He is not wrong.",
            flag: "branch_heat",
            nextBeat: true,
            art: "images/events/event-heatwave.png",
          },
          hills_citadel: {
            eyebrow: "Ashlar",
            title: "Toward the stronghold",
            blurb:
              "City-wall courses and a rumour of chambers under the scrub. Kings’ copper and underground sanctuaries belong to this kind of ground.",
            flag: "branch_citadel",
            nextBeat: true,
            art: "images/events/event-underground-sanctuary.png",
          },
        },
      },

      /* —— Layer 3: final fork (+ satyr on heat path) —— */
      {
        afterDigs: 12,
        startFor(flags) {
          if (flags.has("branch_war")) return "war_ask";
          if (flags.has("branch_village")) return "village_ask";
          if (flags.has("branch_heat")) return "satyr_vision";
          return "citadel_ask";
        },
        nodes: {
          /* Coast → war branch: metal OR glass charms */
          war_ask: {
            eyebrow: "Metal detector, imaginary",
            title: "Iron — or glass?",
            blurb:
              "One grid note is almost rude: bayonet. Another hedges: buckle? A grab sample away: solarised purple bottles and a lepta pierced for a necklace. Narrow the hunt.",
            yes: "War iron",
            no: "Glass & charms",
            yesNext: "leaf_war",
            noNext: "leaf_glass",
            art: "images/events/event-bayonet.png",
          },
          leaf_war: {
            eyebrow: "Trail ends",
            title: "War flotsam",
            blurb:
              "The side path pins wartime iron in the scrub. Dig the marked tract — the catalogue already has a name for what’s waiting.",
            flag: "leaf_war",
            endingCluster: "war",
            finale: true,
            art: "images/events/event-buckle.png",
          },
          leaf_glass: {
            eyebrow: "Trail ends",
            title: "Harbor glass",
            blurb:
              "Pierced lepta, solarised bottles, fish-scale glass, a bead that wanted to be stone — sailors’ leftovers with sun in them.",
            flag: "leaf_glass",
            endingCluster: "glass",
            finale: true,
            art: "images/events/event-lepta-coin.png",
          },

          /* Coast → village */
          village_ask: {
            eyebrow: "Farm edge",
            title: "Millstone or doorway?",
            blurb:
              "A 34 cm rotary quern still looks heavy on the page. A few tracts over: pigeons in a ruined parlour, foil-wrapped faith, snail-shell “industry.” Which door?",
            yes: "Farm & bees",
            no: "Collapsed house",
            yesNext: "leaf_farm",
            noNext: "leaf_domestic",
            art: "images/events/event-rotary-quern.png",
          },
          leaf_farm: {
            eyebrow: "Trail ends",
            title: "Farm furniture",
            blurb:
              "Quern, mill, or bee-stung survey line — the side path has chosen the working island, not the mythical one.",
            flag: "leaf_farm",
            endingCluster: "farm",
            finale: true,
            art: "images/events/event-rotary-quern.png",
          },
          leaf_domestic: {
            eyebrow: "Trail ends",
            title: "Someone still lived here",
            blurb:
              "Furniture, foil, saints, and snail concentrations — domestic ruin with a paper trail. The marked square is waiting.",
            flag: "leaf_domestic",
            endingCluster: "domestic",
            finale: true,
            art: "images/events/event-furniture-pigeons.png",
          },

          /* Hills → heat → satyr → fauna/bones */
          satyr_vision: {
            eyebrow: "Heat & raki",
            title: "Something pipes in the scrub",
            blurb:
              "Dehydration plus last night’s toast. On the ridge: a figure — goat legs, human torso, reed pipe catching the wind. Pan’s cousin, or the island laughing at you. Do you follow?",
            yes: "Follow the satyr",
            no: "Sit down · drink water",
            yesNext: "satyr_chase",
            noNext: "satyr_water",
            art: "images/events/adventure-satyr-vision.png",
          },
          satyr_chase: {
            eyebrow: "Hallucination?",
            title: "Hooves in the maquis",
            blurb:
              "You scramble after it. Bells. A flash of horn. Then only a billy goat chewing a thistle, deeply unimpressed by classical mythology.",
            flag: "saw_satyr",
            yes: "Cave of snails",
            no: "Bones & overhangs",
            yesNext: "leaf_fauna",
            noNext: "leaf_bones",
            art: "images/events/event-goats.png",
          },
          satyr_water: {
            eyebrow: "Sobriety",
            title: "Still a goat",
            blurb:
              "You sit, hydrate, and wait. The ‘satyr’ walks over and tries to eat your notebook. Same billy. Same thistle. Mythology resigns.",
            flag: "saw_satyr",
            yes: "Cave of snails",
            no: "Bones & overhangs",
            yesNext: "leaf_fauna",
            noNext: "leaf_bones",
            art: "images/events/event-goats.png",
          },
          leaf_fauna: {
            eyebrow: "Trail ends",
            title: "Cavities & shells",
            blurb:
              "Snail tombs, dead goats in bedrock niches, carcass caves that might be graves — the satyr was a goat, but the cavities are real.",
            flag: "leaf_fauna",
            endingCluster: "fauna",
            finale: true,
            art: "images/events/event-snail-tomb.png",
          },
          leaf_bones: {
            eyebrow: "Trail ends",
            title: "Recent bones",
            blurb:
              "Overhangs with bones, a walker noting a goat skull, a field note that opens ‘Dead bunny.’ The path gets frank. Dig carefully.",
            flag: "leaf_bones",
            endingCluster: "bones",
            finale: true,
            art: "images/events/event-goat-skull.png",
          },

          /* Hills → citadel */
          citadel_ask: {
            eyebrow: "Stronghold",
            title: "Sanctuary or beacon?",
            blurb:
              "Underground chambers and a shipshed rumour pull one way. A lighthouse stamped 1926 pulls another — modern light on ancient rock. Which monument?",
            yes: "Underground sanctuary",
            no: "Lighthouse & later scrap",
            yesNext: "leaf_sacred",
            noNext: "leaf_landmark",
            art: "images/events/event-underground-sanctuary.png",
          },
          leaf_sacred: {
            eyebrow: "Trail ends",
            title: "Chambers under the scrub",
            blurb:
              "Sanctuary niches or a king’s copper in the dust — the citadel path has named its square. Glory likes rare periods and clearer portraits.",
            flag: "leaf_sacred",
            endingCluster: "sacred",
            finale: true,
            art: "images/events/event-philip-coin.png",
          },
          leaf_landmark: {
            eyebrow: "Trail ends",
            title: "Built in 1926",
            blurb:
              "The lighthouse date is a survey comment that stuck. Nearby modern scrap still tells sailor stories. The chart inks the landmark tract.",
            flag: "leaf_landmark",
            endingCluster: "landmark",
            finale: true,
            art: "images/events/event-lighthouse-1926.png",
          },
        },
      },
    ],
    reward(s, flags) {
      const g = 60 + Math.floor(Math.random() * 40);
      s.score += g;
      const satyr = flags && flags.has("saw_satyr") ? " · satyr was a goat" : "";
      return `+${g} glory · side path closed${satyr}`;
    },
  },
];
