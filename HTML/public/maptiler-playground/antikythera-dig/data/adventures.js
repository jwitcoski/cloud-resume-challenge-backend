/**
 * One connected Indiana-Jones side path for the season.
 * Choices fork the middle (and set light flags); every route ends the same.
 */
export const SIDE_PATH_ID = "side-path";

export const ADVENTURES = [
  {
    id: SIDE_PATH_ID,
    title: "Side Path",
    folioLabel: "It belongs in a gift shop",
    art: "images/events/adventure-gift-shop-idol.png",
    beats: [
      /* —— 1. Map Room —— */
      {
        afterDigs: 2,
        start: "map_ask",
        art: "images/events/adventure-map-room-b0.png",
        nodes: {
          map_ask: {
            eyebrow: "Mess tent",
            title: "The Map Room",
            blurb:
              "Your foreman pins a bedsheet to the wall and declares a Map Room. Draw tomorrow’s digs in chalk — or keep the plan in your head like a mysterious protagonist?",
            yes: "Chalk it",
            no: "Stay cryptic",
            yesNext: "map_chalk",
            noNext: "map_cryptic",
          },
          map_chalk: {
            eyebrow: "Doctrine",
            title: "Circles upon circles",
            blurb:
              "Bold rings, a skull for morale, coffee rings as “contour lines.” The sheet looks like a conspiracy board. Perfect.",
            flag: "chalked",
            nextBeat: true,
            art: "images/events/adventure-map-room-b0.png",
          },
          map_cryptic: {
            eyebrow: "Aura",
            title: "They chalk anyway",
            blurb:
              "You stay enigmatic. By evening the sheet is covered in rings drawn from rumour. Same conspiracy board — less of your handwriting. The skull is already there.",
            flag: "cryptic",
            nextBeat: true,
            art: "images/events/adventure-map-room-b0.png",
          },
        },
      },

      /* —— 2. Harbour tip —— */
      {
        afterDigs: 4,
        startFor(flags) {
          return flags.has("chalked") ? "tip_chalk" : "tip_cryptic";
        },
        art: "images/events/adventure-gift-shop-idol-b0.png",
        nodes: {
          tip_chalk: {
            eyebrow: "Harbour café",
            title: "A stranger notices your rings",
            blurb:
              "A sunburned stranger eyes the chalk dust on your cuff. “Golden idol in a cliff cave — worth more than your season. Your Map Room already circled the right ridge.” Hear him out?",
            yes: "Buy him coffee",
            no: "Walk away",
            yesNext: "tip_yes",
            noNext: "tip_no",
            art: "images/events/adventure-gift-shop-idol-b0.png",
          },
          tip_cryptic: {
            eyebrow: "Harbour café",
            title: "A stranger’s tip",
            blurb:
              "A sunburned stranger leans over your coffee: “Golden idol in a cliff cave. Worth more than your whole season.” You’re the mysterious type — does that include listening?",
            yes: "Buy him coffee",
            no: "Walk away",
            yesNext: "tip_yes",
            noNext: "tip_no",
            art: "images/events/adventure-gift-shop-idol-b0.png",
          },
          tip_yes: {
            eyebrow: "Napkin cartography",
            title: "Olive-oil map",
            blurb:
              "He sketches cliffs in olive oil on a napkin. “Mind the goats — and the rival with the whip.” He vanishes toward the ferry. You keep the napkin. Obviously.",
            flag: "talked",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol-b0.png",
          },
          tip_no: {
            eyebrow: "You walk away",
            title: "Still on the table",
            blurb:
              "You leave. The napkin is under your cup anyway — same greasy cliffs, same goat warning, a doodle of a whip. Destiny has poor manners.",
            flag: "left_tip",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol-b0.png",
          },
        },
      },

      /* —— 3. Rival —— */
      {
        afterDigs: 7,
        start: "rival_dock",
        art: "images/events/adventure-rival-whip-b0.png",
        nodes: {
          rival_dock: {
            eyebrow: "Ferry landing",
            title: "A smoother hat",
            blurb:
              "A rival dig director steps off the ferry cracking what looks like a whip. He’s holding a copy of your napkin sketch. Challenge him — or chase the cave before he does?",
            yes: "Challenge him",
            no: "Race the cave",
            yesNext: "rival_duel",
            noNext: "rival_sprint",
            art: "images/events/adventure-rival-whip-b0.png",
          },
          rival_duel: {
            eyebrow: "Academic duel",
            title: "Bootlace diplomacy",
            blurb:
              "“First diagnostic sherd buys the raki.” His whip is a leather bootlace on a stick. You both pretend not to notice. He’ll still be on your ridge at dawn.",
            flag: "duelled",
            nextBeat: true,
            art: "images/events/adventure-rival-whip-b0.png",
          },
          rival_sprint: {
            eyebrow: "Head start",
            title: "Still on your terrace",
            blurb:
              "You bolt inland with the napkin. An hour later he’s somehow on your terrace anyway, cracking the bootlace at a thistle. Subplots insist.",
            flag: "sprinted",
            nextBeat: true,
            art: "images/events/adventure-rival-whip-b1.png",
          },
        },
      },

      /* —— 4. Bridge / ridge —— */
      {
        afterDigs: 10,
        startFor(flags) {
          return flags.has("duelled") ? "ridge_race" : "ridge_alone";
        },
        art: "images/events/adventure-gift-shop-idol-b1.png",
        nodes: {
          ridge_race: {
            eyebrow: "Dawn ridge",
            title: "Survey race",
            blurb:
              "Two crews, one ridge, too much pride. The napkin points past a rope bridge of optimistic carpentry. Take the bridge for glory — or the long path for ankles?",
            yes: "Cross the bridge",
            no: "Go around",
            yesNext: "bridge_cross",
            noNext: "bridge_around",
            art: "images/events/adventure-rival-whip-b1.png",
          },
          ridge_alone: {
            eyebrow: "Above the harbour",
            title: "Rotting boards",
            blurb:
              "The napkin leads to a goat path and that rope bridge. One board is already a memory. Your rival’s bootlace cracks somewhere behind you. Cross — or scramble around?",
            yes: "Cross",
            no: "Go around",
            yesNext: "bridge_cross",
            noNext: "bridge_around",
            art: "images/events/adventure-gift-shop-idol-b1.png",
          },
          bridge_cross: {
            eyebrow: "Structural archaeology",
            title: "Third board snaps",
            blurb:
              "You make it. Barely. Same ledge either way — cave mouth ahead, a sealed niche to the left, and something wooden glinting on the beach below.",
            flag: "bridged",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol-b1.png",
          },
          bridge_around: {
            eyebrow: "The scenic route",
            title: "More scrapes, same view",
            blurb:
              "Extra thorns, same ledge. Cave mouth ahead, sealed niche left, wooden crate flashing on the tide below. The bridge laughs in the wind.",
            flag: "around",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol-b1.png",
          },
        },
      },

      /* —— 5. Fork: crate vs snails (choice matters here) —— */
      {
        afterDigs: 13,
        start: "fork_ask",
        art: "images/events/adventure-ark-crate-b0.png",
        nodes: {
          fork_ask: {
            eyebrow: "Two distractions",
            title: "Beach or niche?",
            blurb:
              "Below: a sealed crate with warnings in three languages. Beside you: a rock niche scraping from inside. The idol cave can wait one dig. Which rabbit hole?",
            yes: "The crate",
            no: "The niche",
            yesNext: "crate_path",
            noNext: "snail_path",
            art: "images/events/adventure-ark-crate-b0.png",
          },
          crate_path: {
            eyebrow: "Morning tide",
            title: "Do not open that crate",
            blurb:
              "Four diggers, one pulley. The crate sits under a tarp labelled DO NOT OPEN in your handwriting. Something ticks once — a loose hoop. You feel very professional.",
            flag: "crate_first",
            nextBeat: true,
            art: "images/events/adventure-ark-crate-b1.png",
          },
          snail_path: {
            eyebrow: "Torchlight",
            title: "Why did it have to be snails?",
            blurb:
              "The slab shifts. A polite avalanche of shells — no curses, no snakes, just gastropods with union density. You write “fauna” like a professional. The crate can wait.",
            flag: "snails_first",
            nextBeat: true,
            art: "images/events/adventure-why-snails-b0.png",
          },
        },
      },

      /* —— 6. The other distraction —— */
      {
        afterDigs: 16,
        startFor(flags) {
          return flags.has("crate_first") ? "other_snails" : "other_crate";
        },
        nodes: {
          other_snails: {
            eyebrow: "Still on the ledge",
            title: "The niche won’t wait",
            blurb:
              "Curiosity circles back. You crack the niche — snails, of course — then belly-crawl toward a gleam that is wet limestone. A junior applauds from safety. Time for the cave.",
            yes: "Into the cave",
            no: "Send the junior",
            yesNext: "cave_enter",
            noNext: "cave_junior",
            art: "images/events/adventure-why-snails-b1.png",
          },
          other_crate: {
            eyebrow: "Still on the beach",
            title: "About that crate",
            blurb:
              "The tarp rustles. You peek: straw, a customs stamp, a storeroom smell. Loose hoop ticks. Athens will want an inventory later. The cave won’t inventory itself.",
            yes: "Into the cave",
            no: "Send the junior",
            yesNext: "cave_enter",
            noNext: "cave_junior",
            art: "images/events/adventure-ark-crate-b1.png",
          },
          cave_enter: {
            eyebrow: "Cave mouth",
            title: "Something gleams",
            blurb:
              "Dust motes like a spotlight. A figure on a pedestal. Whip music plays only in your head. Take it?",
            yes: "Take it",
            no: "Leave it",
            yesNext: "idol_take",
            noNext: "idol_leave",
            art: "images/events/adventure-gift-shop-idol.png",
          },
          cave_junior: {
            eyebrow: "Delegation",
            title: "Same gleam",
            blurb:
              "The junior reports a pedestal, a gleam, and an urgent need for adult supervision. You’re in the cave anyway. Take the idol?",
            yes: "Take it",
            no: "Leave it",
            yesNext: "idol_take",
            noNext: "idol_leave",
            art: "images/events/adventure-gift-shop-idol.png",
          },
          idol_take: {
            eyebrow: "Click",
            title: "Pedestal trap",
            blurb:
              "The stone clicks. Distant rumble. You snatch a plaster tourist knick-knack — Made in Piraeus. The rumble was a goat kicking a tin sheet. Outside, the rival waits with raki and the bootlace.",
            flag: "took_idol",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol.png",
          },
          idol_leave: {
            eyebrow: "Wisdom",
            title: "Still clicks",
            blurb:
              "You leave it. A goat bumps the pedestal anyway. Same click, same plaster souvenir at your boots — Made in Piraeus. Outside: rival, raki, bootlace.",
            flag: "left_idol",
            nextBeat: true,
            art: "images/events/adventure-gift-shop-idol.png",
          },
        },
      },

      /* —— 7. Finale — always the same ending —— */
      {
        afterDigs: 19,
        startFor(flags) {
          if (flags.has("crate_first")) return "finale_crate_known";
          return "finale_crate_fresh";
        },
        art: "images/events/adventure-ark-crate.png",
        nodes: {
          finale_crate_known: {
            eyebrow: "Permit day",
            title: "Open the crate",
            blurb:
              "Athens wants inventory. You already know the smell. Open it for the committee — or insist on the cook tent “lab”?",
            yes: "Open now",
            no: "Cook tent",
            yesNext: "ending",
            noNext: "ending",
            art: "images/events/adventure-ark-crate.png",
          },
          finale_crate_fresh: {
            eyebrow: "Permit day",
            title: "Official opening",
            blurb:
              "Athens wants inventory on the beach crate. Drama, forms, a small crowd. Open it here — or stage it in the cook tent?",
            yes: "Open now",
            no: "Cook tent",
            yesNext: "ending",
            noNext: "ending",
            art: "images/events/adventure-ark-crate.png",
          },
          ending: {
            eyebrow: "Roll credits",
            title: "It belongs in a gift shop",
            blurb:
              "Straw parts: tins of excellent olive oil. The plaster idol stares from your bag. Your rival toasts with raki and gifts you the bootlace-whip. The Map Room sheet, rain-smeared, is declared “bold.” Same ending — you just took the scenic route through goats, snails, and bad carpentry.",
            finale: true,
            art: "images/events/adventure-gift-shop-idol.png",
          },
        },
      },
    ],
    reward(s, flags) {
      const g = 140 + Math.floor(Math.random() * 60);
      const oil = 50 + Math.floor(Math.random() * 40);
      s.score += g;
      s.money += oil;
      const scenic = [];
      if (flags.has("bridged")) scenic.push("bridge");
      if (flags.has("snails_first") || flags.has("crate_first")) scenic.push("detour");
      if (flags.has("duelled")) scenic.push("duel");
      const note = scenic.length ? ` · via ${scenic.join(", ")}` : "";
      return `+${g} glory · +€${oil} oil${note}`;
    },
  },
];
