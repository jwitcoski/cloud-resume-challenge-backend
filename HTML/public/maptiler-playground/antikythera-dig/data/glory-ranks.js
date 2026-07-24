const GLORY_EMPTY_PENALTY = 40;

/**
 * Academic glory ladder — score thresholds (inclusive min).
 * Empty digs hurt; chapters and finds climb the ranks.
 */
const GLORY_RANKS = [
  {
    id: "unknown",
    min: 0,
    title: "Unknown",
    blurb: "No one in Athens has heard of you. Dig wisely — barren squares cost reputation.",
  },
  {
    id: "field-assistant",
    min: 120,
    title: "Field assistant",
    blurb: "You can hold a trowel without embarrassing the permit. Still disposable.",
  },
  {
    id: "graduate-student",
    min: 350,
    title: "Graduate student",
    blurb: "Notebooks, sunburn, and a thesis outline. The museum nods politely.",
  },
  {
    id: "lecturer",
    min: 700,
    title: "Lecturer",
    blurb: "You teach the odd seminar. Students steal your jokes; journals ignore you.",
  },
  {
    id: "assistant-professor",
    min: 1200,
    title: "Assistant professor",
    blurb: "Tenure track, thin salary, thicker correspondence. Peers start to watch.",
  },
  {
    id: "associate-professor",
    min: 2000,
    title: "Associate professor",
    blurb: "Your Antikythera notes circulate. Invitations arrive; so do rivals.",
  },
  {
    id: "professor",
    min: 3200,
    title: "Professor",
    blurb: "Named chairs whisper your surname. The Aegean is your lecture hall.",
  },
  {
    id: "department-chair",
    min: 4800,
    title: "Department chair",
    blurb: "You assign permits and crush mediocre abstracts. Power, with paperwork.",
  },
  {
    id: "dean",
    min: 7000,
    title: "Dean of the college",
    blurb: "Budgets bend. Expeditions launch on your signature. Fortune — and glory — are institutional.",
  },
  {
    id: "museum-director",
    min: 10000,
    title: "Museum director",
    blurb: "It belongs in a museum — and you run the museum. Legend of the dig.",
  },
];

/**
 * Random field events — fortune, folly, and paperwork.
 * apply(state) mutates and returns a short effect line for the card.
 */
export { GLORY_EMPTY_PENALTY, GLORY_RANKS };
