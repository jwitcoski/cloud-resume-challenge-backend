const MYSTERY = [
  {
    id: "neolithic",
    label: "Stone-age hunters",
    keys: ["MNLN", "FNEB1"],
    need: 8,
    museumBonus: 900,
    gloryBonus: 60,
    when: "Late Neolithic → early Bronze · c. 5th–3rd mill. BC",
    blurb:
      "Not villages — short visits by mobile groups tied to the Cyclades. They left Melian obsidian and local chert tools: hunting kits more than farmsteads.",
    story:
      "You have enough early lithics and rare early pottery to write the island’s opening chapter. Antikythera was not yet a settled farmscape — it was a stop on a wider Aegean network. Melian obsidian means boats, contacts, and hunters who knew these coasts long before the palaces of Crete.",
    where:
      "Sparse lithic scatters, mostly the southern half. Projectiles tend to hug the coasts; blade debris sits a little inland.",
    look: "Lithics first; early pottery is scarce.",
    hint: { lng: 23.308, lat: 35.864, radiusKm: 1.4, zoom: 13.4 },
  },
  {
    id: "bronze",
    label: "Bronze Age farms",
    keys: ["EB2", "LPrePal", "FPal", "SPal", "TPal"],
    need: 40,
    museumBonus: 1400,
    gloryBonus: 100,
    when: "Bronze Age · Minoan-linked centuries",
    blurb:
      "Small farming families working fertile pockets, with strong cultural links to Crete during the palace period — Antikythera’s densest prehistoric landscape.",
    story:
      "The museum will take this seriously: a solid Bronze Age farmscape with Cretan ties. These were not pirates yet — they were households on soft soils and terraces, plugged into the world of the Minoan palaces. Antikythera briefly looked like a proper agricultural island.",
    where:
      "Concentrate on the south and centre. Look for soft soils and terrace country, not the rocky northern tip.",
    look: "Pottery-heavy tracts (especially Early Bronze / EB2).",
    hint: { lng: 23.305, lat: 35.866, radiusKm: 1.8, zoom: 13.1 },
  },
  {
    id: "hellenistic",
    label: "Pirate stronghold",
    keys: ["Hell", "Class", "Arch"],
    need: 6,
    museumBonus: 1600,
    gloryBonus: 120,
    when: "Hellenistic · late 4th → mid-1st c. BC",
    blurb:
      "A fortified community perched on the island’s shipping lanes — the same strategic waters that later claimed the famous Antikythera wreck and its geared mechanism.",
    story:
      "The northern citadel comes into focus: a fortified Hellenistic community watching the sea lanes. Same centuries as the wreck that made “Antikythera” a household word — pirates, refugees, and hard power on a rock that commanded the channel between Crete and the Peloponnese.",
    where:
      "Almost entirely the northern tip. If you dig south of the waist of the island, you are hunting the wrong century.",
    look: "Hellenistic pottery and standing structures near the citadel coast.",
    hint: { lng: 23.296, lat: 35.887, radiusKm: 0.9, zoom: 14.0 },
  },
  {
    id: "roman",
    label: "Late Roman villages",
    keys: ["ERom", "MRom", "LRom"],
    need: 20,
    museumBonus: 1200,
    gloryBonus: 90,
    when: "Roman → Late Roman",
    blurb:
      "After earlier abandonments, a clutch of farming villages re-seeded the island. Late Roman sherds are among the survey’s commonest finds.",
    story:
      "You have mapped a Late Roman reoccupation — not one capital, but several farming villages after earlier abandonments. The sherds are common for a reason: this is when the island again looked lived-in, with fields, water works, and ordinary imperial-era life.",
    where:
      "Scattered mid- and southern settlements rather than one capital. Several modest clusters beat one big hole.",
    look: "Broad pottery spreads — Late Roman (LRom) especially.",
    hint: { lng: 23.301, lat: 35.868, radiusKm: 1.7, zoom: 13.0 },
  },
  {
    id: "byzantine",
    label: "Byzantine return",
    keys: ["EByz", "MByz"],
    need: 4,
    museumBonus: 1100,
    gloryBonus: 80,
    when: "Early–Middle Byzantine",
    blurb:
      "A thin reoccupation after Late Antique decline — glimpses more than towns. Easy to miss unless you are reading the labels.",
    story:
      "Byzantine material is scarce and precious. You have enough to argue for a thin return after Late Antique decline — not a boom town, but a stubborn foothold. The museum loves rare periods; every sherd here is a footnote that almost did not survive.",
    where:
      "Sparse southern finds. Treat every Byzantine sherd as precious; the chapter is short.",
    look: "Rare EByz / MByz pottery in already-promising southern tracts.",
    hint: { lng: 23.306, lat: 35.861, radiusKm: 1.3, zoom: 13.3 },
  },
];
export { MYSTERY };
