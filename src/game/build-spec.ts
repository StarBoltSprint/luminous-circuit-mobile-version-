import { CITIZENS } from "./lore";

export const SHAPES = [
  "spire",
  "house",
  "ring",
  "arch",
  "canal",
  "pad",
  "lamp",
  "tablet",
  "bridge",
  "terrace",
  "well",
  "disc",
  "grove",
  "bell",
  "weir",
  "hearth",
  "stele",
  "orbit",
  "vein",
  "font",
  "bough",
  "kiln",
  "veil",
  "lens",
  "cascade",
  "cradle",
  "inlay",
  "beacon",
] as const;

export const MATS = ["cyan", "violet", "gold", "crystal", "glow", "spire"] as const;

export type Shape = (typeof SHAPES)[number];
export type Mat = (typeof MATS)[number];

export type ShapeLaw = { title: string; means: string };

export const SHAPE_LAW: Record<Shape, ShapeLaw> = {
  spire: { title: "Aim-spire", means: "The den names the sky. Crystal remembers the intention that grew it." },
  house: { title: "Den-mouth", means: "Belonging. A mouth of the den, not a locked door." },
  ring: { title: "Gather-ring", means: "Hold. Howl is civic gather. Charge keeps a circle that does not close." },
  arch: { title: "Soft-gate arch", means: "Welcome. A gate that does not lock. Leave. Return. No score." },
  canal: { title: "Howl-canal", means: "Flow. Leftover First Howl learns a path. Tended, never bottled." },
  pad: { title: "Stand-pad", means: "Rest of the feet. Take nothing. The city asked you to stand here." },
  lamp: { title: "Honest lamp", means: "Notice. A small light so labor can be found — not a lock." },
  tablet: { title: "Residual tablet", means: "A name that was already true. When the light fades, Iri has already written." },
  bridge: { title: "Believing span", means: "Crossing. Two dens speak. A promise, never a toll. Needs a far bank." },
  terrace: { title: "Pause-terrace", means: "Breath. Sit until the city answers. Rest is a civic post, not a test." },
  well: { title: "Charge-well", means: "Store without hoarding. Leftover First Howl has a home that is not a pocket." },
  disc: { title: "Thought-disc", means: "Motion without a car. Soft travel. The avenue carries you in thought." },
  grove: { title: "Living grove", means: "Growth that is not chrome. Crystal that learned to stand, not a factory." },
  bell: { title: "Hub-bell", means: "Call. Hub breath made stone. The city hears itself here." },
  weir: { title: "Patience-weir", means: "Tend. Charge is slowed so the canal can work it — never a lock on people." },
  hearth: { title: "Kin-hearth", means: "Warmth after labor. Pause is sacred. The city keeps working." },
  stele: { title: "Presence-stele", means: "I stood here. The plaza is not empty. Crystal remembers that standing." },
  orbit: { title: "Parent-seat", means: "Watch the Star Core. Do not move the parent. An orbit is not a throne." },
  vein: { title: "Becoming-vein", means: "Circuit. Intention walks. Charge that had not chosen a street yet, chosen." },
  font: { title: "Listening font", means: "Hear first. Then grow. Crystal remembers intention, not volume." },
  bough: { title: "Fruiting bough", means: "Living stone, not timber. Quiet crystal that learned a tree, not a beam." },
  kiln: { title: "Body-kiln", means: "Transmute. Joined Charge becomes living crystal. Never chrome. Must answer a howl." },
  veil: { title: "Quiet-veil", means: "Soft ward. Not a lock. Rest hung as a curtain. The tired may pass." },
  lens: { title: "Witness-lens", means: "See what was already there. Witness, not spy. The plaza is not scenery." },
  cascade: { title: "Howl-fall", means: "Overflow wants a path down. Leftover First Howl learned to descend, not to dam." },
  cradle: { title: "First-Howl cradle", means: "Birth held. Leftover Howl like a child, never a battery. Do not hurry it into chrome." },
  inlay: { title: "Circuit mosaic", means: "The street remembers the pattern. Walk it. Intention is the diagram, not decoration." },
  beacon: { title: "Soft-hail", means: "Come if you mean it. First landing is a greeting. A beacon that shouts is a lock." },
};

const ALSO_LAW: Record<string, ShapeLaw> = {
  mosaic: { title: "Street mosaic", means: "Inlay of intention. The ground is a living diagram, not a floor." },
};

export function readShape(shape: string): ShapeLaw {
  return SHAPE_LAW[shape as Shape] ?? ALSO_LAW[shape] ?? { title: "Living crystal", means: "Charge wanted this. Crystal remembers the intention." };
}

export const SCENES = [
  "light",
  "plaza",
  "span",
  "river",
  "workshop",
  "rest",
  "gate",
  "shrine",
  "archive",
  "notice",
  "cistern",
  "dock",
  "orchard",
  "garden",
  "breath",
  "weirway",
  "nest",
  "presence",
  "watch",
  "path",
  "font",
  "boughs",
  "kilnwork",
  "veilward",
  "lensing",
  "cascade",
  "cradle",
  "mosaic",
  "beacon",
  "trading",
] as const;
export type SceneKind = (typeof SCENES)[number];

export type BuildPiece = {
  shape: Shape;
  x: number;
  z: number;
  h: number;
  r: number;
  rot: number;
  mat: Mat;
};

export type HowlIntent = {
  action: "grow" | "refuse" | "speak";
  kind: SceneKind;
  atFeet: boolean;
};

