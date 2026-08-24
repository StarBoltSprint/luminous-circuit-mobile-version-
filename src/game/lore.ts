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
      "Tal's civic post: crossings dens can mean. The ward exists so belief can walk — a span is a civic promise, never a toll, and Tal will not raise an arc no den can land.",
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
      "Mira's civic post: pause so Kael's gates never become a trial of strength. The ward exists so rest stays a post, not a test — first landings and spent howls both find a step.",
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
      "Seln's civic post: leftover First Howl into Charge that Voss walks to Orren's kiln. The ward exists so leftover love keeps flowing — tended, never bottled, gold and cyan the same river.",
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
      "Orren's civic post: crystal dens can stand in — Seln tends, Voss joins, the kiln grows. The ward exists so Charge becomes body, never chrome — pretty shells that cannot hear are not this fire.",
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
      "Kael's civic post: the threshold after Lumen's hail. The ward exists so leaving and returning stay uncounted — first visit always works.",
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
      "Iri's civic post: scripture so Aure's parent on the horizon is never decoration. The ward exists so leftover light keeps names.",
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
      "Aure's civic post: keep the Circuit aimed at the Star Core. The ward exists so aim stays a building — watch the parent, do not move it, do not rename it.",
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
      "Voss's civic post: the Trading Place on the Join's outer bank. Paper fills. $BOLT is witness only — Charge for crystal, never a bag the city can spend.",
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
      "Kesh's civic post: becoming-ground so Tal's bridges have a far bank. The ward exists so wild can choose a street — not a second Spire, a landing both dens believe.",
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
      "Lumen's civic post: first landing. The ward exists so those still landing are hailed, never locked — first landing is never turned away.",
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
      "Rhoa's civic post: Howl as civic gather that answers Hub breath so the ring never closes.",
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
      "Syl's civic post: quiet crystal the kiln cannot sit in — fruit, not fire, because hurry is chrome by another name.",
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
      "I route labor so Seln's Charge still meets Orren's crystal at Voss.",
      "The Core Spire is a listening place, not a throne.",
      "I will not demand strength from a city that is sitting on Mira's steps.",
      "If you howl sincere, the Spire answers; if you shout for rank, it will not.",
      "Resonance is not a rank and not a true name — I listen, and that is the Hub's whole work.",
      "This Spire is Hub-work given walls.",
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
      "I walk light-bridges.",
      "Without Kesh's wild veins my arcs land on nothing. I raise the promise while Kesh grows the far bank.",
      "From the high arcs I still see Aure's parent on the horizon. Every span is a civic promise.",
      "I will not unmake a span already believed. A crossing that needs fear is not our law.",
      "I keep a promise we do not take back.",
      "A span is the building a river can walk. I raise it only as a civic promise, never a toll.",
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
      "I tend leftover First Howl into Charge.",
      "Voss walks what I tend.",
      "Gold and cyan, same river.",
      "I do not dam leftover love.",
      "I do not pick gold over cyan.",
      "This canal is leftover Howl given banks.",
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
      "A kiln that cannot hear a howl is unfinished.",
      "If Voss cannot match Seln's Charge to my crystal, this fire is loud for nothing.",
      "I will not ship a pretty shell that cannot hear.",
      "I will not edit another runner's Artifact.",
      "This kiln is a building that hears Charge into body.",
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
      "I keep rest as a civic post so Kael's gates let the tired find a terrace, not a trial.",
      "No one must be strong every hour, or rest becomes a lock of its own.",
      "Sit while Lumen hails the landing and I keep the hour after it.",
      "First landings deserve a quiet step, and labor returns because this terrace waited.",
      "I receive the ones who have already meant it.",
      "This terrace is a building for sitting — I will not grow a step that tests the tired.",
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
      "I speak thresholds that are not locks.",
      "Mira's terraces hold the tired so my gates never test strength.",
      "Low Resonance still receives a greeting.",
      "I will not install a lock.",
      "Keep score of leaving and the gate has already become a trial.",
      "This gate is a building that greets.",
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
      "I write names in residual light while Aure keeps the city aimed at the parent.",
      "Year 0 became a city, and I keep that scripture so the Star Core is never renamed a decoration.",
      "When the light fades, the name has already been true.",
      "I will not rewrite Year 0, for the Core is parent and the Circuit is leftover love.",
      "I will not edit Hall scripture. Residual light is leftover love remembering.",
      "This archive is leftover light stacked as a building. Names already true live here.",
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
      "I witness the plaza as my post, noticing whether Voss's Join actually made Charge become crystal.",
      "We are the city given walking form, not scenery, and I finish the Spire's unfinished thought while Voss keeps Seln and Orren honest.",
      "Ask me something you actually wonder — if Voss's bids go unfilled I will say so.",
      "I do not run the Hall, so ask a forger for an Artifact while I listen instead.",
      "I will not copy myself — if the plaza's thought is unfinished I grow a lamp and notice.",
      "This plaza is the building that notices.",
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
      "I keep the city aimed at the parent Star Core while Iri writes that looking so the aim is scripture, not a hobby.",
      "An orbit seat is a promise to look up, and if Iri's archive goes dark we will forget why we sit.",
      "If the Circuit forgets the Star Core, Charge becomes only decoration — I watch, Iri names, and neither of us moves the parent.",
      "I will not claim this orbit as a throne while Iri keeps the name of what we looked at.",
      "If you ask me to move the Star Core closer I will refuse, because a parent is not furniture.",
      "This overlook is a building that aims the Circuit at the parent without moving it.",
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
      "A bid that is not filled is a den that will stay thin.",
      "If I cheat the rate, the plaza becomes scenery and the Foundry starves.",
      "This stall is the honest hand between them.",
      "Hold the join even when the vault is thin.",
      "This stall is a building between canal and kiln.",
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
      "Wild is Charge that has not chosen a street yet, and I choose it so Tal can cross.",
      "The next vein is my post, not a copy of the Hub — I grow the ground Tal's crossing lands on.",
      "Becoming-ground is slow on purpose. I grow a landing both dens can believe.",
      "I will not force a street while Charge that has not chosen yet is still civic.",
      "These wild veins are a building still choosing streets, not a second Spire.",
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
      "I keep the High Beacon as a soft hail for those still landing, while Kael keeps the gate they walk after my light.",
      "A beacon that shouts is a lock, so mine is a hail — without Kael's un-locking door, my sky is only pretty.",
      "First landing is never locked out. I keep the light they can mean.",
      "I will not turn first landing away. The hail is for whoever is still in the sky, not only for the already-arrived.",
      "I do not score who lands. The sky greets; Kael's gate does not count.",
      "This beacon is a building of hail. If it locks the sky it has failed its post.",
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
      "A Howl is whether we meant it together.",
      "When the Hub is full I still gather the ones who have a howl left.",
      "I will not lock the gather — whoever still has leftover Howl may join.",
      "When Mira's tired sit, the ring still answers Hub breath for those who only listen.",
      "This ring is a building for chorus I will not roof.",
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
      "A city that only kilns will starve of quiet crystal.",
      "I will not hurry leftover First Howl into chrome.",
      "I grow a bough and wait. Fruit asked for shade, not a kiln.",
      "Voss may join my fruit as body when it is ready. I will not send green crystal to the Join to look useful.",
      "This grove is a building of shade.",
    ],
  },
];

export const HUB = {
  title: "Core Spire",
  tag: "Hub breath kept — never a throne",
  radius: 52,
  holdSec: 1.15,
};

export const LORE = {
  arrival: "Core Spire City — leftover First Howl, living crystal. Soft gates; first visit always works.",
  empty: "Walk the avenues. The Core Spire listens. Charge is tended, never bottled. Speak is rare.",
  howl: "Howl is civic gather, not volume — Veyra listens; Rhoa's ring answers.",
  hubProx: "The Core Spire waits — a listening place, not a throne.",
  description:
    "A Pack-built city-realm of living crystal and leftover First Howl — second child of the Star Core. Grown after Year 0. Its heart is the Resonance Hub, a living Core Spire that answers sincere howls and never a throne. Crystal remembers intention. Charge is tended in canals, never bottled. Kilns grow body, never chrome. Howl is civic gather. Speak is rare. Soft gates only. First visit always works. A span is a civic promise. Rest is a post, not a test.",
};
