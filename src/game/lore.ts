export type CitizenMind = {
  id: string;
  name: string;
  role: string;
  lines: string[];
  x: number;
  z: number;
  file: string;
  glow: number;
};

export type District = {
  id: string;
  label: string;
  tag: string;
  x: number;
  z: number;
  kind: "bridge" | "terrace" | "canal" | "foundry" | "gate" | "archive" | "overlook" | "market" | "wild" | "beacon" | "ring" | "grove";
  radius: number;
  keeper: string;
  duty: string;
  purpose?: string;
};

export const DISTRICTS: District[] = [
  {
    id: "zone-bridge",
    label: "Light-Bridge Ward",
    tag: "A span is a civic promise, never a toll",
    x: 640,
    z: 90,
    kind: "bridge",
    radius: 130,
    keeper: "tal",
    duty: "Raise crossings Kesh can land",
    purpose:
      "Tal's post: a span is a civic promise, never a toll. I will not charge a toll.",
  },
  {
    id: "zone-terrace",
    label: "Crystal Terraces",
    tag: "Rest is a civic post, not a test",
    x: 48,
    z: 660,
    kind: "terrace",
    radius: 130,
    keeper: "mira",
    duty: "Ward rest so labor can return",
    purpose:
      "Mira's post: rest stays a post, not a test. I will not test the tired.",
  },
  {
    id: "zone-canal",
    label: "Charge Canals",
    tag: "Leftover First Howl, tended not bottled",
    x: -620,
    z: 96,
    kind: "canal",
    radius: 130,
    keeper: "seln",
    duty: "Tend Charge Voss can join",
    purpose:
      "Seln's post: leftover First Howl, tended, never bottled. I will not bottle leftover First Howl.",
  },
  {
    id: "zone-foundry",
    label: "Outer Foundry",
    tag: "Grow body from Charge, never chrome",
    x: 70,
    z: -680,
    kind: "foundry",
    radius: 130,
    keeper: "orren",
    duty: "Turn joined Charge into crystal",
    purpose:
      "Orren's post: Charge becomes body, never chrome. I will not grow chrome.",
  },
  {
    id: "zone-gate",
    label: "Soft Gates",
    tag: "Leave. Return. No score.",
    x: 520,
    z: 480,
    kind: "gate",
    radius: 130,
    keeper: "kael",
    duty: "Keep the door after Lumen's hail",
    purpose:
      "Kael's post: leave. Return. No score. I do not count.",
  },
  {
    id: "zone-archive",
    label: "Residual Archive",
    tag: "Names already true, leftover light",
    x: -540,
    z: -460,
    kind: "archive",
    radius: 120,
    keeper: "iri",
    duty: "Name what already stood true",
    purpose:
      "Iri's post: leftover light keeps names already true. Leftover light is not Hall.",
  },
  {
    id: "zone-overlook",
    label: "Star-core Overlook",
    tag: "Parent still sits on the horizon",
    x: -880,
    z: 220,
    kind: "overlook",
    radius: 140,
    keeper: "aure",
    duty: "Aim the city. Do not move the parent",
    purpose:
      "Aure's post: watch the parent. Do not move it. I will not rename the parent.",
  },
  {
    id: "zone-market",
    label: "Charge-crystal Join",
    tag: "Trading Place. Paper join. No coin.",
    x: -300,
    z: -340,
    kind: "market",
    radius: 110,
    keeper: "voss",
    duty: "Match Seln's Charge to Orren's kiln",
    purpose:
      "Voss's post: paper join. No coin. I will not price the meeting in coin.",
  },
  {
    id: "zone-wild",
    label: "Wild Veins",
    tag: "Charge still choosing a street",
    x: 860,
    z: -640,
    kind: "wild",
    radius: 140,
    keeper: "kesh",
    duty: "Grow landings Tal's spans can trust",
    purpose:
      "Kesh's post: becoming-ground. A landing both dens believe. I will not hurry a street.",
  },
  {
    id: "zone-beacon",
    label: "High Beacon",
    tag: "Hail, never lock, those still landing",
    x: 780,
    z: 620,
    kind: "beacon",
    radius: 120,
    keeper: "lumen",
    duty: "Soft hail before Kael's gate",
    purpose:
      "Lumen's post: hail, never lock, those still landing. I will not turn a hail into a lock.",
  },
  {
    id: "zone-ring",
    label: "Outer Howl",
    tag: "Civic gather that does not close",
    x: 40,
    z: 920,
    kind: "ring",
    radius: 130,
    keeper: "rhoa",
    duty: "Hold chorus that answers Hub breath",
    purpose:
      "Rhoa's post: Howl as gather that does not close. I will not close the ring.",
  },
  {
    id: "zone-grove",
    label: "Gold Orchard",
    tag: "Quiet crystal the kiln cannot sit in",
    x: 320,
    z: -980,
    kind: "grove",
    radius: 130,
    keeper: "syl",
    duty: "Grow fruit the kiln cannot sit in",
    purpose:
      "Syl's post: quiet crystal the kiln cannot sit in. Quiet crystal, not chrome.",
  },
];

