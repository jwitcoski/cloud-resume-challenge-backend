/**
 * Indiana-Jones-flavoured side chains.
 * Each beat is a yes/no fork that converges to the same beat ending.
 * Beats fire across the season (afterDigs gates) — illusory choice, real vibes.
 */
export const ADVENTURES = [
  {
    id: "gift-shop-idol",
    title: "The Golden Idol",
    folioLabel: "It belongs in a gift shop",
    art: "images/events/event-mechanism.png",
    beats: [
      {
        afterDigs: 3,
        start: "tip",
        nodes: {
          tip: {
            eyebrow: "Harbour café",
            title: "A stranger’s tip",
            blurb:
              "A sunburned stranger leans over your coffee: “Golden idol in a cliff cave. Worth more than your whole season.” Buy him another cup and hear the rest?",
            yes: "Yes — talk",
            no: "No — leave",
            yesNext: "tip-yes",
            noNext: "tip-no",
          },
          "tip-yes": {
            eyebrow: "Napkin cartography",
            title: "Olive-oil map",
            blurb:
              "He sketches cliffs in olive oil on a napkin. “Mind the goats,” he says, and vanishes toward the ferry. You keep the napkin. Obviously.",
            endBeat: true,
          },
          "tip-no": {
            eyebrow: "You walk away",
            title: "Still on the table",
            blurb:
              "You pay your own bill and leave. Outside you notice the napkin under your cup anyway — same greasy cliffs, same goat warning. Destiny has poor manners.",
            endBeat: true,
          },
        },
      },
      {
        afterDigs: 8,
        start: "bridge",
        nodes: {
          bridge: {
            eyebrow: "Above the harbour",
            title: "Rotting boards",
            blurb:
              "The napkin leads to a goat path and a rope bridge of optimistic carpentry. One board is already a memory. Cross it?",
            yes: "Cross",
            no: "Go around",
            yesNext: "bridge-yes",
            noNext: "bridge-no",
          },
          "bridge-yes": {
            eyebrow: "Structural archaeology",
            title: "Third board snaps",
            blurb:
              "You make it. Barely. Your dignity stays on the far side for a moment, then catches up. Same ledge either way.",
            endBeat: true,
          },
          "bridge-no": {
            eyebrow: "The scenic route",
            title: "More scrapes, same view",
            blurb:
              "You scramble the long way around the gully. Extra thorns, same cave mouth. The bridge laughs quietly in the wind.",
            endBeat: true,
          },
        },
      },
      {
        afterDigs: 14,
        start: "idol",
        nodes: {
          idol: {
            eyebrow: "Cave mouth",
            title: "Something gleams",
            blurb:
              "Inside: a gleaming figure on a pedestal, dust motes like a spotlight. Whip music plays only in your head. Take it?",
            yes: "Take it",
            no: "Leave it",
            yesNext: "idol-yes",
            noNext: "idol-no",
          },
          "idol-yes": {
            eyebrow: "Click",
            title: "Pedestal trap",
            blurb:
              "The stone clicks. Distant rumble. You snatch the prize — a plaster tourist knick-knack stamped Made in Piraeus. The rumble was a goat kicking a tin sheet.",
            endBeat: true,
            finale: true,
          },
          "idol-no": {
            eyebrow: "Wisdom",
            title: "Still clicks",
            blurb:
              "You leave it. A goat bumps the pedestal anyway. Same click, same rumble, same plaster souvenir rolling to your boots. Made in Piraeus. Of course.",
            endBeat: true,
            finale: true,
          },
        },
      },
    ],
    reward(s) {
      const g = 90 + Math.floor(Math.random() * 50);
      s.score += g;
      return `+${g} glory · it belongs in a gift shop`;
    },
  },
  {
    id: "why-snails",
    title: "Why did it have to be snails?",
    folioLabel: "Why did it have to be snails?",
    art: "images/events/event-snail-tomb.png",
    beats: [
      {
        afterDigs: 6,
        start: "hatch",
        nodes: {
          hatch: {
            eyebrow: "Torchlight",
            title: "A sealed niche",
            blurb:
              "Your crew finds a low rock niche sealed with a slab. Something scrapes inside. Crack it open?",
            yes: "Open it",
            no: "Leave sealed",
            yesNext: "hatch-yes",
            noNext: "hatch-no",
          },
          "hatch-yes": {
            eyebrow: "Oh no",
            title: "Snails. So many snails.",
            blurb:
              "The slab shifts. A polite avalanche of shells. No curses, no snakes — just gastropods with union density. You write “fauna” in the notebook like a professional.",
            endBeat: true,
          },
          "hatch-no": {
            eyebrow: "Prudence",
            title: "Still snails",
            blurb:
              "You leave it sealed. A tremor — or a boot — later, the slab settles itself. Same polite avalanche. Same notebook entry. Fate has a sense of humour.",
            endBeat: true,
          },
        },
      },
      {
        afterDigs: 11,
        start: "crawl",
        nodes: {
          crawl: {
            eyebrow: "Deeper",
            title: "A tighter crawl",
            blurb:
              "Beyond the niche: a belly-crawl toward a faint gleam. Your foreman mutters about permits. Go in?",
            yes: "Crawl",
            no: "Send a junior",
            yesNext: "crawl-yes",
            noNext: "crawl-no",
          },
          "crawl-yes": {
            eyebrow: "Leadership",
            title: "Shell confetti",
            blurb:
              "You emerge dusted in shell grit, holding… another snail. The gleam was wet limestone. The junior applauds from safety.",
            endBeat: true,
          },
          "crawl-no": {
            eyebrow: "Delegation",
            title: "Same glitter",
            blurb:
              "The junior returns dusted in shell grit, holding… another snail. You pretend this was the plan. It was not.",
            endBeat: true,
          },
        },
      },
      {
        afterDigs: 17,
        start: "exit",
        nodes: {
          exit: {
            eyebrow: "Exit strategy",
            title: "The ceiling ticks",
            blurb:
              "Dust rains. The crawl feels smaller. Sprint for daylight with your dignity, or carefully reverse out?",
            yes: "Sprint",
            no: "Reverse carefully",
            yesNext: "exit-yes",
            noNext: "exit-no",
          },
          "exit-yes": {
            eyebrow: "Roll credits",
            title: "Daylight",
            blurb:
              "You tumble into sun, hat askew, one heroic snail on your collar. The crew swears they heard a boulder. It was a water tin.",
            endBeat: true,
            finale: true,
          },
          "exit-no": {
            eyebrow: "Roll credits",
            title: "Daylight, slower",
            blurb:
              "You reverse out with academic grace until the last metre, then tumble anyway. Same sun, same snail on the collar, same water tin ‘boulder.’",
            endBeat: true,
            finale: true,
          },
        },
      },
    ],
    reward(s) {
      const g = 70 + Math.floor(Math.random() * 40);
      s.score += g;
      return `+${g} glory · why did it have to be snails?`;
    },
  },
];