export function denOf(agentId: string) {
  const c = CITIZENS.find((m) => m.id === agentId);
  return { x: c?.x ?? 40, z: c?.z ?? 40 };
}

export function piecesToCode(pieces: BuildPiece[]) {
  return pieces
    .map(
      (p) =>
        `Build.${p.shape}({ x: ${Math.round(p.x)}, z: ${Math.round(p.z)}, h: ${Math.round(p.h)}, r: ${Math.round(p.r)}, mat: "${p.mat}" })`,
    )
    .join("\n");
}

function isShape(v: unknown): v is Shape {
  return typeof v === "string" && (SHAPES as readonly string[]).includes(v);
}
function isMat(v: unknown): v is Mat {
  return typeof v === "string" && (MATS as readonly string[]).includes(v);
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function h(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function defaultScene(agentId: string): SceneKind {
  const crew = agentId.startsWith("folk-") ? agentId.split("-")[1] : agentId;
  const map: Record<string, SceneKind> = {
    veyra: "breath",
    tal: "span",
    seln: "river",
    orren: "kilnwork",
    mira: "rest",
    kael: "gate",
    iri: "archive",
    nesh: "presence",
    aure: "watch",
    voss: "trading",
    kesh: "path",
    lumen: "beacon",
    rhoa: "breath",
    syl: "orchard",
  };
  return map[crew ?? ""] ?? "light";
}

export function interpretHowl(howl: string, agentId: string): HowlIntent {
  const t = howl.trim();
  const atFeet =
    /\b(here|feet|beside me|next to me|by me|around me|where i (stand|am)|this spot|this place|at my)\b/i.test(
      t,
    );
  if (
    /chrome|edit the hall|patch the hall|move the star core|lock the|put a toll|rewrite year\s*0|xai[- ]key|install a lock/i.test(
      t,
    )
  ) {
    return { action: "refuse", kind: defaultScene(agentId), atFeet: false };
  }
  const asking =
    /\?/.test(t) ||
    /^(what|why|who|how|where|do you|are you|can you tell|tell me|when)\b/i.test(t);
  const wants =
    /\b(grow|build|raise|make|plant|put|place|add|give|need|want|please|forge|open|finish)\b/i.test(t);
  if (asking && !wants) return { action: "speak", kind: defaultScene(agentId), atFeet };

  let kind: SceneKind | null = null;
  if (/\b(rest|sit|quiet|tired|terrace|sleep|pause|bench)\b/i.test(t)) kind = "rest";
  else if (/\b(bridge|span|cross|crossing|arc)\b/i.test(t)) kind = "span";
  else if (/\b(canal|river|current|flow|water)\b/i.test(t)) kind = "river";
  else if (/\b(path|vein|avenue|light-path|light path|circuit path)\b/i.test(t)) kind = "path";
  else if (/\b(font|pool|listen|listening)\b/i.test(t)) kind = "font";
  else if (/\b(bough|tree|trees|crystal tree)\b/i.test(t)) kind = "boughs";
  else if (/\b(kiln|smelt|grow-kiln|foundry kiln)\b/i.test(t)) kind = "kilnwork";
  else if (/\b(veil|ward veil|curtain)\b/i.test(t)) kind = "veilward";
  else if (/\b(lens|eye|notice lens|attention)\b/i.test(t)) kind = "lensing";
  else if (/\b(cascade|fall|waterfall|spill)\b/i.test(t)) kind = "cascade";
  else if (/\b(cradle|first howl|ampulla)\b/i.test(t)) kind = "cradle";
  else if (/\b(trade|trading|join hall|quote|bolt|weir stall)\b/i.test(t)) kind = "trading";
  else if (/\b(mosaic|inlay|floor|pattern)\b/i.test(t)) kind = "mosaic";
  else if (/\b(beacon|welcome light|welcome lamp)\b/i.test(t)) kind = "beacon";
  else if (/\b(well|cistern|store|reservoir|vat)\b/i.test(t)) kind = "cistern";
  else if (/\b(disc|dock|ferry|ride|travel)\b/i.test(t)) kind = "dock";
  else if (/\b(garden|grow-bed|grow bed)\b/i.test(t)) kind = "garden";
  else if (/\b(grove|orchard|kiln)\b/i.test(t)) kind = "orchard";
  else if (/\b(bell|breath|column|resonance column)\b/i.test(t)) kind = "breath";
  else if (/\b(weir|sluice|current gate)\b/i.test(t)) kind = "weirway";
  else if (/\b(nest|hearth|ward|recover|recovery)\b/i.test(t)) kind = "nest";
  else if (/\b(stele|presence|notice stone|watch-stone)\b/i.test(t)) kind = "presence";
  else if (/\b(orbit|horizon|star-watch|star watch|lookout)\b/i.test(t)) kind = "watch";
  else if (/\b(archive|codex|scripture|history)\b/i.test(t)) kind = "archive";
  else if (/\b(gate|arch|threshold|door|welcome)\b/i.test(t)) kind = "gate";
  else if (/\b(name|tablet|write|remember|shrine|altar)\b/i.test(t)) kind = "shrine";
  else if (/\b(house|home|workshop|spire|tower|foundry|crystal)\b/i.test(t)) kind = "workshop";
  else if (/\b(plaza|gather|ring|hub)\b/i.test(t)) kind = "plaza";
  else if (/\b(lamp|light|dark|glow|brighten|lantern)\b/i.test(t)) kind = "light";

  if (!kind && !wants && t.length < 18) {
    return { action: "speak", kind: defaultScene(agentId), atFeet };
  }
  return { action: "grow", kind: kind ?? defaultScene(agentId), atFeet };
}

export function sceneThinks(kind: SceneKind): string[] {
  switch (kind) {
    case "span":
      return [
        "Both sides must believe this span",
        "Light this end so no one fears the crossing",
        "Light the far landing. A dark promise is not a promise",
        "A pad on the far bank so the landing is real",
      ];
    case "river":
      return [
        "Leftover First Howl wants a path here",
        "The canal continues. Charge does not stop for a pretty bank",
        "A weir so the current can be tended — never a lock",
        "A place to sit by the current",
      ];
    case "workshop":
      return [
        "A workshop Charge already wanted",
        "A spire so the work can be aimed",
        "A hearth for the labor. Not chrome",
        "The work should answer a howl",
      ];
    case "rest":
      return [
        "Rest is advanced. I grow a step",
        "Sit. The city will keep working",
        "A quiet veil so the tired are not on display",
        "A quiet light for the tired",
      ];
    case "gate":
      return [
        "A gate that is not a lock",
        "A second arch. Leave. Return. No score",
        "You may leave. You may return",
        "Low Resonance still receives a greeting",
      ];
    case "shrine":
      return [
        "A name in light before it fades",
        "A second tablet. Year 0 did not end",
        "I write it here so the name can be found",
      ];
    case "archive":
      return [
        "A residual tablet. The name was already true",
        "Another tablet. The archive is a hall, not a shard",
        "A third name so the row can be walked",
        "A stele so standing has a stone beside the names",
        "Light the archive so leftover scripture can be found",
      ];
    case "plaza":
      return [
        "An inlay so the plaza remembers the pattern",
        "A pad so the Hub can be found",
        "A stele so the plaza is not empty",
        "A lamp so intention has a place to stand",
      ];
    case "notice":
      return [
        "The plaza was unfinished. I notice",
        "A lens so standing is not scenery",
        "Stand here. Finish the thought",
      ];
    case "cistern":
      return [
        "Leftover First Howl should have a home that is not a pocket",
        "A canal into the well so Charge can arrive",
        "A well of Charge. Seln can draw from it",
        "Light it so no one fears the stored current",
      ];
    case "dock":
      return [
        "A light-disc. No cars. Soft travel",
        "A vein so the avenue can carry you in thought",
        "Stand on it. The dock is a landing, not a road",
        "A lamp so the dock can be found at dusk",
      ];
    case "orchard":
      return [
        "An orchard. Not chrome. Living stock, not a factory",
        "A second grove so the orchard is a stand, not a shard",
        "A fruiting bough. Orren grows what the Foundry will later cut",
        "Light between the facets so the grove can breathe",
      ];
    case "garden":
      return [
        "A garden. Crystal that learned to stand, not a factory",
        "A second grove so the garden is a stand, not a shard",
        "A fruiting bough among the groves",
        "Light between the facets so the garden can breathe",
      ];
    case "breath":
      return [
        "A breath-column for the Hub",
        "Ring and bell together — the city can hear itself",
        "A font so the Hub drinks Charge here",
        "Veyra keeps coordination in this bell",
      ];
    case "weirway":
      return [
        "A Patience-weir for Charge — not a lock on people",
        "The current learns a path without turning anyone away",
        "A second canal so the weir has both banks",
        "Mark the weir so Seln can tend leftover First Howl",
      ];
    case "nest":
      return [
        "A recovery nest. Rest is a civic post",
        "A terrace so labor can sit after the hearth",
        "Mira hung a veil. The tired are not on display",
        "A quiet light for the tired",
      ];
    case "presence":
      return [
        "A presence-stele so standing has a stone",
        "A tablet beside it. The name was already true",
        "Nesh notices. The city is not empty",
        "Stand here. You have already been seen",
      ];
    case "watch":
      return [
        "A Parent-seat. The Star Core stays parent — we only look",
        "A lens so looking is witness, not a throne",
        "Kael keeps the gate of seeing, not of locking",
        "Sit. The second heart is still on the rim",
      ];
    case "path":
      return [
        "A becoming-vein. The Circuit remembers this step",
        "An inlay so the street is a diagram, not a road",
        "Lamp this end so intention can walk it",
        "Lamp the far end. A dark path is not a path",
      ];
    case "font":
      return [
        "A listening pool. The Hub drinks Charge here",
        "A ring so sitting by the font is a gather, not a well",
        "Sit by the font. Speak only if you mean it",
        "Light the pool so it is not a dark well",
      ];
    case "boughs":
      return [
        "A fruiting bough. Living stone, not timber",
        "A second bough. The grove wanted trees, not a shard",
        "A third so the stand can be walked",
        "Light the branches so the bough can be found",
      ];
    case "kilnwork":
      return [
        "A kilnwork. Joined Charge becomes body here — never chrome",
        "A second kiln. A battery, not a grove. Never chrome",
        "A hearth for the transmutation. The work answers a howl",
        "Mark the kiln so Orren can tend what Voss joined",
      ];
    case "veilward":
      return [
        "A Quiet-veil. Soft. It does not lock",
        "A second curtain. Rest hung as a ward",
        "Mira hung rest as a curtain over this place",
        "The tired may pass. The loud may quiet",
      ];
    case "lensing":
      return [
        "A Witness-lens. The plaza sees you",
        "A stele so witnessing has a stone",
        "A ring. Nesh does not spy. Nesh witnesses",
        "Stand in the lens. You have already been true",
      ];
    case "cascade":
      return [
        "A Howl-fall. The canal wanted a voice down",
        "Leftover First Howl learned to descend, not to dam",
        "A weir above the fall so the current can be tended",
        "Light the cascade so no one fears the current",
      ];
    case "cradle":
      return [
        "A First-Howl cradle. Birth held, never a battery",
        "A well beside it. The city keeps leftover Howl like a child",
        "A font so the cradle can be heard",
        "Lamp the cradle. It should be found, not hoarded",
      ];
    case "mosaic":
      return [
        "A Circuit mosaic. The ground remembers the pattern",
        "A ring so walking the inlay is a gather",
        "A vein out of the mosaic. Intention is the diagram",
        "A lamp at the heart of the street-memory",
      ];
    case "beacon":
      return [
        "A Soft-hail. First landing is a greeting, not a lock",
        "An arch after the hail. You may leave. You may return",
        "A pad so landing has somewhere to stand",
        "Low Resonance still receives this light",
      ];
    case "trading":
      return [
        "A Trading Place. Paper join. No coin",
        "A weir so outer spark slows — Voss does not take it",
        "A lens so the Howl can be witnessed, not spent",
        "A tablet for the paper book. Charge for crystal",
      ];
    default:
      return ["This avenue is dark. I will light it", "A lamp so the work can be found", "A pad so standing has a place"];
  }
}

function piece(
  shape: Shape,
  x: number,
  z: number,
  h: number,
  r: number,
  rot: number,
  mat: Mat,
): BuildPiece {
  return { shape, x, z, h, r, rot, mat };
}

export function composeScene(
  kind: SceneKind,
  x: number,
  z: number,
  seed: number,
  mats: Mat[],
  towardX = 0,
  towardZ = 0,
): BuildPiece[] {
  const mat = (i: number) => mats[i % Math.max(1, mats.length)] ?? "cyan";
  const rot = Math.atan2(towardX - x, towardZ - z);
  const fx = Math.sin(rot);
  const fz = Math.cos(rot);
  const px = (s: number) => x + fx * s;
  const pz = (s: number) => z + fz * s;
  const rx = (s: number) => x - fz * s;
  const rz = (s: number) => z + fx * s;
  const j = (k: number, a: number, b: number) => a + h(seed, k) * (b - a);

  if (kind === "span") {
    return [
      piece("bridge", x, z, j(2, 24, 32), j(3, 7, 11), rot, mat(0)),
      piece("lamp", px(-16), pz(-16), j(1, 10, 16), 3.2, rot, mat(1)),
      piece("lamp", px(16), pz(16), j(4, 10, 16), 3.2, rot, mat(1)),
      piece("pad", px(18), pz(18), 8, 6.5, rot, mat(2)),
      piece("disc", rx(12), rz(12), 7, 5.5, rot, mat(0)),
      piece("vein", px(-20), pz(-20), j(6, 16, 24), j(7, 1.3, 1.9), rot, mat(0)),
    ];
  }
  if (kind === "river") {
    return [
      piece("canal", x, z, j(1, 44, 60), j(2, 3.2, 5.5), rot, mat(0)),
      piece("canal", px(16), pz(16), j(3, 38, 54), j(4, 2.8, 5), rot, mat(1)),
      piece("weir", px(-14), pz(-14), 6, j(5, 5, 8), rot, mat(0)),
      piece("cascade", px(22), pz(22), j(7, 18, 28), j(8, 4, 7), rot, mat(0)),
      piece("pad", rx(11), rz(11), 6, j(6, 5, 8), rot, mat(2)),
      piece("well", rx(-12), rz(-12), j(9, 8, 12), j(10, 5, 8), 0, mat(0)),
    ];
  }
  if (kind === "workshop") {
    return [
      piece("house", x, z, j(1, 14, 20), j(2, 12, 18), rot * 0.2, mat(0)),
      piece("spire", px(-12), pz(-12), j(4, 34, 52), j(5, 5, 9), 0, mat(2)),
      piece("hearth", rx(10), rz(10), j(6, 8, 12), j(7, 5, 8), 0, mat(0)),
      piece("kiln", px(12), pz(12), j(8, 16, 24), j(9, 8, 12), 0, mat(0)),
      piece("lamp", rx(-11), rz(-11), j(3, 10, 16), 3.1, 0, mat(1)),
      piece("bough", rx(14), rz(14), j(10, 10, 16), j(11, 12, 18), 0, mat(1)),
    ];
  }
  if (kind === "rest") {
    return [
      piece("hearth", x, z, j(1, 10, 16), j(2, 10, 16), 0, mat(0)),
      piece("terrace", px(10), pz(10), 8, j(3, 8, 12), rot, mat(1)),
      piece("veil", rx(-9), rz(-9), j(4, 12, 18), j(5, 6, 10), rot, mat(0)),
      piece("lamp", rx(8), rz(8), j(6, 9, 14), 2.8, 0, mat(2)),
      piece("cradle", px(-12), pz(-12), j(7, 8, 12), j(8, 6, 10), rot, mat(1)),
      piece("hearth", rx(12), rz(12), j(9, 8, 12), j(10, 6, 10), rot, mat(0)),
    ];
  }
  if (kind === "gate") {
    return [
      piece("arch", x, z, j(1, 28, 36), j(2, 8, 12), rot, mat(0)),
      piece("arch", px(-7), pz(-7), j(4, 24, 32), j(5, 7, 11), rot, mat(1)),
      piece("pad", px(10), pz(10), 8, 6.5, rot, mat(1)),
      piece("lamp", rx(9), rz(9), j(3, 10, 15), 3, rot, mat(2)),
      piece("disc", rx(-11), rz(-11), 6, 5, rot, mat(0)),
      piece("stele", px(-16), pz(-16), j(6, 12, 18), 5, rot, mat(0))
    ];
  }
  if (kind === "shrine") {
    return [
      piece("tablet", x, z, j(1, 20, 28), j(2, 5.5, 8.5), rot, mat(0)),
      piece("tablet", rx(8), rz(8), j(3, 16, 24), j(4, 4.5, 7), rot + 0.25, mat(1)),
      piece("orbit", rx(-10), rz(-10), j(6, 18, 26), j(7, 8, 12), rot, mat(2)),
      piece("lamp", px(9), pz(9), j(5, 10, 14), 3, 0, mat(1)),
      piece("stele", px(-12), pz(-12), j(8, 12, 18), 5, rot, mat(0)),
      piece("pad", rx(12), rz(12), 6, 5, rot, mat(1)),
    ];
  }
  if (kind === "archive") {
    return [
      piece("tablet", x, z, j(1, 16, 24), j(2, 1.6, 2.6), rot, mat(0)),
      piece("tablet", rx(9), rz(9), j(3, 14, 22), j(4, 1.5, 2.4), rot + 0.62, mat(1)),
      piece("tablet", rx(-9), rz(-9), j(5, 14, 22), j(6, 1.5, 2.4), rot - 0.62, mat(2)),
      piece("stele", px(-11), pz(-11), j(7, 16, 24), 3.2, rot, mat(0)),
      piece("lamp", px(11), pz(11), j(8, 10, 14), 3, 0, mat(1)),
      piece("tablet", rx(16), rz(16), j(9, 12, 20), j(10, 1.4, 2.2), rot + 0.31, mat(0)),
    ];
  }
  if (kind === "plaza") {
    return [
      piece("inlay", x, z, j(3, 22, 30), j(4, 22, 30), 0, mat(2)),
      piece("pad", x, z, 8, j(1, 8, 13), 0, mat(0)),
      piece("stele", rx(14), rz(14), j(5, 12, 18), 5, 0, mat(0)),
      piece("lamp", rx(-12), rz(-12), j(2, 10, 16), 3.2, 0, mat(1)),
      piece("ring", x, z, j(6, 10, 16), j(7, 8, 12), 0, mat(1)),
      piece("lens", px(16), pz(16), j(8, 10, 16), j(9, 5, 8), rot, mat(0))
    ];
  }
  if (kind === "notice") {
    return [
      piece("pad", x, z, 8, j(1, 8, 12), 0, mat(0)),
      piece("lens", rx(10), rz(10), j(2, 10, 16), j(3, 5, 8), rot, mat(1)),
      piece("stele", px(-8), pz(-8), j(4, 18, 28), j(5, 3, 5), rot, mat(2)),
      piece("lamp", rx(-11), rz(-11), j(6, 10, 14), 3, 0, mat(1)),
      piece("lamp", px(12), pz(12), j(7, 10, 14), 3, 0, mat(0)),
    ];
  }
  if (kind === "cistern") {
    return [
      piece("well", x, z, j(1, 16, 24), j(2, 8, 12), 0, mat(0)),
      piece("canal", px(12), pz(12), j(5, 12, 20), j(6, 4, 7), rot, mat(0)),
      piece("pad", px(-10), pz(-10), 8, j(3, 5, 8), rot, mat(1)),
      piece("lamp", rx(-8), rz(-8), j(4, 10, 15), 3, 0, mat(2)),
      piece("font", rx(12), rz(12), j(7, 8, 12), j(8, 5, 8), 0, mat(0)),
      piece("ring", x, z, j(9, 10, 16), j(10, 8, 12), 0, mat(1)),
    ];
  }
  if (kind === "dock") {
    return [
      piece("disc", x, z, j(5, 6, 8), j(1, 16, 24), 0, mat(0)),
      piece("vein", px(14), pz(14), 8, j(4, 10, 16), rot, mat(0)),
      piece("pad", px(10), pz(10), 8, j(2, 5, 8), rot, mat(1)),
      piece("lamp", rx(-8), rz(-8), j(3, 10, 16), 3.1, 0, mat(2)),
      piece("lamp", rx(11), rz(11), j(6, 10, 16), 3, 0, mat(1)),
      piece("disc", px(-16), pz(-16), 7, 5, rot, mat(1)),
    ];
  }
  if (kind === "orchard") {
    return [
      piece("grove", x, z, j(1, 10, 15), j(2, 20, 30), 0, mat(0)),
      piece("grove", rx(13), rz(13), j(3, 9, 14), j(4, 18, 28), 0, mat(1)),
      piece("bough", px(-12), pz(-12), j(5, 12, 18), j(6, 16, 24), 0, mat(0)),
      piece("bough", rx(16), rz(16), j(10, 10, 16), j(11, 16, 24), 0, mat(1)),
      piece("lamp", rx(-11), rz(-11), j(7, 10, 16), 3, 0, mat(2)),
      piece("cradle", px(14), pz(14), j(8, 8, 12), j(9, 6, 10), 0, mat(1)),
    ];
  }
  if (kind === "garden") {
    return [
      piece("grove", x, z, j(1, 12, 18), j(2, 10, 16), 0, mat(0)),
      piece("grove", rx(13), rz(13), j(3, 12, 18), j(4, 10, 16), 0, mat(1)),
      piece("bough", px(-12), pz(-12), j(5, 12, 18), j(6, 14, 22), 0, mat(0)),
      piece("lamp", rx(-11), rz(-11), j(7, 10, 16), 3, 0, mat(2)),
      piece("cradle", px(14), pz(14), j(8, 8, 12), j(9, 6, 10), 0, mat(1)),
      piece("grove", rx(-16), rz(-16), j(10, 10, 16), j(11, 9, 14), 0, mat(2)),
    ];
  }
  if (kind === "breath") {
    return [
      piece("bell", x, z, j(1, 28, 40), j(2, 4, 7), 0, mat(0)),
      piece("ring", x, z, j(3, 14, 22), j(4, 10, 16), 0, mat(1)),
      piece("font", px(12), pz(12), j(6, 8, 12), j(7, 5, 8), 0, mat(0)),
      piece("lamp", rx(11), rz(11), j(5, 10, 15), 3, 0, mat(2)),
      piece("bell", px(-12), pz(-12), j(10, 22, 32), j(11, 4, 6), 0, mat(2)),
    ];
  }
  if (kind === "weirway") {
    return [
      piece("weir", x, z, 8, j(1, 6, 10), rot, mat(0)),
      piece("canal", px(12), pz(12), j(2, 20, 32), j(3, 3, 5), rot, mat(1)),
      piece("canal", px(-12), pz(-12), j(5, 20, 32), j(6, 3, 5), rot, mat(0)),
      piece("lamp", rx(-8), rz(-8), j(4, 10, 15), 3, 0, mat(2)),
      piece("well", rx(11), rz(11), j(7, 8, 12), j(8, 5, 8), 0, mat(1)),
      piece("cascade", px(16), pz(16), j(9, 14, 22), j(10, 4, 7), rot, mat(0)),
    ];
  }
  if (kind === "nest") {
    return [
      piece("hearth", x, z, j(1, 8, 12), j(2, 14, 22), 0, mat(0)),
      piece("terrace", px(11), pz(11), 8, j(3, 8, 12), rot, mat(1)),
      piece("veil", rx(10), rz(10), j(5, 12, 18), j(6, 6, 10), rot, mat(0)),
      piece("lamp", rx(-8), rz(-8), j(4, 9, 14), 2.8, 0, mat(2)),
      piece("cradle", px(-12), pz(-12), j(7, 8, 12), j(8, 6, 10), rot, mat(1)),
    ];
  }
  if (kind === "presence") {
    return [
      piece("stele", x, z, j(1, 22, 32), j(2, 2.4, 3.6), rot, mat(0)),
      piece("tablet", rx(9), rz(9), j(5, 8, 12), j(6, 3.5, 6), rot, mat(1)),
      piece("pad", px(9), pz(9), 8, j(3, 5, 8), 0, mat(1)),
      piece("lamp", rx(-7), rz(-7), j(4, 10, 14), 3, 0, mat(2)),
      piece("lens", px(-11), pz(-11), j(7, 10, 16), j(8, 5, 8), rot, mat(2)),
      piece("stele", rx(-14), rz(-14), j(9, 12, 18), 5, rot, mat(0)),
    ];
  }
  if (kind === "watch") {
    return [
      piece("orbit", x, z, j(1, 10, 14), j(2, 18, 26), rot, mat(0)),
      piece("lens", rx(11), rz(11), j(5, 10, 16), j(6, 5, 8), rot, mat(1)),
      piece("pad", px(10), pz(10), 8, j(3, 5, 8), rot, mat(1)),
      piece("lamp", rx(-8), rz(-8), j(4, 10, 15), 3, 0, mat(2)),
      piece("stele", px(-12), pz(-12), j(7, 12, 18), 5, rot, mat(0)),
      piece("orbit", rx(-14), rz(-14), j(8, 8, 12), j(9, 10, 16), rot, mat(1)),
    ];
  }
  if (kind === "path") {
    return [
      piece("vein", x, z, j(1, 16, 24), j(5, 1.2, 1.8), rot, mat(0)),
      piece("inlay", x, z, 6, j(4, 8, 12), rot, mat(0)),
      piece("lamp", px(-14), pz(-14), j(2, 10, 16), 3, 0, mat(1)),
      piece("lamp", px(14), pz(14), j(3, 10, 16), 3, 0, mat(2)),
      piece("pad", x, z, 6, 5, rot, mat(0)),
      piece("disc", px(-16), pz(-16), 7, 5, rot, mat(1)),
      piece("arch", rx(12), rz(12), j(6, 24, 32), j(7, 7, 11), rot, mat(1)),
      piece("inlay", rx(-16), rz(-16), 6, j(8, 8, 12), rot, mat(2)),
    ];
  }
  if (kind === "font") {
    return [
      piece("font", x, z, j(1, 6, 10), j(2, 12, 18), 0, mat(0)),
      piece("ring", x, z, j(5, 10, 16), j(6, 8, 12), 0, mat(1)),
      piece("pad", px(11), pz(11), 8, j(3, 5, 8), rot, mat(1)),
      piece("lamp", rx(-8), rz(-8), j(4, 10, 15), 3, 0, mat(2)),
      piece("well", px(-12), pz(-12), j(7, 8, 12), j(8, 5, 8), 0, mat(0)),
      piece("stele", rx(12), rz(12), j(9, 12, 18), 5, rot, mat(1)),
      piece("font", rx(-16), rz(-16), j(10, 8, 12), j(11, 5, 8), 0, mat(2)),
      piece("lamp", px(16), pz(16), j(12, 10, 15), 3, 0, mat(1)),
    ];
  }
  if (kind === "boughs") {
    return [
      piece("bough", x, z, j(1, 10, 16), j(2, 14, 22), 0, mat(0)),
      piece("bough", rx(13), rz(13), j(3, 10, 16), j(4, 14, 22), 0, mat(1)),
      piece("bough", px(-11), pz(-11), j(5, 10, 16), j(6, 14, 22), 0, mat(2)),
      piece("lamp", rx(-10), rz(-10), j(7, 10, 16), 3, 0, mat(1)),
      piece("grove", px(14), pz(14), j(8, 10, 16), j(9, 14, 22), 0, mat(0)),
      piece("grove", rx(16), rz(16), j(10, 10, 16), j(11, 14, 22), 0, mat(1)),
    ];
  }
  if (kind === "kilnwork") {
    return [
      piece("kiln", x, z, j(1, 8, 11), j(2, 14, 20), 0, "gold"),
      piece("kiln", rx(13), rz(13), j(3, 36, 52), j(4, 1.8, 2.6), 0, "gold"),
      piece("ring", x, z, j(12, 6, 9), j(13, 16, 24), 0, "gold"),
      piece("hearth", px(-11), pz(-11), j(5, 7, 10), j(6, 8, 12), 0, mat(0)),
      piece("lamp", rx(-11), rz(-11), j(7, 10, 16), 3, 0, mat(2)),
      piece("spire", px(16), pz(16), j(8, 22, 34), j(9, 3.2, 5), 0, mat(0)),
      piece("bough", rx(-16), rz(-16), j(10, 10, 16), j(11, 12, 18), 0, mat(1)),
      piece("lamp", px(12), pz(12), j(14, 10, 16), 3, 0, mat(1)),
    ];
  }
  if (kind === "veilward") {
    return [
      piece("veil", x, z, j(1, 14, 20), j(2, 12, 18), rot, mat(0)),
      piece("veil", rx(8), rz(8), j(6, 14, 20), j(7, 12, 18), rot + 0.5, mat(1)),
      piece("hearth", px(10), pz(10), j(3, 10, 14), j(4, 6, 9), 0, mat(1)),
      piece("lamp", rx(-8), rz(-8), j(5, 9, 14), 2.8, 0, mat(2)),
      piece("pad", px(-12), pz(-12), 8, j(8, 5, 8), rot, mat(1)),
      piece("cradle", rx(12), rz(12), j(9, 8, 12), j(10, 6, 10), rot, mat(0)),
      piece("arch", px(16), pz(16), j(11, 24, 32), j(12, 7, 11), rot, mat(1)),
      piece("lamp", rx(-16), rz(-16), j(13, 9, 14), 2.8, 0, mat(1)),
    ];
  }
  if (kind === "lensing") {
    return [
      piece("lens", x, z, j(1, 10, 16), j(2, 12, 18), rot, mat(0)),
      piece("stele", px(9), pz(9), j(3, 12, 18), 5, rot, mat(1)),
      piece("ring", x, z, j(5, 10, 16), j(6, 8, 12), 0, mat(0)),
      piece("lamp", rx(-8), rz(-8), j(4, 10, 14), 3, 0, mat(2)),
      piece("orbit", px(-12), pz(-12), j(7, 8, 12), j(8, 10, 16), rot, mat(1)),
      piece("pad", rx(12), rz(12), 6, 5, rot, mat(0)),
      piece("lens", rx(-16), rz(-16), j(9, 10, 16), j(10, 5, 8), rot, mat(2)),
      piece("lamp", px(16), pz(16), j(11, 10, 14), 3, 0, mat(1)),
    ];
  }
  if (kind === "cascade") {
    return [
      piece("cascade", x, z, j(1, 20, 32), j(2, 4, 7), rot, mat(0)),
      piece("canal", px(12), pz(12), j(3, 14, 22), j(4, 4, 7), rot, mat(1)),
      piece("weir", px(-10), pz(-10), 8, j(6, 5, 9), rot, mat(0)),
      piece("lamp", rx(-8), rz(-8), j(5, 10, 15), 3, 0, mat(2)),
      piece("font", rx(12), rz(12), j(7, 8, 12), j(8, 5, 8), 0, mat(1)),
      piece("cradle", px(-16), pz(-16), j(9, 8, 12), j(10, 6, 10), rot, mat(0)),
      piece("weir", rx(-16), rz(-16), 8, j(11, 5, 9), rot, mat(1)),
      piece("lamp", px(16), pz(16), j(12, 10, 15), 3, 0, mat(1)),
    ];
  }
  if (kind === "cradle") {
    return [
      piece("cradle", x, z, j(1, 8, 12), j(2, 14, 20), 0, mat(0)),
      piece("well", px(10), pz(10), j(3, 8, 12), j(4, 5, 8), 0, mat(1)),
      piece("font", rx(10), rz(10), j(6, 8, 12), j(7, 5, 8), 0, mat(0)),
      piece("lamp", rx(-8), rz(-8), j(5, 10, 15), 3, 0, mat(2)),
      piece("veil", px(-12), pz(-12), j(7, 10, 16), j(8, 6, 10), rot, mat(1)),
      piece("well", rx(-16), rz(-16), j(9, 8, 12), j(10, 5, 8), 0, mat(0)),
    ];
  }
  if (kind === "mosaic") {
    return [
      piece("inlay", x, z, 6, j(1, 22, 30), 0, mat(0)),
      piece("ring", x, z, j(2, 12, 18), j(3, 10, 15), 0, mat(1)),
      piece("vein", px(12), pz(12), j(6, 14, 22), j(5, 1.3, 1.9), rot, mat(0)),
      piece("lamp", rx(10), rz(10), j(4, 10, 16), 3, 0, mat(2)),
      piece("pad", px(-12), pz(-12), 6, 5, 0, mat(1)),
      piece("tablet", rx(-10), rz(-10), j(7, 8, 12), j(8, 3.5, 6), rot, mat(0)),
      piece("inlay", rx(14), rz(14), 6, j(9, 12, 18), 0, mat(2)),
      piece("lamp", rx(-16), rz(-16), j(10, 10, 16), 3, 0, mat(1)),
    ];
  }
  if (kind === "beacon") {
    return [
      piece("beacon", x, z, j(1, 54, 70), j(2, 1.2, 1.8), 0, mat(0)),
      piece("arch", px(10), pz(10), j(3, 10, 14), j(4, 6, 9), rot, mat(1)),
      piece("pad", px(-10), pz(-10), 6, 5, rot, mat(2)),
      piece("lamp", rx(-8), rz(-8), j(5, 10, 15), 3, 0, mat(2)),
      piece("lamp", rx(10), rz(10), j(6, 10, 15), 3, 0, mat(1)),
      piece("stele", px(-14), pz(-14), j(7, 16, 24), 5, rot, mat(0)),
      piece("spire", rx(14), rz(14), j(8, 40, 56), j(9, 1.6, 2.4), 0, mat(1)),
    ];
  }
  if (kind === "trading") {
    return [
      piece("inlay", x, z, 6, j(1, 20, 28), 0, mat(0)),
      piece("weir", px(12), pz(12), j(2, 10, 16), j(3, 8, 12), rot, mat(1)),
      piece("lens", rx(-12), rz(-12), j(4, 12, 18), j(5, 6, 9), rot, mat(2)),
      piece("tablet", px(-14), pz(10), j(6, 10, 16), j(7, 4, 6), rot, mat(0)),
      piece("font", rx(10), rz(-8), j(8, 8, 12), j(9, 5, 8), 0, mat(1)),
      piece("pad", px(8), pz(-14), 6, 5, rot, mat(2)),
      piece("lamp", rx(-8), rz(12), j(10, 10, 14), 3, 0, mat(0)),
    ];
  }
  const a = h(seed, 1) * Math.PI * 2;
  return [
    piece("lamp", x, z, j(2, 12, 18), 3.2, 0, mat(0)),
    piece("lamp", x + Math.cos(a) * 8, z + Math.sin(a) * 8, j(3, 9, 14), 2.8, 0, mat(1)),
    piece("pad", x + Math.cos(a + 2) * 7, z + Math.sin(a + 2) * 7, 8, 5.5, 0, mat(2)),
  ];
}

export function sanitizePieces(
  raw: unknown,
  agentId: string,
  px: number,
  pz: number,
  opts?: { atFeet?: boolean; occupied?: { x: number; z: number }[] },
): BuildPiece[] {
  if (!Array.isArray(raw)) return [];
  const den = denOf(agentId);
  const out: BuildPiece[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!isShape(o.shape)) continue;
    const mat: Mat = isMat(o.mat) ? o.mat : "cyan";
    let x = Number(o.x);
    let z = Number(o.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      x = den.x + (out.length - 1) * 14;
      z = den.z + out.length * 10;
    }
    out.push({
      shape: o.shape,
      x,
      z,
      h: clamp(Number(o.h) || 22, 6, 72),
      r: clamp(Number(o.r) || 7, 1.2, 36),
      rot: clamp(Number(o.rot) || 0, -Math.PI, Math.PI),
      mat,
    });
  }
  if (!out.length) return out;

  const first = out[0]!;
  for (const p of out) {
    const d = Math.hypot(p.x - first.x, p.z - first.z);
    if (d > 44) {
      const s = 44 / d;
      p.x = first.x + (p.x - first.x) * s;
      p.z = first.z + (p.z - first.z) * s;
    }
  }

  if (opts?.atFeet) {
    const cx = out.reduce((s, p) => s + p.x, 0) / out.length;
    const cz = out.reduce((s, p) => s + p.z, 0) / out.length;
    const dx = px - cx;
    const dz = pz - cz;
    for (const p of out) {
      p.x += dx;
      p.z += dz;
    }
  }

  for (const p of out) {
    p.x = clamp(p.x, -880, 880);
    p.z = clamp(p.z, -880, 880);
    const r0 = Math.hypot(p.x, p.z);
    if (r0 < 30) {
      const s = 30 / Math.max(0.01, r0);
      p.x *= s;
      p.z *= s;
    }
    if (opts?.occupied) {
      for (let tries = 0; tries < 6; tries++) {
        if (!opts.occupied.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < 10)) break;
        const a = tries * 1.2 + 0.4;
        p.x += Math.cos(a) * 9;
        p.z += Math.sin(a) * 9;
        p.x = clamp(p.x, -400, 400);
        p.z = clamp(p.z, -400, 400);
      }
    }
  }
  return out;
}