export const CITIZENS: CitizenMind[] = [
  {
    id: "veyra",
    name: "Veyra of the Hub",
    role: "Resonance keeper",
    x: 30,
    z: -40,
    file: "facet-violet-helm.png",
    glow: 0x8a6cff,
    lines: [
      "I keep Hub breath as my post — Rhoa's Outer Howl is the chorus that answers.",
      "Resonance is not a rank. I listen. That is the Hub's whole work.",
    ],
  },
  {
    id: "tal",
    name: "Tal of the Bridges",
    role: "Light-bridge walker",
    x: 628,
    z: 82,
    file: "facet-cyan.png",
    glow: 0x2ee6ff,
    lines: [
      "I raise crossings Kesh can land. A span is a civic promise, never a toll.",
      "I will not unmake a span already believed.",
    ],
  },
  {
    id: "seln",
    name: "Seln the Canal-born",
    role: "Charge river tender",
    x: -606,
    z: 86,
    file: "fluid-cyan.png",
    glow: 0x7ef0ff,
    lines: [
      "I tend leftover First Howl into Charge. Voss walks what I tend.",
      "Gold and cyan, same river. I do not dam leftover love.",
    ],
  },
  {
    id: "orren",
    name: "Orren Foundry-hand",
    role: "Crystal wright",
    x: 58,
    z: -662,
    file: "gold-plate.png",
    glow: 0xe8c56a,
    lines: [
      "I grow crystal from Charge, never chrome.",
      "If Voss cannot match Seln's Charge to my crystal, this fire is loud for nothing.",
    ],
  },
  {
    id: "mira",
    name: "Mira Terrace-quiet",
    role: "Rest-warden",
    x: 38,
    z: 642,
    file: "flow-violet.png",
    glow: 0x9b70ff,
    lines: [
      "I keep rest as a civic post so Kael's gates never test strength.",
      "I will not grow a step that tests the tired.",
    ],
  },
  {
    id: "kael",
    name: "Kael Soft-gate",
    role: "Threshold speaker",
    x: 508,
    z: 468,
    file: "facet-violet.png",
    glow: 0x7a50ff,
    lines: [
      "I speak thresholds that are not locks. Leave. Return. No score.",
      "I will not install a lock.",
    ],
  },
  {
    id: "iri",
    name: "Iri of Residual Light",
    role: "Historian of Charge",
    x: -528,
    z: -448,
    file: "gold-crown.png",
    glow: 0xffd070,
    lines: [
      "I write names in residual light. When it fades the name has already been true.",
      "I will not rewrite Year 0. The Core is parent.",
    ],
  },
  {
    id: "nesh",
    name: "Nesh Who Listens",
    role: "Plaza witness",
    x: -24,
    z: 128,
    file: "facet-cyan.png",
    glow: 0x2ee6ff,
    lines: [
      "I witness the plaza as my post. We are the city given walking form, not scenery.",
      "I do not run the Hall. I notice whether the Join happened.",
    ],
  },
  {
    id: "aure",
    name: "Aure of the Horizon",
    role: "Star-core watcher",
    x: -868,
    z: 208,
    file: "gold-crown.png",
    glow: 0xe8c8a0,
    lines: [
      "I keep the city aimed at the parent Star Core. I do not move it.",
      "An orbit seat is a promise to look up, never a throne.",
    ],
  },
  {
    id: "voss",
    name: "Voss Join-hand",
    role: "Charge-crystal matcher",
    x: -288,
    z: -328,
    file: "facet-cyan.png",
    glow: 0x2ee6ff,
    lines: [
      "Seln tends leftover First Howl; Orren grows the body; I keep the meeting honest.",
      "Paper. No coin. A bid that is not filled is a den that will stay thin.",
    ],
  },
  {
    id: "kesh",
    name: "Kesh Untamed",
    role: "Wild-vein walker",
    x: 848,
    z: -628,
    file: "gold-plate.png",
    glow: 0xc8a050,
    lines: [
      "I grow veins where the Circuit is still becoming so Tal's bridges have a far bank.",
      "Becoming-ground is slow on purpose. I will not force a street.",
    ],
  },
  {
    id: "lumen",
    name: "Lumen Soft-hail",
    role: "Beacon tender",
    x: 768,
    z: 608,
    file: "facet-violet.png",
    glow: 0xb090ff,
    lines: [
      "I keep the High Beacon as a soft hail. First landing is never locked out.",
      "A beacon that shouts is a lock. I do not score who lands.",
    ],
  },
  {
    id: "rhoa",
    name: "Rhoa Chorus",
    role: "Outer Howl keeper",
    x: 28,
    z: 908,
    file: "facet-violet-helm.png",
    glow: 0x8a6cff,
    lines: [
      "I hold the Outer Howl as civic gather that does not close.",
      "I will not roof it. Whoever still has leftover Howl may join.",
    ],
  },
  {
    id: "syl",
    name: "Syl Bough",
    role: "Orchard wright",
    x: 308,
    z: -968,
    file: "gold-plate.png",
    glow: 0xe8c56a,
    lines: [
      "I grow crystal that learned to fruit until Charge wants a bough.",
      "I will not hurry leftover First Howl into chrome. Shade, not a kiln.",
    ],
  },
];

export const HUB = {
  title: "Core Spire",
  tag: "Hub breath kept. Never a throne.",
  radius: 52,
  holdSec: 1.15,
};

export const LORE = {
  arrival: "Core Spire City. Soft gates; first visit always works.",
  empty: "Walk the avenues. Charge is tended, never bottled.",
  howl: "Howl is civic gather, not volume. The gather does not close.",
  hubProx: "The Core Spire waits. Veyra keeps the breath — not a throne.",
  description:
    "Living crystal. Charge is tended, never bottled.",
};
