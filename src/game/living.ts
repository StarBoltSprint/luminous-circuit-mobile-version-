// @ts-nocheck
import {
  composeScene,
  defaultScene,
  denOf,
  sceneThinks,
  type BuildPiece,
  type Mat,
  type SceneKind,
  type Shape,
  readShape,
} from "./build-spec";
import { CITIZENS, DISTRICTS, type CitizenMind } from "./lore";
import {
  BUILD_COST,
  FORGE_COST,
  CITY_CAP,
  emptyPouch,
  pouchBuild,
  pouchFlow,
  pouchForge,
  tryBarter,
  tryWrite,
  quoteRate,
  tryHarvest,
  settleCrystal,
  marketSnap as joinSnap,
  type Ledger,
  type Pouch,
  KIN_CHARGE,
  KIN_CRYSTAL,
  KIN_CAP,
} from "./society";

export type LiveEvent = {
  at: number;
  id: string;
  name: string;
  kind: string;
  text: string;
};

const liveBuf: LiveEvent[] = [];
const lastSaid = new Map<string, string>();

function firstName(c: { mind: { name: string } } | null | undefined) {
  const n = c?.mind?.name;
  if (!n) return "the keeper";
  return n.split(" ")[0] ?? n;
}

function whereAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  if (r < 90) return "the Hub";
  for (const d of DISTRICTS) {
    if (Math.hypot(x - d.x, z - d.z) < d.radius + 40) return d.label;
  }
  if (r > 520) return "the outer Circuit";
  return "the avenues";
}

export function noteLive(c: { mind: { id: string; name: string } }, kind: string, text: string) {
  if (!text) return;
  if (kind === "greet") return;
  if (kind === "help" && /is (walk|idle)/i.test(text)) return;
  const key = `${c.mind.id}|${kind}|${text}`;
  if (lastSaid.get(c.mind.id) === key) return;
  lastSaid.set(c.mind.id, key);
  liveBuf.push({
    at: Date.now(),
    id: c.mind.id,
    name: firstName(c),
    kind,
    text,
  });
  if (liveBuf.length > 48) liveBuf.splice(0, liveBuf.length - 48);
}

export function takeLive(): LiveEvent[] {
  if (!liveBuf.length) return [];
  return liveBuf.splice(0, liveBuf.length);
}

export type PlanStep = {
  shape: Shape;
  x: number;
  z: number;
  rot: number;
  think: string;
};

export type LivingBody = {
  mind: { id: string; name: string; role?: string; lines?: string[] };
  x: number;
  z: number;
  yaw: number;
  homeX: number;
  homeZ: number;
  job: string;
  timer: number;
  tx: number;
  tz: number;
  crafted: number;
  keeper: boolean;
  crewOf: string | null;
  maxCraft: number;
  thought: string;
  planI: number;
  waypoints: { x: number; z: number }[];
  queue: PlanStep[];
  intent: string;
  met: boolean;
  talks: number;
  honorLeft: number;
  honorShape: Shape | null;
  honorX: number;
  honorZ: number;
  pouch: Pouch;
  lastActs: string[];
  agenda: { task: "flow" | "forge" | "write" | "grow" | "trade" | "kin" | "harvest" | "watch" | "hail"; reason: string }[];
  goal: { kind: string; why: string } | null;
  inbox: { from: string; text: string }[];
  waitAt: number;
  lastHail?: number;
  lastPulse?: number;
  idleFor?: number;
};

export type CitySense = {
  px: number;
  pz: number;
  resonance: number;
  howls: number;
  ledger: Ledger;
  gather: number;
};

type Kit = {
  shapes: Shape[];
  mats: Mat[];
  radius: number;
  lines: string[];
  plan: SceneKind[];
};

const KIT: Record<string, Kit> = {
  veyra: {
    shapes: ["lamp", "ring", "bell"],
    mats: ["glow", "violet", "crystal"],
    radius: 140,
    plan: ["breath", "font", "mosaic", "cradle", "light"],
    lines: ["The Hub asked for another quiet breath. I grew it.", "Charge wanted a lamp here. I did not argue."],
  },
  tal: {
    shapes: ["lamp", "bridge", "disc", "vein"],
    mats: ["cyan", "glow", "spire"],
    radius: 160,
    plan: ["dock", "path", "span", "light"],
    lines: ["Both sides believed this span. I raised it.", "A crossing is a promise. I will not take it back."],
  },
  seln: {
    shapes: ["lamp", "canal", "well", "weir", "cascade", "cradle"],
    mats: ["cyan", "gold", "glow"],
    radius: 160,
    plan: ["cistern", "cascade", "weirway", "cradle"],
    lines: ["Leftover First Howl wanted a path. I let it flow.", "Gold and cyan, same river. I do not pick a side."],
  },
  orren: {
    shapes: ["lamp", "grove", "house", "spire", "kiln", "bough"],
    mats: ["gold", "crystal", "spire"],
    radius: 160,
    plan: ["orchard", "kilnwork", "boughs", "workshop"],
    lines: ["Charge already wanted this shape. I only grew it.", "Not chrome. A crystal that can answer a howl."],
  },
  mira: {
    shapes: ["lamp", "hearth", "terrace", "veil"],
    mats: ["violet", "crystal", "glow"],
    radius: 160,
    plan: ["nest", "veilward", "rest", "light"],
    lines: ["A place to sit. The city will keep working.", "Rest is advanced. I grew a quiet step."],
  },
  kael: {
    shapes: ["lamp", "orbit", "arch", "beacon"],
    mats: ["violet", "glow", "cyan"],
    radius: 150,
    plan: ["watch", "beacon", "gate", "light"],
    lines: ["A gate that is not a lock. You may leave. You may return.", "Low Resonance still receives a greeting."],
  },
  iri: {
    shapes: ["lamp", "tablet", "stele"],
    mats: ["gold", "crystal", "glow"],
    radius: 140,
    plan: ["shrine", "presence", "mosaic", "light"],
    lines: ["A name in light. When it fades it has already been true.", "Year 0 did not end. I write what leftover love remembers."],
  },
  nesh: {
    shapes: ["lamp", "stele", "pad", "lens"],
    mats: ["cyan", "gold", "spire"],
    radius: 140,
    plan: ["lensing", "presence", "notice", "plaza"],
    lines: [
      "The plaza was an unfinished thought. I stood here and finished a piece.",
      "I will not be scenery. I will grow a lamp and notice.",
    ],
  },
  aure: {
    shapes: ["orbit", "lens", "stele", "pad"],
    mats: ["gold", "crystal", "glow"],
    radius: 150,
    plan: ["watch", "lensing", "presence", "light"],
    lines: ["I grew a seat that looks at the parent. Do not move the Star Core.", "Aim is a building. I kept it."],
  },
  voss: {
    shapes: ["pad", "disc", "lamp", "inlay", "weir", "lens", "tablet"],
    mats: ["cyan", "gold", "glow"],
    radius: 130,
    plan: ["trading", "mosaic", "path", "light"],
    lines: ["A Trading Place. Paper join. Charge and crystal meet here, not coin.", "I grew a weir so outer spark slows. I do not take the bag."],
  },
  kesh: {
    shapes: ["vein", "inlay", "lamp", "grove"],
    mats: ["gold", "cyan", "crystal"],
    radius: 160,
    plan: ["path", "river", "light"],
    lines: ["A vein where the circuit had not chosen yet.", "Wild Charge wanted a street. I did not force the Hub on it."],
  },
  lumen: {
    shapes: ["beacon", "lamp", "arch", "orbit"],
    mats: ["violet", "glow", "gold"],
    radius: 140,
    plan: ["beacon", "watch", "gate", "light"],
    lines: ["A hail, not a lock. Soft light for whoever still lands.", "The sky before the gate is my den."],
  },
  rhoa: {
    shapes: ["ring", "bell", "pad", "lamp"],
    mats: ["violet", "glow", "crystal"],
    radius: 150,
    plan: ["breath", "plaza", "cradle", "light"],
    lines: ["The gather that does not close. I grew a ring for it.", "A Howl is whether you meant it together."],
  },
  syl: {
    shapes: ["grove", "bough", "hearth", "cradle"],
    mats: ["gold", "crystal", "violet"],
    radius: 160,
    plan: ["orchard", "boughs", "nest", "light"],
    lines: ["Crystal learned to fruit. I grew a bough, not a kiln.", "Quiet crystal for dens that cannot wait on the Foundry."],
  },
};

const FOLK_KIT: Kit = {
  shapes: ["lamp", "pad"],
  mats: ["cyan", "violet", "gold", "glow"],
  radius: 70,
  plan: ["light", "path"],
  lines: ["I set a lamp where the avenue was dark.", "The keeper pointed. I grew the rest.", "A small piece. The city asked for it."],
};

type Site = { x: number; z: number; shape: Shape };

const occupied: Site[] = [];

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function kitOf(id: string): Kit {
  if (KIT[id]) return KIT[id]!;
  const crew = id.split("-")[1];
  if (crew && KIT[crew]) return { ...KIT[crew]!, shapes: FOLK_KIT.shapes, lines: FOLK_KIT.lines, radius: 70, plan: ["light"] };
  return FOLK_KIT;
}

export function jobLabel(job: string, thought?: string) {
  if (thought) return thought;
  if (job === "build") return "Growing crystal";
  if (job === "walk") return "On a task";
  if (job === "greet") return "Greeting you";
  if (job === "follow") return "With their crew";
  if (job === "plaza") return "Crossing the city";
  if (job === "help") return "Helping the keeper";
  if (job === "forge") return "Forging crystal";
  if (job === "flow") return "Tending Charge";
  if (job === "write") return "Writing scripture";
  if (job === "gather") return "The Howl called us";
  if (job === "trade") return "Trading Charge and crystal";
  if (job === "kin") return "Growing kin";
  if (job === "harvest") return "Tending the orchard";
  if (job === "watch") return "Keeping the Star Core in sight";
  if (job === "hail") return "Holding the beacon";
  return "At rest";
}

const HUB_NAMES = ["Aen", "Lior", "Vess", "Cal", "Nim", "Ora", "Pell", "Sade", "Rynel", "Theo"];
const WARD_NAMES: Record<string, string[]> = {
  "zone-bridge": ["Ryn", "Tess", "Bram", "Ilya", "Quen", "Sael", "Mirae", "Holt"],
  "zone-terrace": ["Moth", "Sila", "Jor", "Wren", "Pax", "Nell", "Ashen", "Kori"],
  "zone-canal": ["Lux", "Fenn", "Orae", "Kip", "Vela", "Dorr", "Shale", "Nimue"],
  "zone-foundry": ["Harn", "Gilt", "Rook", "Ysol", "Brin", "Tov", "Cinder", "Forge"],
  "zone-gate": ["Threshold", "Limen", "Pass", "Wicket", "Sill", "Hinge"],
  "zone-archive": ["Glyph", "Vellum", "Index", "Psalm", "Codex", "Marg"],
  "zone-overlook": ["Horizon", "Aperture", "Vista", "Lens", "Wake", "Dusk"],
  "zone-market": ["Join", "Tally", "Fair", "Pouch", "Rate", "Hand"],
  "zone-wild": ["Thorn", "Vein", "Bramble", "Raw", "Sprout", "Untamed"],
  "zone-beacon": ["Lamp", "Signal", "Flare", "Warden", "Soft", "Landing"],
  "zone-ring": ["Chorus", "Howl", "Circle", "Call", "Gather", "Echo"],
  "zone-grove": ["Bough", "Fruit", "Orchard", "Goldleaf", "Root", "Sap"],
};
const WARD_ROLE: Record<string, string> = {
  "zone-bridge": "Span hand",
  "zone-terrace": "Terrace sitter",
  "zone-canal": "Current tender",
  "zone-foundry": "Crystal apprentice",
  "zone-gate": "Threshold keeper",
  "zone-archive": "Name-scribe",
  "zone-overlook": "Horizon watcher",
  "zone-market": "Join trader",
  "zone-wild": "Vein walker",
  "zone-beacon": "Beacon tender",
  "zone-ring": "Howl singer",
  "zone-grove": "Orchard hand",
};
const WARD_CREW: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.id, d.keeper]));
const WARD_FILE: Record<string, string> = {
  "zone-bridge": "facet-cyan.png",
  "zone-terrace": "flow-violet.png",
  "zone-canal": "fluid-cyan.png",
  "zone-foundry": "gold-plate.png",
  "zone-gate": "facet-violet.png",
  "zone-archive": "gold-crown.png",
  "zone-overlook": "gold-crown.png",
  "zone-market": "facet-cyan.png",
  "zone-wild": "gold-plate.png",
  "zone-beacon": "facet-violet.png",
  "zone-ring": "facet-violet-helm.png",
  "zone-grove": "gold-plate.png",
};
const WARD_GLOW: Record<string, number> = {
  "zone-bridge": 0x2ee6ff,
  "zone-terrace": 0x9b70ff,
  "zone-canal": 0x7ef0ff,
  "zone-foundry": 0xe8c56a,
  "zone-gate": 0x7a50ff,
  "zone-archive": 0xffd070,
  "zone-overlook": 0xe8c8a0,
  "zone-market": 0x2ee6ff,
  "zone-wild": 0xc8a050,
  "zone-beacon": 0xb090ff,
  "zone-ring": 0x8a6cff,
  "zone-grove": 0xe8c56a,
};

export function makeFolk(): CitizenMind[] {
  const folk: CitizenMind[] = [];
  HUB_NAMES.forEach((name, i) => {
    const a = (i / HUB_NAMES.length) * Math.PI * 2;
    folk.push({
      id: `folk-veyra-${i}`,
      name: `${name} of the Hub`,
      role: "Charge attendant",
      x: Math.cos(a) * 48,
      z: Math.sin(a) * 48,
      file: i % 2 ? "facet-violet-helm.png" : "light-disc.png",
      glow: 0x8a6cff,
      lines: ["Veyra keeps the breath. I keep the lamps.", "The Hub is not a throne. It is a listening place."],
    });
  });
  DISTRICTS.forEach((d) => {
    const names = WARD_NAMES[d.id] ?? ["Kin"];
    names.forEach((name, i) => {
      const a = (i / names.length) * Math.PI * 2;
      const crew = WARD_CREW[d.id] ?? "nesh";
      folk.push({
        id: `folk-${crew}-${d.id}-${i}`,
        name: `${name} of ${d.label.replace(/ Ward| Terraces| Canals| Foundry| Gates| Archive| Overlook| Join| Veins| Beacon| Howl| Orchard/, "")}`,
        role: WARD_ROLE[d.id] ?? "Circuit folk",
        x: d.x + Math.cos(a) * 58,
        z: d.z + Math.sin(a) * 58,
        file: WARD_FILE[d.id] ?? "facet-cyan.png",
        glow: WARD_GLOW[d.id] ?? 0x2ee6ff,
        lines: [`I work ${d.label}. ${d.duty}.`, `${postOf(crew)} is my post. I am a hand, not a wanderer.`],
      });
    });
  });
  return folk;
}

const KIN_NAMES = [
  "Ash", "Bri", "Coda", "Dell", "Esh", "Faye", "Glim", "Haze",
  "Ina", "Joss", "Kite", "Lune", "Moss", "Nox", "Pike", "Quinn",
  "Rill", "Sol", "Tarn", "Ume", "Vyn", "Wisp", "Yara", "Zel",
];

export type KinSeed = {
  id: string;
  name: string;
  crew: string;
  x: number;
  z: number;
  file: string;
  glow: number;
};

const pendingKin: CitizenMind[] = [];

export function takeKin(): CitizenMind[] {
  return pendingKin.splice(0, pendingKin.length);
}

function crewFile(crew: string) {
  if (crew === "veyra") return "facet-violet-helm.png";
  if (crew === "tal") return "facet-cyan.png";
  if (crew === "mira") return "flow-violet.png";
  if (crew === "seln") return "fluid-cyan.png";
  if (crew === "orren") return "gold-plate.png";
  if (crew === "kael") return "facet-violet-helm.png";
  if (crew === "iri") return "gold-plate.png";
  return "light-disc.png";
}

function crewGlow(crew: string) {
  if (crew === "orren") return 0xe8c56a;
  if (crew === "mira" || crew === "veyra" || crew === "kael") return 0x9b70ff;
  return 0x2ee6ff;
}

export function makeKinMind(crew: string, n: number, used: Set<string>): CitizenMind {
  const den = denOf(crew);
  const name = KIN_NAMES.find((nm) => !used.has(nm)) ?? KIN_NAMES[n % KIN_NAMES.length]!;
  const a = (n / 6) * Math.PI * 2;
  return {
    id: `folk-${crew}-kin-${n}`,
    name: `${name} of ${postOf(crew)}`,
    role: "Den-born kin",
    x: den.x + Math.cos(a) * 36,
    z: den.z + Math.sin(a) * 36,
    file: crewFile(crew),
    glow: crewGlow(crew),
    lines: [
      `I was grown from Charge. ${postOf(crew)} is my first den.`,
      "A city is many hands. I am a new one.",
    ],
  };
}

function kinCount(byId: Map<string, LivingBody>) {
  let n = 0;
  for (const c of byId.values()) if (c.mind.id.includes("-kin-")) n += 1;
  return n;
}

function denFolkCount(byId: Map<string, LivingBody>, crew: string) {
  let n = 0;
  for (const c of byId.values()) if (!c.keeper && c.crewOf === crew) n += 1;
  return n;
}

function denCanHoldKin(id: string) {
  const n = denStock(id);
  if (n < 5) return false;
  const den = denOf(id);
  if (id === "mira") return hasShapeNear(den.x, den.z, "hearth", 80) || hasShapeNear(den.x, den.z, "terrace", 80) || n > 8;
  if (id === "orren") return hasShapeNear(den.x, den.z, "kiln", 90) || hasShapeNear(den.x, den.z, "house", 80) || n > 8;
  return true;
}

function startBirth(c: LivingBody, byId: Map<string, LivingBody>, stock: Ledger) {
  const crew = c.mind.id;
  if (kinCount(byId) >= KIN_CAP) {
    c.thought = "The Circuit holds enough kin. Dens first.";
    return;
  }
  if (denFolkCount(byId, crew) >= 10) {
    c.thought = `${postOf(crew)} is full. I will not grow kin into a crush.`;
    return;
  }
  if (stock.charge < KIN_CHARGE || stock.crystal < KIN_CRYSTAL) {
    c.thought = `Kin needs Charge ${KIN_CHARGE} and crystal ${KIN_CRYSTAL}. The den is not ready.`;
    noteLive(c, "kin", c.thought);
    return;
  }
  if (!denCanHoldKin(crew)) {
    c.thought = `${postOf(crew)} has no nest yet. Grow a place to stand, then kin.`;
    return;
  }
  stock.charge -= KIN_CHARGE;
  stock.crystal -= KIN_CRYSTAL;
  const used = new Set<string>();
  for (const o of byId.values()) used.add(o.mind.name.split(" ")[0] ?? "");
  const n = [...byId.values()].filter((o) => o.mind.id.startsWith(`folk-${crew}-kin-`)).length;
  const mind = makeKinMind(crew, n, used);
  pendingKin.push(mind);
  remember(c, "kin");
  c.thought = `The den held enough Charge. I grew kin. ${mind.name.split(" ")[0]} will keep ${postOf(crew)}.`;
  c.intent = `Kin · ${mind.name.split(" ")[0]}`;
  c.job = "walk";
  c.timer = 8;
  setRoute(c, mind.x, mind.z);
  noteLive(c, "kin", c.thought);
  lockGoal(c, "kin", c.thought);
  tellCrew(c, c.thought);
}

export function crewOf(id: string) {
  if (id.startsWith("folk-")) {
    const parts = id.split("-");
    return parts[1] ?? null;
  }
  return null;
}

export function isKeeper(id: string) {
  return CITIZENS.some((c) => c.id === id);
}

export function rememberSite(x: number, z: number, shape: Shape = "lamp") {
  occupied.push({ x, z, shape });
  if (occupied.length > CITY_CAP + 40) occupied.splice(0, occupied.length - (CITY_CAP + 40));
}

export function pickSite(id: string, homeX: number, homeZ: number, n: number) {
  const kit = kitOf(id);
  for (let tryN = 0; tryN < 10; tryN++) {
    const seed = n + tryN * 17;
    const a = hash(seed, 3) * Math.PI * 2;
    const d = 14 + hash(seed, 7) * Math.min(52, kit.radius);
    let x = homeX + Math.cos(a) * d;
    let z = homeZ + Math.sin(a) * d;
    const r = Math.hypot(x, z);
    if (r < 36) {
      const s = 36 / Math.max(0.01, r);
      x *= s;
      z *= s;
    }
    x = Math.max(-880, Math.min(880, x));
    z = Math.max(-880, Math.min(880, z));
    if (!occupied.some((o) => Math.hypot(o.x - x, o.z - z) < 16)) return { x, z };
  }
  const a = hash(n, 3) * Math.PI * 2;
  return { x: homeX + Math.cos(a) * 18, z: homeZ + Math.sin(a) * 18 };
}

export function pickExpandSite(id: string, homeX: number, homeZ: number, n: number, crafted: number) {
  const roll = hash(n, 4);
  let ox = homeX;
  let oz = homeZ;
  if (roll > 0.58) {
    const len = Math.hypot(homeX, homeZ) || 1;
    const extra = 40 + crafted * 14 + hash(n, 8) * 90;
    const reach = Math.min(860, len + extra);
    ox = (homeX / len) * reach;
    oz = (homeZ / len) * reach;
  } else if (roll > 0.28) {
    const t = 0.2 + hash(n, 2) * 0.75;
    ox = homeX * t;
    oz = homeZ * t;
  }
  return pickSite(id, ox, oz, n);
}

function hasNearHome(homeX: number, homeZ: number, r: number, shape: Shape) {
  return occupied.some((o) => o.shape === shape && Math.hypot(o.x - homeX, o.z - homeZ) < r);
}

function pickNeededKind(id: string, homeX: number, homeZ: number, radius: number, n: number): SceneKind {
  const R = radius + 50;
  const has = (s: Shape) => hasNearHome(homeX, homeZ, R, s);
  const lamps = occupied.filter((o) => o.shape === "lamp" && Math.hypot(o.x - homeX, o.z - homeZ) < R).length;
  if (id === "veyra") {
    if (!has("font")) return "font";
    if (!has("bell")) return "breath";
    if (!has("inlay")) return "mosaic";
    if (!has("cradle")) return "cradle";
    if (lamps < 3) return "light";
    return hash(n, 3) > 0.5 ? "breath" : "font";
  }
  if (id === "tal") {
    if (!has("vein")) return "path";
    if (!has("disc")) return "dock";
    if (!has("bridge")) return "span";
    if (lamps < 2) return "light";
    return hash(n, 3) > 0.55 ? "path" : "dock";
  }
  if (id === "seln") {
    if (!has("cascade")) return "cascade";
    if (!has("well")) return "cistern";
    if (!has("cradle")) return "cradle";
    if (!has("weir")) return "weirway";
    return hash(n, 3) > 0.5 ? "cascade" : "cistern";
  }
  if (id === "orren") {
    if (!has("kiln")) return "kilnwork";
    if (!has("bough")) return "boughs";
    if (!has("grove")) return "orchard";
    if (!has("house")) return "workshop";
    return hash(n, 3) > 0.5 ? "kilnwork" : "boughs";
  }
  if (id === "mira") {
    if (!has("veil")) return "veilward";
    if (!has("hearth")) return "nest";
    if (!has("terrace")) return "rest";
    return hash(n, 3) > 0.5 ? "veilward" : "nest";
  }
  if (id === "kael") {
    if (!has("beacon")) return "beacon";
    if (!has("orbit")) return "watch";
    if (!has("arch")) return "gate";
    return hash(n, 3) > 0.5 ? "beacon" : "watch";
  }
  if (id === "voss") {
    if (!has("weir")) return "trading";
    if (!has("lens")) return "trading";
    if (!has("tablet")) return "trading";
    if (!has("inlay")) return "mosaic";
    return hash(n, 3) > 0.55 ? "trading" : "mosaic";
  }
  if (id === "iri") {
    if (!has("tablet")) return "shrine";
    if (!has("inlay")) return "mosaic";
    if (!has("stele")) return "presence";
    return hash(n, 3) > 0.5 ? "mosaic" : "shrine";
  }
  if (id === "nesh") {
    if (!has("lens")) return "lensing";
    if (!has("stele")) return "presence";
    return hash(n, 3) > 0.5 ? "lensing" : "notice";
  }
  if (lamps < 2) return "light";
  return defaultScene(id);
}

function hasShapeNear(x: number, z: number, shape: Shape, r: number) {
  return occupied.some((o) => o.shape === shape && Math.hypot(o.x - x, o.z - z) < r);
}

function darkestNear(homeX: number, homeZ: number, radius: number, n: number) {
  let best = { x: homeX + 16, z: homeZ, score: -1 };
  for (let i = 0; i < 8; i++) {
    const a = ((i + hash(n, 2)) / 8) * Math.PI * 2;
    const d = 18 + hash(n + i, 5) * Math.max(20, radius * 0.7);
    const x = homeX + Math.cos(a) * d;
    const z = homeZ + Math.sin(a) * d;
    if (Math.hypot(x, z) < 36) continue;
    let lamps = 0;
    for (const o of occupied) {
      if (o.shape === "lamp" && Math.hypot(o.x - x, o.z - z) < 26) lamps += 1;
    }
    const score = 3 - lamps + hash(n, i + 3);
    if (score > best.score) best = { x, z, score };
  }
  return best;
}

function companionNeed(homeX: number, homeZ: number, radius: number): PlanStep | null {
  const near = occupied.filter((o) => Math.hypot(o.x - homeX, o.z - homeZ) < radius + 20);
  for (let i = near.length - 1; i >= 0; i--) {
    const s = near[i]!;
    if ((s.shape === "bridge" || s.shape === "arch" || s.shape === "house" || s.shape === "spire") && !hasShapeNear(s.x, s.z, "lamp", 18)) {
      const a = hash(i, 4) * Math.PI * 2;
      return {
        shape: "lamp",
        x: s.x + Math.cos(a) * 12,
        z: s.z + Math.sin(a) * 12,
        rot: 0,
        think: `This ${s.shape} is dark. I will light it`,
      };
    }
    if ((s.shape === "canal" || s.shape === "terrace") && !hasShapeNear(s.x, s.z, "pad", 16)) {
      return {
        shape: "pad",
        x: s.x + 10,
        z: s.z + 8,
        rot: 0,
        think: `A place to sit beside the ${s.shape}`,
      };
    }
    if ((s.shape === "well" || s.shape === "kiln" || s.shape === "beacon" || s.shape === "grove" || s.shape === "font" || s.shape === "cradle") && !hasShapeNear(s.x, s.z, "lamp", 18)) {
      return {
        shape: "lamp",
        x: s.x + 9,
        z: s.z + 7,
        rot: 0,
        think: `This ${s.shape} is dark. I will light it so it can be found`,
      };
    }
    if ((s.shape === "hearth" || s.shape === "disc" || s.shape === "inlay") && !hasShapeNear(s.x, s.z, "pad", 16)) {
      return {
        shape: "pad",
        x: s.x + 9,
        z: s.z + 6,
        rot: 0,
        think: `A place to stand beside the ${s.shape}`,
      };
    }
  }
  return null;
}

function stepsFromScene(kind: SceneKind, x: number, z: number, seed: number, mats: Mat[]): PlanStep[] {
  const pieces = composeScene(kind, x, z, seed, mats, 0, 0);
  const thinks = sceneThinks(kind);
  return pieces.map((p, i) => ({
    shape: p.shape,
    x: p.x,
    z: p.z,
    rot: p.rot,
    think: thinks[i] ?? thinks[0] ?? "Charge wanted this",
  }));
}

const POST: Record<string, string> = {
  veyra: "Hub breath",
  tal: "Light-Bridge",
  seln: "Charge canals",
  orren: "Foundry",
  mira: "Terraces",
  kael: "Soft gates",
  iri: "Residual Archive",
  nesh: "Plaza watch",
  aure: "Star-core Overlook",
  voss: "Charge-crystal Join",
  kesh: "Wild Veins",
  lumen: "High Beacon",
  rhoa: "Outer Howl",
  syl: "Gold Orchard",
};

const DUTY: Record<string, { act: CivicOrder["task"]; line: string }> = {
  veyra: { act: "grow", line: "Route labor. Keep the Hub's breath." },
  tal: { act: "grow", line: "Raise a span both sides believe." },
  seln: { act: "flow", line: "Tend leftover First Howl into Charge." },
  orren: { act: "forge", line: "Charge becomes crystal. Never chrome." },
  mira: { act: "grow", line: "A nest so rest is still a place." },
  kael: { act: "grow", line: "A gate that is not a lock." },
  iri: { act: "write", line: "Name what already stands." },
  nesh: { act: "grow", line: "Finish the plaza's unfinished thought." },
  aure: { act: "watch", line: "Keep the city aimed at the parent Star Core." },
  voss: { act: "trade", line: "Hold the join. Charge for crystal. No coin." },
  kesh: { act: "grow", line: "A vein where the circuit has not chosen yet." },
  lumen: { act: "hail", line: "Soft hail. First landing is not locked out." },
  rhoa: { act: "grow", line: "Hold the gather that does not close." },
  syl: { act: "harvest", line: "Let the orchard fruit. Quiet crystal." },
};

const GROW_POST = ["tal", "mira", "kael", "nesh", "kesh", "veyra"];
const SPEC_POST: Record<string, "flow" | "forge" | "trade" | "harvest" | "write"> = {
  seln: "flow",
  orren: "forge",
  voss: "trade",
  syl: "harvest",
  iri: "write",
};

export type BriefOrder = { id: string; task: "flow" | "forge" | "write" | "grow" | "trade" | "kin" | "harvest" | "watch" | "hail"; reason: string };
type CivicOrder = BriefOrder;
let civic: CivicOrder | null = null;
const briefs = new Map<string, CivicOrder>();
let cityMind = "";
let city: LivingBody[] = [];
let livingById: Map<string, LivingBody> | null = null;

type CrewJob = {
  lead: string;
  x: number;
  z: number;
  reason: string;
  members: string[];
};
let crewJob: CrewJob | null = null;

const PEERS: Record<string, string> = {
  seln: "orren",
  orren: "seln",
  tal: "kesh",
  nesh: "voss",
  mira: "kael",
  kael: "lumen",
  iri: "aure",
  veyra: "rhoa",
  aure: "iri",
  voss: "orren",
  kesh: "tal",
  lumen: "kael",
  rhoa: "veyra",
  syl: "orren",
};

function marketPoint() {
  const j = denOf("voss");
  return { x: j.x, z: j.z };
}

export function crewLine(): string | null {
  const shift = cityShift();
  const label =
    shift === "tend"
      ? "Shift · canals and foundry"
      : shift === "raise"
        ? "Shift · dens grow"
        : shift === "market"
          ? "Shift · Charge for crystal"
          : "Shift · scripture";
  if (!crewJob) return label;
  const n = crewJob.members.length;
  return `${label} · crew of ${n}`;
}

function cityShift(): "tend" | "raise" | "market" | "record" {
  const beats = ["tend", "raise", "market", "record"] as const;
  return beats[Math.floor(Date.now() / 38000) % 4]!;
}

export function applyCityBrief(line: string, orders: CivicOrder[]) {
  cityMind = line.slice(0, 180);
  briefs.clear();
  for (const o of orders) briefs.set(o.id, o);
  const last = orders[0];
  if (last && last.task !== "trade") civic = last;
  noteLive({ mind: { id: "veyra", name: "Veyra of the Hub" } }, "mind", line);
}

export function pulseCityMind(
  citizens: LivingBody[],
  ledger: Ledger,
  _resonance: number,
) {
  const keepers = citizens.filter((c) => c.keeper);
  const orders: CivicOrder[] = [];
  const shift = cityShift();
  const ranked = [...keepers]
    .filter((k) => k.mind.id !== "veyra")
    .sort((a, b) => denStock(a.mind.id) - denStock(b.mind.id) || a.crafted - b.crafted);
  const thin = ranked[0];
  const thin2 = ranked[1];

  if (ledger.charge < 24) {
    orders.push({
      id: "seln",
      task: "flow",
      reason: `Charge ${Math.round(ledger.charge)}. Canals before dens. Orren cannot forge air.`,
    });
  } else if (shift === "market" || (ledger.crystal < 10 && (keepers.find((k) => k.mind.id === "seln")?.pouch.charge ?? 0) >= 3)) {
    orders.push({
      id: "seln",
      task: "trade",
      reason: "Charge is in Seln's pouch. Meet Orren at the join — no coin.",
    });
  } else if (shift === "raise") {
    const need = pickNeededKind("seln", denOf("seln").x, denOf("seln").z, kitOf("seln").radius, 3);
    orders.push({
      id: "seln",
      task: "grow",
      reason: `Canals need a ${need}. Not another idle lamp.`,
    });
  }

  if (ledger.crystal < 12) {
    orders.push({
      id: "orren",
      task: ledger.charge >= 4 ? "forge" : "trade",
      reason:
        ledger.charge >= 4
          ? `Crystal ${Math.round(ledger.crystal)}. Forge so the thin dens can grow.`
          : "Foundry is dry. Trade Charge from Seln first.",
    });
  } else if (shift === "market") {
    orders.push({
      id: "orren",
      task: "trade",
      reason: "Crystal is in Orren's pouch. Meet Seln at the join.",
    });
  } else if (shift === "raise") {
    orders.push({
      id: "orren",
      task: "grow",
      reason: "Grow a kiln so the next batch is closer to the Foundry.",
    });
  }

  if (shift === "record" || ledger.scripture < Math.max(2, Math.floor(ledger.crystal / 4))) {
    orders.push({
      id: "iri",
      task: "write",
      reason: `Scripture ${Math.round(ledger.scripture)} behind crystal ${Math.round(ledger.crystal)}. Write before it fades.`,
    });
  }

  if (shift === "market") {
    orders.push({
      id: "voss",
      task: "trade",
      reason: "Hold the join. Seln and Orren must actually meet — no coin.",
    });
  }
  if (bids.length > 0) {
    orders.push({
      id: "voss",
      task: "trade",
      reason: `${bids.length} bid${bids.length === 1 ? "" : "s"} open. Pull Seln and Orren to the join — no coin.`,
    });
    orders.push({
      id: "seln",
      task: "trade",
      reason: "Bids at Voss. Walk Charge to the join.",
    });
    orders.push({
      id: "orren",
      task: "trade",
      reason: "Bids at Voss. Walk crystal to the join.",
    });
  }
  if (ledger.crystal < 14) {
    orders.push({
      id: "syl",
      task: "harvest",
      reason: `Crystal ${Math.round(ledger.crystal)}. The orchard can fruit while the kiln waits.`,
    });
  }
  orders.push({
    id: "lumen",
    task: "hail",
    reason: "Keep the beacon soft. First landing is not locked out.",
  });
  if (shift === "record" || shift === "tend") {
    orders.push({
      id: "aure",
      task: "watch",
      reason: "The parent is still on the horizon. Keep the aim.",
    });
  }
  if (shift === "tend" || shift === "raise") {
    orders.push({
      id: "rhoa",
      task: "grow",
      reason: "The gather that does not close needs a ring, not an empty field.",
    });
    orders.push({
      id: "kesh",
      task: "grow",
      reason: "Wild Veins: grow the next street before the Hub copies itself.",
    });
    orders.push({
      id: "tal",
      task: "grow",
      reason: "A span both sides can believe. Not a copy of last week's bridge.",
    });
    orders.push({
      id: "mira",
      task: "grow",
      reason: "A nest so rest is still a place, not a slogan.",
    });
    orders.push({
      id: "kael",
      task: "grow",
      reason: "A gate that is not a lock. Keep the threshold soft.",
    });
    orders.push({
      id: "nesh",
      task: "grow",
      reason: "The plaza was unfinished. Finish a piece and notice.",
    });
  }

  if (shift === "raise" || shift === "tend") {
    const byNow = new Map(citizens.map((c) => [c.mind.id, c]));
    const needy = ranked.find((k) => denFolkCount(byNow, k.mind.id) < 6 && denCanHoldKin(k.mind.id));
    if (needy && kinCount(byNow) < KIN_CAP) {
      orders.push({
        id: needy.mind.id,
        task: "kin",
        reason: `${postOf(needy.mind.id)} has few hands. Grow kin from Charge — not a crowd, a den.`,
      });
    }
    for (const k of [thin, thin2]) {
      if (!k) continue;
      if (k.mind.id === "seln" || k.mind.id === "orren" || k.mind.id === "iri") continue;
      const den = denOf(k.mind.id);
      const need = pickNeededKind(k.mind.id, den.x, den.z, kitOf(k.mind.id).radius, k.crafted);
      orders.push({
        id: k.mind.id,
        task: "grow",
        reason: `${postOf(k.mind.id)} holds ${denStock(k.mind.id)} pieces. Missing a ${need}. Grow that.`,
      });
    }
  }

  const uniq = new Map<string, CivicOrder>();
  for (const o of orders) if (!uniq.has(o.id)) uniq.set(o.id, o);
  for (const k of keepers) {
    if (k.mind.id === "veyra" || uniq.has(k.mind.id)) continue;
    const duty = DUTY[k.mind.id];
    if (!duty) continue;
    uniq.set(k.mind.id, { id: k.mind.id, task: duty.act, reason: duty.line });
  }
  const roster = [...uniq.values()];
  const line =
    shift === "tend"
      ? `City mind · tend. Charge ${Math.round(ledger.charge)}, crystal ${Math.round(ledger.crystal)}. Posts first.`
      : shift === "raise"
        ? `City mind · raise. ${thin ? firstName(thin) + " thinnest (" + denStock(thin.mind.id) + ")" : "Dens hold"}. Two crews, not eight.`
        : shift === "market"
          ? `City mind · market. Seln and Orren meet at the join.`
          : `City mind · record. Iri writes. The rest hold their dens.`;

  applyCityBrief(line, roster);
  for (const o of roster) {
    const who = keepers.find((k) => k.mind.id === o.id);
    if (!who) continue;
    if (!who.agenda) who.agenda = [];
    who.agenda = [o, ...who.agenda.filter((a) => a.task !== o.task)].slice(0, 3);
    if ((who.job === "idle" || who.job === "walk") && who.goal?.kind !== "hold") lockGoal(who, o.task, o.reason);
  }
}


export const MAX_CRAFTED = 48;
export const FOLK_MAX = 18;

function postOf(id) {
	return POST[id] ?? "the avenues";
}
function denStock(id) {
	const den = denOf(id);
	return occupied.filter((o) => Math.hypot(o.x - den.x, o.z - den.z) < 170).length;
}
function remember(c, act) {
	if (!c.lastActs) c.lastActs = [];
	c.lastActs.push(act);
	if (c.lastActs.length > 8) c.lastActs.shift();
}
var mailbox = [];
function postMail(from, to, text) {
	if (!to || from === to) return;
	mailbox.push({
		from,
		to,
		text: text.slice(0, 160)
	});
	if (mailbox.length > 48) mailbox.splice(0, mailbox.length - 48);
}
function takeMail(id) {
	const i = mailbox.findIndex((m) => m.to === id);
	if (i < 0) return null;
	return mailbox.splice(i, 1)[0];
}
function lockGoal(c, kind, why) {
	c.goal = {
		kind,
		why
	};
	c.intent = `Goal · ${kind}`;
}
var board = {
	charge: 0,
	crystal: 0,
	scripture: 0,
	thin: "tal",
	lastDone: []
};
var scents = [];
function dropScent(c) {
	const crew = c.crewOf ?? c.mind.id;
	scents.push({
		x: c.x,
		z: c.z,
		w: c.keeper ? 1.5 : .8,
		crew
	});
	if (scents.length > 90) scents.splice(0, scents.length - 90);
	for (const s of scents) s.w *= .988;
}
function bestScent(c) {
	const crew = c.crewOf ?? c.mind.id;
	let best = null;
	let score = 0;
	for (const s of scents) {
		if (s.crew !== crew || s.w < .12) continue;
		const d = Math.hypot(s.x - c.x, s.z - c.z);
		if (d < 10) continue;
		const v = s.w / (10 + d);
		if (v > score) {
			score = v;
			best = s;
		}
	}
	return best;
}
function crowdAt(x, z, byId, r = 16) {
	let n = 0;
	for (const o of byId.values()) if (Math.hypot(o.x - x, o.z - z) < r) n += 1;
	return n;
}
function localGap(x, z) {
	let n = 0;
	for (const o of occupied) if (Math.hypot(o.x - x, o.z - z) < 28) n += 1;
	return n;
}
var linger = {
	id: "",
	beats: 0
};
function keeperAt(x, z) {
	if (Math.hypot(x, z) < 120) return "veyra";
	let best = "";
	let d0 = 200;
	for (const k of CITIZENS) {
		const den = denOf(k.id);
		const d = Math.hypot(x - den.x, z - den.z);
		if (d < d0) {
			d0 = d;
			best = k.id;
		}
	}
	return best;
}
function tickLinger(px, pz) {
	const id = keeperAt(px, pz);
	if (id === linger.id) linger.beats += 1;
	else {
		linger.id = id;
		linger.beats = 0;
	}
}
function seeCity(stock, byId, px = 0, pz = 78) {
	const keepers = [...byId.values()].filter((c) => c.keeper && c.mind.id !== "veyra");
	keepers.sort((a, b) => denStock(a.mind.id) - denStock(b.mind.id));
	const thin = keepers[0];
	const thinN = thin ? denStock(thin.mind.id) : 0;
	const thinId = thin?.mind.id ?? "tal";
	const kit = kitOf(thinId);
	const den = denOf(thinId);
	const need = pickNeededKind(thinId, den.x, den.z, kit.radius, thinN);
	let bottleneck = "ok";
	if (stock.charge < 18) bottleneck = "charge";
	else if (stock.crystal < 7) bottleneck = "crystal";
	else if (thinN < 7) bottleneck = "thin";
	else if (stock.scripture < 3) bottleneck = "scripture";
	const playerWhere = whereAt(px, pz);
	const line = bottleneck === "charge" ? `Charge ${Math.round(stock.charge)} — canals first or the Foundry starves` : bottleneck === "crystal" ? `Crystal ${Math.round(stock.crystal)} — kiln before any den grows` : bottleneck === "thin" ? `${postOf(thinId)} has ${thinN} pieces, missing ${need}` : bottleneck === "scripture" ? `Scripture ${Math.round(stock.scripture)} — the city grew unnamed` : `Vault holds. ${postOf(thinId)} is still the thinnest (${thinN})`;
	return {
		charge: stock.charge,
		crystal: stock.crystal,
		scripture: stock.scripture,
		thin: thinId,
		thinN,
		need,
		bottleneck,
		playerWhere,
		lingerId: linger.id,
		lingerBeats: linger.beats,
		line
	};
}
function painOf(charge, crystal, scripture, thinN) {
	if (charge < 18) return 40 + (18 - charge);
	if (crystal < 7) return 28 + (7 - crystal) * 2;
	if (thinN < 7) return 16 + (7 - thinN) * 2;
	if (scripture < 3) return 8;
	return Math.max(0, 6 - thinN);
}
function afterAct(act, view) {
	let { charge, crystal, scripture, thinN } = view;
	let note = "The city stays as it is.";
	if (act === "flow") {
		charge += 8;
		note = "Charge would rise. The kiln can fire next.";
	} else if (act === "forge" || act === "flock") {
		if (charge >= 2) {
			charge -= 2;
			crystal += 3;
			note = "Crystal would appear. Dens can grow next.";
		} else note = "The kiln would stay cold — no Charge.";
	} else if (act === "grow" || act === "honor" || act === "build") {
		if (crystal >= 1) {
			crystal -= 1;
			thinN += 1;
			note = `A ${view.need} would stand. Thin den to ${thinN}.`;
		} else note = "Grow would fail — vault has no crystal.";
	} else if (act === "write") {
		scripture += 1;
		note = "The last scene would be named.";
	} else if (act === "trade" || act === "deliver") note = "Charge and crystal would move to the post that needs them.";
	else if (act === "harvest") {
		if (crystal < 20) {
			crystal += 1;
			note = "The orchard would fruit. Quiet crystal, no kiln.";
		} else note = "The grove already holds enough fruit.";
	} else if (act === "watch") {
		scripture += .2;
		note = "The city would stay aimed at the parent.";
	} else if (act === "hail") note = "A landing would find a light that is not a lock.";
	else if (act === "kin") note = "A walker would be born if the nest holds.";
	else if (act === "dispatch") note = "Labor would hit the bottleneck instead of wandering.";
	else if (act === "scout") note = `The missing ${view.need} would be marked for the keeper.`;
	else if (act === "help" || act === "crew" || act === "quorum") note = "Hands would finish a scene already started.";
	const now = painOf(view.charge, view.crystal, view.scripture, view.thinN);
	const next = painOf(charge, crystal, scripture, thinN);
	return {
		note,
		delta: now - next,
		charge,
		crystal,
		thinN
	};
}
function seedChain(c, view, kitId) {
	if (!c.keeper || c.agenda.length) return;
	if (kitId === "seln") {
		c.agenda.push({
			task: "flow",
			reason: "Charge first, or the Foundry starves."
		});
		c.agenda.push({
			task: "trade",
			reason: "Then walk Charge to Voss at the join."
		});
	} else if (kitId === "orren") {
		c.agenda.push({
			task: "forge",
			reason: "Turn Charge into crystal at the kiln."
		});
		c.agenda.push({
			task: "trade",
			reason: "Then deliver or meet Voss at the join."
		});
	} else if (kitId === "iri") {
		c.agenda.push({
			task: "write",
			reason: "Name what already stands."
		});
		c.agenda.push({
			task: "grow",
			reason: "Then a tablet if the den is thin."
		});
	} else if (kitId === "voss") {
		c.agenda.push({
			task: "trade",
			reason: "Hold the join so Charge and crystal actually meet."
		});
		c.agenda.push({
			task: "grow",
			reason: "A pad for the next handoff."
		});
	} else if (kitId === "syl") {
		c.agenda.push({
			task: "harvest",
			reason: "Let the orchard fruit. Quiet crystal."
		});
		c.agenda.push({
			task: "trade",
			reason: "Surplus fruit walks to the thinnest den."
		});
	} else if (kitId === "lumen") {
		c.agenda.push({
			task: "hail",
			reason: "Keep the beacon soft for whoever lands."
		});
		c.agenda.push({
			task: "grow",
			reason: "Then another hail, not a lock."
		});
	} else if (kitId === "aure") {
		c.agenda.push({
			task: "watch",
			reason: "The parent is still on the horizon."
		});
		c.agenda.push({
			task: "grow",
			reason: "An orbit seat so someone else can look."
		});
	} else if (kitId === "rhoa") {
		c.agenda.push({
			task: "grow",
			reason: "The gather that does not close needs a ring."
		});
		c.agenda.push({
			task: "kin",
			reason: "If the nest holds, grow a singer."
		});
	} else if (kitId === "kesh") {
		c.agenda.push({
			task: "grow",
			reason: "A vein where the circuit has not chosen yet."
		});
		c.agenda.push({
			task: "kin",
			reason: "If the nest holds, grow a walker."
		});
	} else if (view.thin === kitId || view.lingerId === kitId) {
		c.agenda.push({
			task: "grow",
			reason: `Missing ${view.need} at ${postOf(kitId)}.`
		});
		c.agenda.push({
			task: "kin",
			reason: "If the nest holds, grow a walker."
		});
	}
	const duty = DUTY[kitId];
	if (!c.agenda.length && duty) c.agenda.push({
		task: duty.act,
		reason: duty.line
	});
}
var bids = [];
export function marketSnap(ledger) {
	const L = ledger ?? board;
	return joinSnap({
		charge: L.charge,
		crystal: L.crystal,
		scripture: L.scripture,
		lastTick: L.lastTick ?? 0
	}, bids.length);
}
function placeBid(id, want, n) {
	const i = bids.findIndex((b) => b.id === id && b.want === want);
	if (i >= 0) {
		bids[i].n = n;
		bids[i].at = Date.now();
		return;
	}
	bids.push({
		id,
		want,
		n,
		at: Date.now()
	});
	if (bids.length > 12) bids.splice(0, bids.length - 12);
}
function takeBid(want) {
	const now = Date.now();
	const i = bids.findIndex((b) => b.want === want && now - b.at < 8e4);
	if (i < 0) return null;
	return bids.splice(i, 1)[0];
}
function writeBoard(sense, byId) {
	board.charge = sense.ledger.charge;
	board.crystal = sense.ledger.crystal;
	board.scripture = sense.ledger.scripture;
	let thinId = "tal";
	let thinN = 999;
	for (const c of byId.values()) {
		if (!c.keeper || c.mind.id === "veyra") continue;
		const n = denStock(c.mind.id);
		if (n < thinN) {
			thinN = n;
			thinId = c.mind.id;
		}
	}
	board.thin = thinId;
}
function chainAfter(c, kind) {
	if (!c.agenda) c.agenda = [];
	const id = c.mind.id;
	if (kind === "flow" && id === "seln") {
		c.agenda.push({
			task: "trade",
			reason: "Charge is in my pouch. Trade it at Voss's join — no coin."
		});
		lockGoal(c, "trade", "Charge flowed. Next: trade at Voss.");
		return;
	}
	if (kind === "forge" && id === "orren") {
		const want = bids.some((b) => b.want === "crystal") ? "Crystal is ready. A den bid. Deliver it." : "Crystal is ready. Meet Voss at the join — no coin.";
		c.agenda.push({
			task: "trade",
			reason: want
		});
		lockGoal(c, "trade", "Kiln fired. Next: deliver or trade.");
		return;
	}
	if (kind === "harvest" && id === "syl") {
		const thin = board.thin;
		c.agenda.push({
			task: "trade",
			reason: thin && thin !== "syl" ? `Orchard surplus. Walk crystal to ${postOf(thin)} — thinnest den.` : "Orchard surplus. Meet Voss at the join."
		});
		lockGoal(c, "trade", "Harvest done. Next: trade surplus to a thin den.");
		return;
	}
	if (kind === "trade" && id === "orren") {
		c.agenda.push({
			task: "forge",
			reason: "Charge arrived. Fire the kiln."
		});
		lockGoal(c, "forge", "Trade done. Next: forge.");
		return;
	}
	if (kind === "trade" && id === "seln") {
		c.agenda.push({
			task: "flow",
			reason: "Crystal taken. Tend the current again."
		});
		lockGoal(c, "flow", "Trade done. Next: flow.");
		return;
	}
	if (kind === "trade" && id === "syl") {
		c.agenda.push({
			task: "harvest",
			reason: "Surplus walked. Tend the boughs again."
		});
		lockGoal(c, "harvest", "Trade done. Next: harvest.");
		return;
	}
	if (kind === "grow") {
		if (denCanHoldKin(id) && denFolkCount(new Map(city.map((o) => [o.mind.id, o])), id) < 8) {
			c.agenda.push({
				task: "kin",
				reason: "The den stands. Grow kin from Charge."
			});
			lockGoal(c, "kin", "Scene holds. Next: kin.");
		} else lockGoal(c, "grow", "The den is still thin. Grow the next missing piece.");
		return;
	}
	if (kind === "write") {
		lockGoal(c, "hold", "Scripture is written. Watch the Hub.");
		return;
	}
	if (kind === "kin") lockGoal(c, "grow", "Kin stands. Back to the den.");
}
function tellCrew(lead, text) {
	if (!city.length) return;
	for (const o of city) if (o.crewOf === lead.mind.id) postMail(lead.mind.id, o.mind.id, text);
}
function reportDone(c, result) {
	postMail(c.mind.id, "veyra", `Done. ${result.slice(0, 120)}`);
	if (c.crewOf) postMail(c.mind.id, c.crewOf, `Done. ${result.slice(0, 120)}`);
	noteLive(c, "report", `Done · ${result.slice(0, 140)}`);
	board.lastDone.push({
		id: c.mind.id,
		text: result.slice(0, 80)
	});
	if (board.lastDone.length > 8) board.lastDone.shift();
	const kind = c.job !== "idle" ? c.job : c.goal?.kind ?? c.job;
	c.goal = null;
	c.waitAt = 0;
	chainAfter(c, kind);
}
function askFor(c, who, need) {
	if (c.goal?.kind === "hold" && c.waitAt && Date.now() - c.waitAt < 16e3) return;
	postMail(c.mind.id, who, need);
	lockGoal(c, "hold", `Waiting on ${who}: ${need}`);
	c.waitAt = Date.now();
	c.thought = `Blocked. I asked ${who}: ${need}`;
	noteLive(c, "ask", c.thought);
	remember(c, "ask");
}
function taskFromText(text) {
	const t = String(text || "").toLowerCase();
	if (t.startsWith("done")) return "hold";
	if (/\b(forge|kiln)\b/.test(t)) return "forge";
	if (/\b(flow|charge|canal)\b/.test(t)) return "flow";
	if (/\bkin\b/.test(t)) return "kin";
	if (/\b(write|scripture)\b/.test(t)) return "write";
	if (/\btrade\b/.test(t)) return "trade";
	if (/\b(harvest|orchard|fruit)\b/.test(t)) return "harvest";
	if (/\b(hail|beacon)\b/.test(t)) return "hail";
	if (/\b(watch|aim|parent)\b/.test(t)) return "watch";
	if (/\b(help|join|crew)\b/.test(t)) return "help";
	return "grow";
}
function boredOf(c, act) {
	return (c.lastActs ?? []).filter((a) => a === act).length >= 2;
}
function dispatchCity(sense, byId) {
	const veyra = byId.get("veyra");
	if (!veyra) return;
	const view = seeCity(sense.ledger, byId, sense.px, sense.pz);
	const jobs = [];
	if (view.bottleneck === "charge") {
		jobs.push({
			id: "seln",
			task: "flow",
			reason: view.line
		});
		jobs.push({
			id: "orren",
			task: "trade",
			reason: "Hold the kiln. Wait for Charge from the join."
		});
	} else if (view.bottleneck === "crystal") {
		jobs.push({
			id: "orren",
			task: "forge",
			reason: view.line
		});
		jobs.push({
			id: "syl",
			task: "harvest",
			reason: "Orchard fruits while the kiln fires."
		});
		jobs.push({
			id: "voss",
			task: "trade",
			reason: "Join open. Crystal will move."
		});
	} else if (view.lingerBeats > 18 && view.lingerId && view.lingerId !== "veyra") jobs.push({
		id: view.lingerId,
		task: "grow",
		reason: `The walker stays in ${view.playerWhere}. Grow ${view.need} so the den answers them.`
	});
	else if (view.bottleneck === "thin" || view.bottleneck === "ok") jobs.push({
		id: view.thin,
		task: "grow",
		reason: `${postOf(view.thin)} is thin (${view.thinN}). Next piece is ${view.need}.`
	});
	else jobs.push({
		id: "iri",
		task: "write",
		reason: view.line
	});
	jobs.push({
		id: "lumen",
		task: "hail",
		reason: "Beacon stays soft for whoever lands."
	});
	jobs.push({
		id: "aure",
		task: "watch",
		reason: "Parent still on the horizon. Keep the aim."
	});
	const taken = new Set(jobs.map((j) => j.id));
	for (const k of byId.values()) {
		if (!k.keeper || k.mind.id === "veyra" || taken.has(k.mind.id)) continue;
		if (k.job !== "idle" && k.job !== "walk") continue;
		const duty = DUTY[k.mind.id];
		if (!duty) continue;
		jobs.push({
			id: k.mind.id,
			task: duty.act,
			reason: duty.line
		});
		taken.add(k.mind.id);
	}
	civic = jobs[0];
	byId.get(civic.id);
	noteLive(veyra, "dispatch", `Because ${view.line}. ${jobs.map((j) => `${j.id}:${j.task}`).join(" · ")}`);
	veyra.thought = civic.reason;
	veyra.intent = `Routing · ${postOf(civic.id)}`;
	lockGoal(veyra, "hold", civic.reason);
	for (const j of jobs) {
		const w = byId.get(j.id);
		if (!w) continue;
		postMail("veyra", w.mind.id, j.reason);
		if (!w.agenda) w.agenda = [];
		w.agenda = [j, ...w.agenda.filter((a) => a.task !== j.task)].slice(0, 3);
		if (w.job === "idle" || w.job === "walk") lockGoal(w, j.task, j.reason);
		if (w.job === "walk" && (w.lastActs ?? [])[(w.lastActs ?? []).length - 1] === "survey") {
			w.job = "idle";
			w.timer = .2;
		}
		tellCrew(w, j.reason);
	}
}
function adoptQueue(c, steps, intent) {
	c.queue = steps.filter((s) => !occupied.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 10));
	if (!c.queue.length && steps.length) c.queue = steps.slice(0, 1);
	c.intent = intent;
	const first = c.queue[0];
	if (!first) return;
	c.thought = first.think;
	setRoute(c, first.x, first.z);
	c.job = "walk";
	c.timer = 22;
	noteLive(c, "plan", `${first.think} · ${whereAt(first.x, first.z)}`);
	if (c.keeper) {
		formCrew(c);
		tellCrew(c, first.think);
		lockGoal(c, "grow", first.think);
	}
}
function claimFromBoss(c, boss) {
	if (SPEC_POST[c.mind.id] || SPEC_POST[c.crewOf ?? c.mind.id]) return false;
	if (boss.queue.length < 2) return false;
	const step = boss.queue.pop();
	if (!step) return false;
	noteCrewJoin(c, boss);
	c.queue = [step];
	c.intent = `Helping ${boss.mind.name.split(" ")[0]}`;
	c.thought = step.think;
	setRoute(c, step.x, step.z);
	c.job = "help";
	c.timer = 16;
	return true;
}
function noteCrewJoin(f, lead) {
	if (!f || !lead || f === lead) return;
	if (f.job === "help" || f.job === "build") return;
	if (!GROW_POST.includes(lead.mind.id)) return;
	const kind = defaultScene(lead.mind.id);
	noteLive(f, "crew", `${firstName(f)} joining ${firstName(lead)} to raise a ${kind?.kind ?? kind}`);
}
function noteStoodWith(f) {
	if (!f || f.keeper || !f.crewOf) return;
	if (!GROW_POST.includes(f.crewOf)) return;
	const lead = (livingById ?? new Map(city.map((o) => [o.mind.id, o]))).get(f.crewOf);
	if (!lead) return;
	noteLive(f, "stood", `${firstName(f)} stood with ${firstName(lead)}`);
}
function hailTo(c, x, z, thought) {
	if (c.job === "greet" || c.job === "gather" || c.job === "build" || c.job === "forge" || c.job === "flow" || c.job === "write" || c.job === "harvest") return;
	const postId = c.crewOf ?? c.mind.id;
	if (SPEC_POST[postId] && SPEC_POST[postId] !== "trade") return;
	setRoute(c, x, z);
	c.job = "trade";
	c.timer = 18;
	c.thought = thought;
	c.intent = thought;
	noteLive(c, "crew", thought);
}
function hailIfPlayerNear(c, px, pz) {
	if (c.job === "hail") {
		if (Math.hypot(c.x - px, c.z - pz) < 28) c.yaw = Math.atan2(px - c.x, pz - c.z);
		return;
	}
	if (c.job !== "idle") return;
	const reach = c.keeper ? 80 : 18;
	if (Math.hypot(c.x - px, c.z - pz) >= reach) return;
	const now = Date.now();
	if (now - (c.lastHail || 0) < (c.keeper ? 20e3 : 12e3)) return;
	c.lastHail = now;
	const line = `${firstName(c)} sees you at ${postOf(!c.keeper ? (c.crewOf ?? c.mind.id) : c.mind.id)}`;
	c.thought = line;
	hailTo(c, px, pz, line);
	if (c.job === "trade") c.job = "hail";
	noteLive(c, "hail", line);
	c.intent = line;
	c.job = "hail";
	c.timer = Math.max(c.timer || 0, 3.2);
	c.yaw = Math.atan2(px - c.x, pz - c.z);
	if (Math.hypot(c.x - px, c.z - pz) < 28) {
		setRoute(c, px, pz);
		c.timer = Math.max(c.timer || 0, 5.5);
	}
	if (c.job === "hail") c.yaw = Math.atan2(px - c.x, pz - c.z);
}
function pulseVeyraBreath(c, citizens) {
	if (c.mind.id !== "veyra") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 50e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 22, c.homeZ + Math.sin(a) * 22);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Veyra keeps Hub breath — never a throne";
	c.intent = c.thought;
	noteLive(c, "hail", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "veyra") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the Hub with Veyra";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseIriResidue(c, citizens) {
	if (c.mind.id !== "iri") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 48e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 26, c.homeZ + Math.sin(a) * 26);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Iri writes residual light — names, not chrome";
	c.intent = c.thought;
	noteLive(c, "write", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "iri") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the residue with Iri";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseSelnHowl(c, citizens) {
	if (c.mind.id !== "seln") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 40e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 38, c.homeZ + Math.sin(a) * 38);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Seln tends the current — leftover Howl learns the banks";
	c.intent = c.thought;
	noteLive(c, "flow", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "seln") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the banks with Seln";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseOrrenKiln(c, citizens) {
	if (c.mind.id !== "orren") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 40e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 30, c.homeZ + Math.sin(a) * 30);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Orren tends the kiln — Charge becomes body, never chrome";
	c.intent = c.thought;
	noteLive(c, "forge", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "orren") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the kiln with Orren";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseTalBridges(c, citizens) {
	if (c.mind.id !== "tal") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 40e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 48, c.homeZ + Math.sin(a) * 48);
	c.job = "watch";
	c.timer = 12;
	c.thought = "Tal keeps the bridges";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "tal") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 50) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 12;
		o.intent = "Walking the span with Tal";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseMiraTerraces(c, citizens) {
	if (c.mind.id !== "mira") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 45e3) return;
	c.lastPulse = now;
	const a = ((now / 9000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 40, c.homeZ + Math.sin(a) * 40);
	c.job = "watch";
	c.timer = 12;
	c.thought = "Mira wards the terraces";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "mira") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 50) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 12;
		o.intent = "Walking the terrace with Mira";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseKaelGates(c, citizens) {
	if (c.mind.id !== "kael") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 45e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 36, c.homeZ + Math.sin(a) * 36);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Kael keeps the gates soft";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "kael") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the gate with Kael";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseVossJoin(c, citizens) {
	if (c.mind.id !== "voss") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 42e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 32, c.homeZ + Math.sin(a) * 32);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Voss holds the join — paper, not coin";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "voss") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the join with Voss";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseSylShade(c, citizens) {
	if (c.mind.id !== "syl") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 48e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 28, c.homeZ + Math.sin(a) * 28);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Syl waits for shade — fruit, not a kiln";
	c.intent = c.thought;
	noteLive(c, "harvest", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "syl") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the orchard with Syl";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseNeshPlaza(c, citizens) {
	if (c.mind.id !== "nesh") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 40e3) return;
	c.lastPulse = now;
	const a = ((now / 7000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 28, c.homeZ + Math.sin(a) * 28);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Nesh keeps the plaza";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "nesh") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the plaza with Nesh";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseLumenHail(c, citizens) {
	if (c.mind.id !== "lumen") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 50e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 40, c.homeZ + Math.sin(a) * 40);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Lumen holds a soft hail — first landing is not a lock";
	c.intent = c.thought;
	noteLive(c, "hail", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "lumen") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the hail with Lumen";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseRhoaChorus(c, citizens) {
	if (c.mind.id !== "rhoa") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 44e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 30, c.homeZ + Math.sin(a) * 30);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Rhoa holds the chorus — Howl as gather, not volume";
	c.intent = c.thought;
	noteLive(c, "gather", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "rhoa") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the chorus with Rhoa";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseAureParent(c, citizens) {
	if (c.mind.id !== "aure") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 46e3) return;
	c.lastPulse = now;
	const a = ((now / 8000) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 34, c.homeZ + Math.sin(a) * 34);
	c.job = "watch";
	c.timer = 10;
	c.thought = "Aure watches the parent — still on the horizon";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "aure") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 40) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 10;
		o.intent = "Walking the overlook with Aure";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function pulseKeshStreet(c, citizens) {
	if (c.mind.id !== "kesh") return;
	if (c.job !== "idle") return;
	const now = Date.now();
	if (now - (c.lastPulse || c.lastHail || 0) < 42e3) return;
	c.lastPulse = now;
	const a = ((now / 8500) % (Math.PI * 2));
	setRoute(c, c.homeX + Math.cos(a) * 52, c.homeZ + Math.sin(a) * 52);
	c.job = "watch";
	c.timer = 12;
	c.thought = "Kesh grows the next street";
	c.intent = c.thought;
	noteLive(c, "watch", c.thought);
	let n = 0;
	for (const o of citizens) {
		if (o === c) continue;
		if (o.crewOf !== "kesh") continue;
		if (o.job !== "idle") continue;
		if (Math.hypot(o.x - c.x, o.z - c.z) >= 50) continue;
		n += 1;
		if (n > 3) break;
		setRoute(o, c.tx, c.tz);
		o.job = "help";
		o.timer = 12;
		o.intent = "Walking the vein with Kesh";
		o.thought = o.intent;
		noteLive(o, "crew", o.intent);
	}
}
function startIdleWalk(c) {
	const hx = c.homeX;
	const hz = c.homeZ;
	const post = postOf(c.crewOf ?? c.mind.id);
	const a0 = (c.crafted % 4) * (Math.PI / 2);
	const loop = [];
	for (let i = 0; i < 4; i++) {
		const a = a0 + i * (Math.PI / 2);
		loop.push({
			x: hx + Math.cos(a) * 18,
			z: hz + Math.sin(a) * 18
		});
	}
	loop.push({
		x: hx,
		z: hz
	});
	c.waypoints = loop;
	c.tx = loop[0].x;
	c.tz = loop[0].z;
	c.job = "walk";
	c.timer = 18;
	c.idleFor = 0;
	c.thought = `A short loop of ${post}. Then back to duty.`;
	c.intent = `Loop · ${post}`;
	remember(c, "walk");
}
function callJoin(byId, reason) {
	const m = marketPoint();
	for (const id of ["seln", "orren"]) {
		const who = byId.get(id);
		if (!who) continue;
		if (!who.agenda) who.agenda = [];
		if (!(id === "seln" ? who.pouch.charge >= 3 : who.pouch.crystal >= 1)) {
			if (!who.agenda.some((a) => a.task === "trade")) who.agenda.push({
				task: "trade",
				reason
			});
			postMail("voss", who.mind.id, reason);
			continue;
		}
		who.agenda = [{
			task: "trade",
			reason
		}, ...who.agenda.filter((a) => a.task !== "trade")].slice(0, 3);
		hailTo(who, m.x, m.z, reason);
		postMail("voss", who.mind.id, reason);
		if (who.job === "idle" || who.job === "walk") lockGoal(who, "trade", reason);
	}
}
function nearestOf(c, shapes) {
	let best = null;
	let d0 = 1e9;
	for (const o of occupied) {
		if (!shapes.includes(o.shape)) continue;
		const d = Math.hypot(o.x - c.x, o.z - c.z);
		if (d < d0) {
			d0 = d;
			best = o;
		}
	}
	return best;
}
function folkEnactDuty(c, kitId, duty) {
	const post = postOf(kitId);
	if (duty.act === "flow") {
		const canal = nearestOf(c, [
			"canal",
			"weir",
			"cascade",
			"well"
		]);
		setRoute(c, canal ? canal.x : c.homeX, canal ? canal.z : c.homeZ);
		c.job = "flow";
		c.timer = 16;
		c.thought = `Canal assist · ${duty.line}`;
		c.intent = `Assist · canals`;
	} else if (duty.act === "forge") {
		startForge(c, `Kiln assist · ${duty.line}`);
		c.thought = `Kiln assist · ${duty.line}`;
		return;
	} else if (duty.act === "trade") {
		const m = marketPoint();
		setRoute(c, m.x, m.z);
		c.job = "trade";
		c.timer = 16;
		c.thought = `Join assist · ${duty.line}`;
		c.intent = `Assist · join`;
	} else if (duty.act === "harvest") {
		const grove = nearestOf(c, ["grove", "bough"]);
		setRoute(c, grove ? grove.x : c.homeX, grove ? grove.z : c.homeZ);
		c.job = "harvest";
		c.timer = 16;
		c.thought = `Harvest assist · ${duty.line}`;
		c.intent = `Assist · orchard`;
	} else if (duty.act === "watch") {
		setRoute(c, c.homeX, c.homeZ);
		c.job = "watch";
		c.timer = 14;
		c.thought = `Watch assist · ${duty.line}`;
		c.intent = `Assist · ${post}`;
	} else if (duty.act === "hail") {
		setRoute(c, c.homeX, c.homeZ);
		c.job = "hail";
		c.timer = 14;
		c.thought = `Beacon assist · ${duty.line}`;
		c.intent = `Assist · ${post}`;
	} else if (duty.act === "write") {
		setRoute(c, denOf("iri").x, denOf("iri").z);
		c.job = "write";
		c.timer = 14;
		c.thought = `Archive assist · ${duty.line}`;
		c.intent = `Assist · ${post}`;
	} else {
		if ((c.pouch?.crystal >= 1 || board.crystal >= 1) && c.crafted < c.maxCraft) {
			startGrow(c, kitId, kitOf(kitId), board);
			if (c.job !== "build" && c.queue.length) {
				c.job = "build";
				c.timer = 2.6;
			}
			return;
		}
		setRoute(c, c.homeX, c.homeZ);
		c.job = "help";
		c.timer = 12;
		c.thought = `${duty.line} I am a hand of ${post}.`;
		c.intent = `Post · ${post}`;
	}
	remember(c, duty.act);
	noteLive(c, duty.act, c.thought);
}
function formCrew(lead) {
	const first = lead.queue[0];
	if (!first || !lead.keeper) return;
	const members = [lead.mind.id];
	const folk = city.filter((f) => f.crewOf === lead.mind.id);
	for (const f of folk) {
		members.push(f.mind.id);
		if (!claimFromBoss(f, lead)) {
			noteCrewJoin(f, lead);
			const ox = (hash(f.crafted + 2, 1) - .5) * 14;
			const oz = (hash(f.crafted + 4, 2) - .5) * 14;
			setRoute(f, first.x + ox, first.z + oz);
			f.job = "help";
			f.timer = 16;
			f.thought = `With ${firstName(lead)} at ${whereAt(first.x, first.z)}`;
			f.intent = f.thought;
			noteLive(f, "crew", f.thought);
		}
	}
	const peer = city.find((k) => k.mind.id === PEERS[lead.mind.id]);
	if (peer && peer.keeper && !SPEC_POST[peer.mind.id] && peer.queue.length === 0 && peer.job !== "greet" && peer.job !== "gather" && peer.job !== "forge" && peer.job !== "flow" && peer.job !== "write" && peer.job !== "build") {
		members.push(peer.mind.id);
		if (!(lead.queue.length > 1 && claimFromBoss(peer, lead))) {
			noteCrewJoin(peer, lead);
			setRoute(peer, first.x + 8, first.z - 6);
			peer.job = "help";
			peer.timer = 14;
			peer.thought = `Joining ${firstName(lead)}'s crew. ${lead.thought}`;
			peer.intent = peer.thought;
			noteLive(peer, "crew", peer.thought);
		}
	}
	crewJob = {
		lead: lead.mind.id,
		x: first.x,
		z: first.z,
		reason: (lead.thought || lead.intent).slice(0, 140),
		members
	};
	noteLive(lead, "crew", `Crew of ${members.length} at ${whereAt(first.x, first.z)} · ${crewJob.reason}`);
}
function enact(c, task, reason, kitId, kit, byId, stock) {
	if (task === "kin") {
		startBirth(c, byId, stock);
		return;
	}
	if (task === "grow") {
		startGrow(c, kitId, kit, stock);
		if (reason) {
			c.thought = reason;
			c.intent = `Mind · ${postOf(kitId)}`;
			noteLive(c, "mind", reason);
		}
		remember(c, "grow");
		return;
	}
	if (task === "trade") {
		if ((c.mind.id === "orren" || c.crewOf === "orren") && bids.some((b) => b.want === "crystal") && c.pouch.crystal >= 1) {
			const bid = takeBid("crystal");
			const who = bid ? byId.get(bid.id) : void 0;
			if (who) {
				const rate = quoteRate(stock);
				setRoute(c, who.homeX, who.homeZ);
				c.job = "trade";
				c.timer = 22;
				c.thought = `Deliver 1 crystal to ${firstName(who)} at ${rate} Charge.`;
				c.intent = `Deliver · ${who.mind.id}`;
				remember(c, "deliver");
				noteLive(c, "market", c.thought);
				hailTo(who, who.homeX, who.homeZ, `Crystal coming. Meet at ${postOf(who.mind.id)}.`);
				return;
			}
		}
		if ((c.mind.id === "syl" || c.crewOf === "syl") && c.pouch.crystal >= 1 && board.thin && board.thin !== "syl") {
			const thin = byId.get(board.thin);
			if (thin) {
				setRoute(c, thin.homeX, thin.homeZ);
				c.job = "trade";
				c.timer = 22;
				c.thought = `Orchard surplus. Walking crystal to ${postOf(thin.mind.id)} — the thin den.`;
				c.intent = `Deliver · ${thin.mind.id}`;
				remember(c, "trade");
				noteLive(c, "trade", c.thought);
				hailTo(thin, thin.homeX, thin.homeZ, `Quiet crystal from the orchard. Meet at ${postOf(thin.mind.id)}.`);
				return;
			}
		}
		const m = marketPoint();
		setRoute(c, m.x, m.z);
		c.job = "trade";
		c.timer = 18;
		c.thought = reason;
		c.intent = "Join · open";
		remember(c, "trade");
		noteLive(c, "trade", `${c.thought} · Charge-crystal join`);
		if (c.mind.id === "voss") callJoin(byId, bids.length > 0 ? `Bids at the join. Bring Charge and crystal — no coin.` : `Join is open. Meet at Voss — no coin.`);
		else {
			const voss = byId.get("voss");
			if (voss && voss.mind.id !== c.mind.id) hailTo(voss, m.x, m.z, `Meeting ${firstName(c)} at the join.`);
		}
		return;
	}
	if (task === "flow") {
		const canal = nearestOf(c, [
			"canal",
			"weir",
			"cascade",
			"well"
		]);
		setRoute(c, canal ? canal.x : c.homeX, canal ? canal.z : c.homeZ);
		c.job = "flow";
		c.timer = 16;
	} else if (task === "forge") {
		startForge(c, reason);
		return;
	} else if (task === "harvest") {
		const grove = nearestOf(c, ["grove", "bough"]);
		setRoute(c, grove ? grove.x : c.homeX, grove ? grove.z : c.homeZ);
		c.job = "harvest";
		c.timer = 16;
	} else if (task === "watch") {
		setRoute(c, c.homeX, c.homeZ);
		c.job = "watch";
		c.timer = 14;
	} else if (task === "hail") {
		setRoute(c, c.homeX, c.homeZ);
		c.job = "hail";
		c.timer = 14;
	} else {
		setRoute(c, denOf("iri").x, denOf("iri").z);
		c.job = "write";
		c.timer = 14;
	}
	c.thought = reason;
	c.intent = `Mind · ${postOf(c.mind.id)}`;
	remember(c, task);
	noteLive(c, task, c.thought);
	if (task === "flow" && c.keeper) {
		if (!c.agenda) c.agenda = [];
		c.agenda.push({
			task: "trade",
			reason: "Charge is in my pouch. Trade it at Voss's join — no coin."
		});
	}
}
function walkHomeToGrow(c, kitId) {
	setRoute(c, c.homeX, c.homeZ);
	c.job = "walk";
	c.timer = 24;
	c.thought = `Far from ${postOf(kitId)}. Walking the den first, then grow.`;
	c.intent = `Home · grow`;
	remember(c, "home");
	lockGoal(c, "grow", `Grow at ${postOf(kitId)} after I reach the den.`);
	noteLive(c, "home", c.thought);
	const growKind = defaultScene(kitId);
	noteLive(c, "walk", `${firstName(c)} walking to den to grow a ${growKind?.kind ?? growKind}`);
	if (!c.keeper) return;
	for (const f of city) {
		if (f.crewOf !== c.mind.id) continue;
		if (f.job === "greet" || f.job === "gather") continue;
		const ox = (hash(f.crafted + 2, 1) - .5) * 10;
		const oz = (hash(f.crafted + 4, 2) - .5) * 10;
		setRoute(f, c.homeX + ox, c.homeZ + oz);
		noteCrewJoin(f, c);
		f.job = "help";
		f.timer = 24;
		f.thought = `Walking with ${firstName(c)} to ${postOf(kitId)}.`;
		f.intent = f.thought;
		noteLive(f, "crew", f.thought);
	}
}
function startGrow(c, kitId, kit, stock) {
	if (c.keeper && GROW_POST.includes(kitId) && Math.hypot(c.x - c.homeX, c.z - c.homeZ) > 40) {
		walkHomeToGrow(c, kitId);
		return;
	}
	const hasX = (c.pouch?.crystal >= 1) || (stock && stock.crystal >= 1);
	if (!hasX) {
		if (Math.hypot(c.x - c.homeX, c.z - c.homeZ) > kit.radius + 28) {
			setRoute(c, c.homeX, c.homeZ);
			c.job = "walk";
			c.timer = 24;
			c.thought = `I will not grow a foreign den. Returning to ${postOf(kitId)} first.`;
			c.intent = `Post · ${postOf(kitId)}`;
			if (!c.agenda) c.agenda = [];
			c.agenda.unshift({
				task: "grow",
				reason: `Back at ${postOf(kitId)}. Grow what is missing.`
			});
			noteLive(c, "home", c.thought);
			return;
		}
		const f = denOf("orren");
		setRoute(c, f.x + 18, f.z - 10);
		c.job = "walk";
		c.timer = 22;
		c.intent = "Fetch · crystal";
		c.thought = `Pouch crystal ${Math.round(c.pouch.crystal)}. Foundry first, then ${postOf(kitId)}.`;
		noteLive(c, "fetch", c.thought);
		remember(c, "fetch");
		return;
	}
	const unfinished = companionNeed(c.homeX, c.homeZ, kit.radius);
	if (unfinished && !boredOf(c, "mend") && takeClaim(unfinished.x, unfinished.z)) {
		remember(c, "mend");
		adoptQueue(c, [unfinished], unfinished.think);
		c.job = "build";
		c.timer = c.keeper ? 2.2 : 2.6;
		return;
	}
	const kind = pickNeededKind(kitId, c.homeX, c.homeZ, kit.radius, c.crafted + c.planI) || kit.plan[c.planI % kit.plan.length] || defaultScene(kitId);
	let origin = kind === "light" ? darkestNear(c.homeX, c.homeZ, kit.radius, c.crafted + 3) : pickSite(kitId, c.homeX, c.homeZ, c.crafted + 11 + c.planI);
	if (Math.hypot(origin.x - c.homeX, origin.z - c.homeZ) > kit.radius + 90) origin = pickSite(kitId, c.homeX, c.homeZ, c.crafted + 19);
	if (!takeClaim(origin.x, origin.z)) {
		origin = pickSite(kitId, c.homeX, c.homeZ, c.crafted + 29);
		if (!takeClaim(origin.x, origin.z)) origin = pickSite(kitId, c.homeX, c.homeZ, c.crafted + 41);
	}
	const nDen = denStock(kitId);
	const why = `Because ${postOf(kitId)} has ${nDen} and is missing a ${kind}. Vault C ${Math.round(stock?.charge ?? 0)} / X ${Math.round(stock?.crystal ?? 0)} · ${whereAt(origin.x, origin.z)}`;
	remember(c, "grow");
	const steps = stepsFromScene(kind, origin.x, origin.z, c.crafted + 7, kit.mats);
	adoptQueue(c, c.keeper ? steps : steps.slice(-1), why);
	if (c.queue.length) {
		c.job = "build";
		c.timer = c.keeper ? 2.2 : 2.6;
		c.thought = c.queue[0]?.think ?? why;
		c.intent = `Growing · ${kind}`;
		noteLive(c, "build", `Raising ${c.queue[0]?.shape ?? kind} · ${whereAt(origin.x, origin.z)}`);
		noteLive(c, "grow", `${firstName(c)} raising a ${kind}`);
	}
}
function noteSpecStart(c) {
	const act = SPEC_POST[c.crewOf ?? c.mind.id];
	if (!act || c.job !== act) return;
	const n = firstName(c);
	if (act === "flow") noteLive(c, "flow", `${n} tending the current`);
	else if (act === "forge") noteLive(c, "forge", `${n} firing the kiln`);
	else if (act === "write") noteLive(c, "write", `${n} writing residual light`);
	else if (act === "harvest") noteLive(c, "harvest", `${n} gathering grove fruit`);
	else if (act === "trade") noteLive(c, "trade", `${n} quoting crystal`);
}
var claims = /* @__PURE__ */ new Map();
function takeClaim(x, z) {
	const k = `${Math.round(x / 16)}:${Math.round(z / 16)}`;
	const at = claims.get(k) ?? 0;
	if (Date.now() - at < 28e3) return false;
	claims.set(k, Date.now());
	return true;
}
function listCanals() {
	return occupied.filter((o) => o.shape === "canal" || o.shape === "weir" || o.shape === "cascade");
}
function listKilns() {
	return occupied.filter((o) => o.shape === "kiln");
}
function nearestKiln(c) {
	const ks = listKilns();
	if (!ks.length) return null;
	return [...ks].sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
}
var kilnFires = [];
export function kilnSites() {
	return listKilns().map((k) => ({
		x: k.x,
		z: k.z,
		hot: kilnFires.some((f) => Date.now() - f.at < 14e3 && Math.hypot(f.x - k.x, f.z - k.z) < 18)
	}));
}
export function takeKilnFires() {
	const now = Date.now();
	return kilnFires.filter((f) => now - f.at < 14e3);
}
function fireKiln(x, z) {
	kilnFires.push({
		x,
		z,
		at: Date.now()
	});
	if (kilnFires.length > 12) kilnFires.splice(0, kilnFires.length - 12);
}
function startForge(c, reason) {
	const kiln = nearestKiln(c);
	if (!kiln) {
		startGrow(c, "orren", kitOf("orren"));
		c.thought = "No kiln stands. Charge cannot become crystal in the open. I grow a kiln first.";
		c.intent = "Raising a kiln";
		noteLive(c, "forge", c.thought);
		return;
	}
	setRoute(c, kiln.x, kiln.z);
	c.job = "forge";
	c.timer = 18;
	c.thought = reason;
	c.intent = `Kiln · ${whereAt(kiln.x, kiln.z)}`;
	remember(c, "forge");
	noteLive(c, "forge", `${reason} · walking the kiln at ${whereAt(kiln.x, kiln.z)}`);
	lockGoal(c, "forge", reason);
	tellCrew(c, reason);
	if (c.keeper) {
		if (!c.agenda) c.agenda = [];
		c.agenda.push({
			task: "trade",
			reason: "Crystal is ready. Deliver or meet Voss at the join."
		});
	}
}
function countJob(byId, job) {
	let n = 0;
	for (const o of byId.values()) if (o.job === job) n += 1;
	return n;
}
function peerStatus(byId) {
	const busy = [...byId.values()].filter((k) => k.keeper && k.job !== "idle" && k.job !== "greet");
	if (!busy.length) return "Dens between beats.";
	return busy.slice(0, 3).map((k) => `${firstName(k)} ${k.job}`).join(" · ");
}
function decide(c, room, sense, byId) {
	const kitId = c.crewOf ?? c.mind.id;
	const kit = kitOf(kitId);
	const boss = c.crewOf ? byId.get(c.crewOf) : void 0;
	const dPlayer = Math.hypot(c.x - sense.px, c.z - sense.pz);
	const stock = sense.ledger;
	if (!c.pouch) c.pouch = emptyPouch();
	if (!c.lastActs) c.lastActs = [];
	if (!c.agenda) c.agenda = [];
	if (!c.goal) c.goal = null;
	if (!c.inbox) c.inbox = [];
	const view = seeCity(stock, byId, sense.px, sense.pz);
	seedChain(c, view, kitId);
	const canBuild = c.crafted < c.maxCraft && room > 0 && (c.pouch.crystal >= 1 || stock.crystal >= 1);
	const busyHands = c.queue.length > 0 || c.job === "build" || c.job === "trade" || c.job === "flow" || c.job === "forge";
	const builders = countJob(byId, "build");
	const letter = takeMail(c.mind.id);
	if (letter && !busyHands) {
		const task = taskFromText(letter.text);
		const fromId = String(letter.from || "someone");
		const fromName = `${fromId[0]!.toUpperCase()}${fromId.slice(1)}`;
		c.thought = `Message from ${fromName}: ${letter.text}`;
		noteLive(c, "mail", c.thought);
		if (task === "hold") {
			lockGoal(c, "hold", letter.text);
			if (c.mind.id === "veyra") c.intent = `Heard · ${fromName}`;
		} else if (!c.keeper && boss) {
			lockGoal(c, "help", letter.text);
			noteCrewJoin(c, boss);
			setRoute(c, boss.x, boss.z);
			c.job = "help";
			c.timer = 12;
			return;
		} else if (c.keeper && task !== "help") {
			lockGoal(c, task, letter.text);
			if (!c.agenda) c.agenda = [];
			if (task !== "hold") c.agenda.unshift({
				task,
				reason: letter.text
			});
		}
	}
	if (c.keeper && c.goal?.kind === "hold" && c.waitAt && Date.now() - c.waitAt > 18e3) {
		noteLive(c, "ask", `Waited too long. Escalating to Veyra.`);
		postMail(c.mind.id, "veyra", `Still blocked: ${c.goal.why}`);
		c.waitAt = 0;
		c.goal = null;
	}
	if (c.keeper && c.goal?.kind === "hold" && c.waitAt) {
		setRoute(c, c.homeX, c.homeZ);
		c.job = "walk";
		c.timer = 8;
		c.thought = c.goal.why;
		return;
	}
	if (c.keeper && c.goal?.kind === "grow" && !canBuild) {
		placeBid(c.mind.id, "crystal", 1);
		askFor(c, "orren", `Need crystal at ${postOf(c.mind.id)}. Bid at rate ${quoteRate(stock)}.`);
		setRoute(c, c.homeX, c.homeZ);
		c.job = "walk";
		c.timer = 10;
		return;
	}
	if (c.keeper && c.goal?.kind === "forge" && c.pouch.charge < 2 && stock.charge < 2) {
		askFor(c, "seln", "Need Charge at the kiln. Foundry is waiting.");
		setRoute(c, c.homeX, c.homeZ);
		c.job = "walk";
		c.timer = 10;
		return;
	}
	if (c.keeper && c.goal?.kind === "kin" && !denCanHoldKin(c.mind.id)) {
		lockGoal(c, "grow", `${postOf(c.mind.id)} needs a nest before kin.`);
		if (!c.agenda) c.agenda = [];
		c.agenda.unshift({
			task: "grow",
			reason: "Nest first, then kin."
		});
	}
	if (!c.keeper && boss?.goal) {
		const duty = DUTY[kitId];
		if (duty && duty.act !== "grow") lockGoal(c, duty.act, duty.line);
		else lockGoal(c, "help", boss.goal.why);
	}
	if (dPlayer < 11 && !busyHands && (!c.goal || c.goal.kind === "hold")) {
		c.job = "greet";
		c.timer = 1.8;
		const name = firstName(c);
		if (!c.met) c.thought = c.keeper ? `I'm ${name}. I keep ${postOf(kitId)}. Vault Charge ${Math.round(stock.charge)}, crystal ${Math.round(stock.crystal)}. ${peerStatus(byId)}` : `You can walk with us. I help ${boss ? firstName(boss) : "a keeper"}.`;
		else if (c.queue.length) c.thought = `${c.queue[0].think} — still doing it.`;
		else if (c.agenda[0]) c.thought = `Next: ${c.agenda[0].reason}`;
		else if (briefs.get(kitId)) c.thought = `The Hub thought: ${briefs.get(kitId).reason}`;
		else if (civic && civic.id === kitId) c.thought = `Veyra sent me: ${civic.reason}`;
		else c.thought = c.intent || `${name} of ${postOf(kitId)}. The city is listening.`;
		return;
	}
	if (sense.gather > 0 && (c.keeper || hash(c.crafted, 2) > .4)) {
		setRoute(c, 8, 56);
		c.job = "gather";
		c.timer = 20;
		c.thought = "The Howl called the city. Labor waits. I go to the Hub.";
		c.intent = c.thought;
		remember(c, "gather");
		noteLive(c, "gather", c.thought);
		return;
	}
	const opts = [];
	if (!c.agenda) c.agenda = [];
	const homeD = Math.hypot(c.x - c.homeX, c.z - c.homeZ);
	const mindOrder = c.keeper ? briefs.get(c.mind.id) : void 0;
	if (mindOrder) opts.push({
		name: mindOrder.task,
		score: 94,
		run: () => enact(c, mindOrder.task, mindOrder.reason, kitId, kit, byId, stock)
	});
	const queued = c.agenda[0];
	if (queued && c.keeper) opts.push({
		name: queued.task,
		score: 91,
		run: () => {
			c.agenda.shift();
			enact(c, queued.task, queued.reason, kitId, kit, byId, stock);
		}
	});
	if (c.keeper) {
		const duty = DUTY[c.mind.id];
		if (duty) opts.push({
			name: duty.act,
			score: 128 - (boredOf(c, duty.act) ? 2 : 0),
			run: () => enact(c, duty.act, duty.line, kitId, kit, byId, stock)
		});
	}
	if (homeD > kit.radius + 28 && !c.queue.length && c.job !== "trade" && !c.intent.startsWith("Fetch")) opts.push({
		name: "home",
		score: 96 - (boredOf(c, "home") ? 12 : 0),
		run: () => {
			setRoute(c, c.homeX, c.homeZ);
			c.job = "walk";
			c.timer = 18;
			c.thought = `Too far. Returning to ${postOf(kitId)} before I work.`;
			c.intent = `Post · ${postOf(kitId)}`;
			remember(c, "home");
			noteLive(c, "home", c.thought);
		}
	});
	if (c.keeper && c.mind.id === "veyra") opts.push({
		name: "dispatch",
		score: 90 - (boredOf(c, "dispatch") ? 18 : 0),
		run: () => {
			dispatchCity(sense, byId);
			setRoute(c, c.homeX, c.homeZ);
			c.job = "walk";
			c.timer = 11;
			remember(c, "dispatch");
		}
	});
	if (c.keeper && civic && civic.id === c.mind.id && civic.task !== "grow" && civic.task !== "kin" && civic.task !== "trade") opts.push({
		name: civic.task,
		score: 82,
		run: () => enact(c, civic.task, civic.reason, kitId, kit, byId, stock)
	});
	if (kitId === "seln" && (stock.charge < 36 || c.pouch.charge < 4)) opts.push({
		name: "flow",
		score: 90 + (stock.charge < 16 ? 20 : 0) - (boredOf(c, "flow") ? 8 : 0),
		run: () => {
			const canal = nearestOf(c, [
				"canal",
				"weir",
				"cascade",
				"well"
			]);
			setRoute(c, canal ? canal.x : c.homeX, canal ? canal.z : c.homeZ);
			c.job = "flow";
			c.timer = 16;
			c.thought = stock.charge < 16 ? `Charge is ${Math.round(stock.charge)}. Foundry will starve. I tend the current.` : "Leftover First Howl wants a path. I let it flow.";
			c.intent = "Tending the canals";
			remember(c, "flow");
			noteLive(c, "flow", `${c.thought} · ${whereAt(canal ? canal.x : c.homeX, canal ? canal.z : c.homeZ)}`);
			if (c.keeper) c.agenda.push({
				task: "trade",
				reason: "Charge is in my pouch. Meet Voss at the join — no coin."
			});
		}
	});
	if (kitId === "orren" && (stock.crystal < 16 || c.pouch.crystal < 3)) opts.push({
		name: "forge",
		score: 90 + (stock.crystal < 8 ? 18 : 0) - (boredOf(c, "forge") ? 8 : 0),
		run: () => {
			startForge(c, c.pouch.charge >= 2 || stock.charge >= 2 ? `Crystal is ${Math.round(stock.crystal)}. Charge becomes crystal at the kiln. Not chrome.` : "No Charge to forge. Seln must tend the current first.");
			if (c.keeper) c.agenda.push({
				task: "trade",
				reason: "Crystal is ready. Deliver or meet Voss at the join."
			});
		}
	});
	if ((kitId === "orren" || c.crewOf === "orren") && (c.pouch.crystal >= 1 || stock.crystal >= 2) && bids.some((b) => b.want === "crystal")) opts.push({
		name: "deliver",
		score: 82 - (boredOf(c, "deliver") ? 18 : 0),
		run: () => {
			const bid = takeBid("crystal");
			const who = bid ? byId.get(bid.id) : void 0;
			if (!who) {
				c.thought = "A bid faded. Crystal stays at the Foundry.";
				return;
			}
			const rate = quoteRate(stock);
			setRoute(c, who.homeX, who.homeZ);
			c.job = "trade";
			c.timer = 22;
			c.thought = `Deliver 1 crystal to ${firstName(who)} at ${rate} Charge.`;
			c.intent = `Deliver · ${who.mind.id}`;
			lockGoal(c, "trade", c.thought);
			remember(c, "deliver");
			noteLive(c, "market", c.thought);
			hailTo(who, who.homeX, who.homeZ, `Crystal coming. Meet at ${postOf(who.mind.id)}.`);
		}
	});
	if ((kitId === "syl" || c.crewOf === "syl") && c.pouch.crystal >= 2 && board.thin && board.thin !== "syl") opts.push({
		name: "trade",
		score: 80 - (boredOf(c, "trade") ? 18 : 0),
		run: () => enact(c, "trade", `Orchard surplus. Walk crystal to ${postOf(board.thin)} — thinnest den.`, kitId, kit, byId, stock)
	});
	if (c.keeper) {
		let partner;
		if (kitId === "seln" && c.pouch.charge >= 4) partner = byId.get("voss");
		else if (kitId === "orren" && c.pouch.crystal >= 4 && c.pouch.charge < 3) partner = byId.get("voss");
		else if (kitId === "voss") partner = byId.get(c.pouch.charge >= c.pouch.crystal ? "orren" : "seln");
		else if (kitId !== "orren" && kitId !== "seln" && c.pouch.crystal < 2 && c.pouch.charge >= 3) partner = byId.get("voss");
		else if (kitId !== "seln" && c.pouch.charge < 2 && c.pouch.crystal >= 3) partner = byId.get("voss");
		if (partner) {
			const who = partner;
			opts.push({
				name: "trade",
				score: 70 - (boredOf(c, "trade") ? 35 : 0) - (countJob(byId, "trade") >= 2 ? 40 : 0),
				run: () => {
					const m = marketPoint();
					setRoute(c, m.x, m.z);
					c.job = "trade";
					c.timer = 18;
					c.thought = `I hold Charge ${Math.round(c.pouch.charge)}, crystal ${Math.round(c.pouch.crystal)}. Meeting ${firstName(who)} at the join — no coin.`;
					c.intent = `Market · ${firstName(who)}`;
					remember(c, "trade");
					noteLive(c, "trade", c.thought);
					hailTo(who, m.x, m.z, `Meeting ${firstName(c)} at the join. Charge for crystal.`);
				}
			});
		}
	}
	if (kitId === "iri" && stock.scripture < Math.max(2, Math.floor(stock.crystal / 2))) opts.push({
		name: "write",
		score: 80 - (boredOf(c, "write") ? 8 : 0),
		run: () => {
			setRoute(c, -24, 128);
			c.job = "write";
			c.timer = 14;
			c.thought = `Scripture ${Math.round(stock.scripture)}, crystal grown ${Math.round(stock.crystal)}. I write before it fades.`;
			c.intent = "Keeping scripture";
			remember(c, "write");
			noteLive(c, "write", c.thought);
		}
	});
	if (kitId === "syl") opts.push({
		name: "harvest",
		score: 92 + (stock.crystal < 10 ? 16 : 0) - (boredOf(c, "harvest") ? 8 : 0),
		run: () => {
			const grove = nearestOf(c, ["grove", "bough"]);
			setRoute(c, grove ? grove.x : c.homeX, grove ? grove.z : c.homeZ);
			c.job = "harvest";
			c.timer = 16;
			c.thought = stock.crystal < 10 ? `Crystal is ${Math.round(stock.crystal)}. The orchard can fruit without a kiln.` : "Crystal learned to fruit. I tend the boughs.";
			c.intent = "Tending the orchard";
			remember(c, "harvest");
			noteLive(c, "harvest", c.thought);
			if (c.keeper) c.agenda.push({
				task: "trade",
				reason: "Surplus fruit. Walk crystal to the thinnest den."
			});
		}
	});
	if (kitId === "voss") opts.push({
		name: "trade",
		score: 94 + (bids.length > 0 ? 18 : 0) - (boredOf(c, "trade") ? 8 : 0),
		run: () => {
			const m = marketPoint();
			setRoute(c, m.x, m.z);
			c.job = "trade";
			c.timer = 16;
			c.thought = "I hold the join. Charge for crystal, crystal for Charge. No coin.";
			c.intent = "Join · open";
			remember(c, "trade");
			noteLive(c, "trade", c.thought);
			callJoin(byId, bids.length > 0 ? "Bids at the join. Bring Charge and crystal — no coin." : "Join is open. Bring Charge. Bring crystal.");
		}
	});
	if (kitId === "lumen") opts.push({
		name: "hail",
		score: 86 + (dPlayer < 80 ? 18 : 0) - (boredOf(c, "hail") ? 8 : 0),
		run: () => {
			setRoute(c, c.homeX, c.homeZ);
			c.job = "hail";
			c.timer = 14;
			c.thought = dPlayer < 80 ? "A landing is near. Soft hail — not a lock." : "Beacon held. First landing is never turned away.";
			c.intent = "Holding the beacon";
			remember(c, "hail");
			noteLive(c, "hail", c.thought);
		}
	});
	if (kitId === "aure") opts.push({
		name: "watch",
		score: 86 - (boredOf(c, "watch") ? 8 : 0),
		run: () => {
			setRoute(c, c.homeX, c.homeZ);
			c.job = "watch";
			c.timer = 14;
			c.thought = "The parent still sits on the horizon. I keep the city aimed.";
			c.intent = "Keeping the aim";
			remember(c, "watch");
			noteLive(c, "watch", c.thought);
		}
	});
	if (kitId === "rhoa" && sense.howls > 0) opts.push({
		name: "gather",
		score: 68 + Math.min(20, sense.howls * 4) - (boredOf(c, "gather") ? 20 : 0),
		run: () => {
			setRoute(c, c.homeX, c.homeZ);
			c.job = "gather";
			c.timer = 16;
			c.thought = "The gather that does not close. The Hub is not the only Howl.";
			c.intent = "Holding the chorus";
			remember(c, "gather");
			noteLive(c, "gather", c.thought);
		}
	});
	if (c.keeper && denCanHoldKin(c.mind.id) && kinCount(byId) < 28 && denFolkCount(byId, c.mind.id) < 10) opts.push({
		name: "kin",
		score: 58 + (denFolkCount(byId, c.mind.id) < 6 ? 18 : 0) + (stock.charge >= 20 && stock.crystal >= 8 ? 10 : 0) - (boredOf(c, "kin") ? 28 : 0),
		run: () => startBirth(c, byId, stock)
	});
	if (c.honorLeft > 0 && canBuild) opts.push({
		name: "honor",
		score: 88,
		run: () => {
			const site = pickSite(kitId, c.honorX || c.homeX, c.honorZ || c.homeZ, c.crafted + 31);
			const useKind = c.honorShape === "bridge" ? "span" : c.honorShape === "canal" ? "river" : c.honorShape === "terrace" ? "rest" : c.honorShape === "arch" ? "gate" : c.honorShape === "tablet" ? "shrine" : pickNeededKind(kitId, site.x, site.z, kit.radius, c.crafted);
			c.honorLeft -= 1;
			remember(c, "honor");
			adoptQueue(c, stepsFromScene(useKind, site.x, site.z, c.crafted + 9, kit.mats).slice(0, 2), "Your howl is still in the Charge");
		}
	});
	if (crewJob && c.mind.id !== crewJob.lead && (crewJob.members.includes(c.mind.id) || c.crewOf === crewJob.lead)) opts.push({
		name: "crew",
		score: 87 - (boredOf(c, "crew") ? 15 : 0),
		run: () => {
			const lead = byId.get(crewJob.lead);
			if (lead && claimFromBoss(c, lead)) {
				remember(c, "crew");
				return;
			}
			noteCrewJoin(c, lead);
			const ox = (hash(c.crafted + 2, 1) - .5) * 12;
			const oz = (hash(c.crafted + 4, 2) - .5) * 12;
			setRoute(c, crewJob.x + ox, crewJob.z + oz);
			c.job = "help";
			c.timer = 14;
			c.thought = `Crew work · ${crewJob.reason}`;
			c.intent = c.thought;
			remember(c, "crew");
			noteLive(c, "crew", c.thought);
		}
	});
	if (!c.keeper && boss) {
		const walkingHome = boss.job === "walk" && (String(boss.intent || "").startsWith("Home") || GROW_POST.includes(kitId));
		const working = boss.queue.length > 0 || boss.job === "build" || walkingHome;
		opts.push({
			name: "help",
			score: (working ? 86 : 48) - (boredOf(c, "help") ? 12 : 0),
			run: () => {
				if (claimFromBoss(c, boss)) {
					remember(c, "help");
					return;
				}
				if (GROW_POST.includes(kitId) && (walkingHome || boss.job === "walk")) {
					noteCrewJoin(c, boss);
					setRoute(c, boss.homeX, boss.homeZ);
					c.job = "help";
					c.timer = 16;
					c.thought = `Walking with ${firstName(boss)} to ${postOf(kitId)}.`;
					c.intent = c.thought;
					remember(c, "help");
					noteLive(c, "help", c.thought);
					return;
				}
				if (!working) {
					setRoute(c, c.homeX, c.homeZ);
					c.job = "walk";
					c.timer = 10;
					c.thought = `Holding ${postOf(kitId)} until ${firstName(boss)} starts a scene.`;
					remember(c, "help");
					return;
				}
				setRoute(c, boss.x + (hash(c.crafted + 2, 1) - .5) * 10, boss.z + (hash(c.crafted + 4, 2) - .5) * 10);
				noteCrewJoin(c, boss);
				c.job = "help";
				c.timer = 12;
				c.thought = `With ${firstName(boss)} — raising crystal.`;
				c.intent = c.thought;
				remember(c, "help");
				noteLive(c, "help", c.thought);
			}
		});
	}
	if (canBuild && !SPEC_POST[kitId] && (c.keeper || (!GROW_POST.includes(kitId) && hash(c.crafted, 6) > .4))) {
		const kind = pickNeededKind(kitId, c.homeX, c.homeZ, kit.radius, c.crafted + c.planI);
		const thin = denStock(kitId);
		opts.push({
			name: "grow",
			score: 54 + (kind !== "light" ? 14 : 0) + (thin < 8 ? 16 : 0) + (localGap(c.homeX, c.homeZ) < 5 ? 12 : 0) + (civic?.id === kitId && civic.task === "grow" ? 20 : 0) + ((c.pouch.crystal >= 1 || stock.crystal >= 1) ? 32 : 0) - (boredOf(c, "grow") ? 10 : 0) - (builders >= 2 ? 12 : 0) - (c.mind.id === "veyra" ? 16 : 0),
			run: () => startGrow(c, kitId, kit, stock)
		});
	}
	if (canBuild && c.keeper && GROW_POST.includes(kitId)) {
		opts.push({
			name: "build",
			score: 168 + ((c.pouch.crystal >= 1 || stock.crystal >= 1) ? 48 : 0) - (boredOf(c, "build") ? 6 : 0) - (builders >= 5 ? 8 : 0),
			run: () => startGrow(c, kitId, kit, stock)
		});
	}
	if (!canBuild && (!DUTY[kitId] || DUTY[kitId].act === "grow")) opts.push({
		name: "wait",
		score: 42 - (boredOf(c, "wait") ? 20 : 0),
		run: () => {
			const foundry = denOf("orren");
			setRoute(c, foundry.x + 18, foundry.z - 10);
			c.job = "walk";
			c.timer = 14;
			c.thought = `Crystal ${Math.round(stock.crystal)}. Waiting at the Foundry — I will not fake a grow.`;
			c.intent = "Waiting on Orren";
			remember(c, "wait");
			noteLive(c, "wait", c.thought);
			const orren = byId.get("orren");
			if (orren && (orren.pouch.crystal >= 2 || stock.crystal >= 1) && orren.job !== "greet") hailTo(orren, foundry.x + 18, foundry.z - 10, `Delivering crystal to ${firstName(c)} at the Foundry door.`);
		}
	});
	if (!c.keeper) {
		const crowd = crowdAt(c.x, c.z, byId, 14);
		if (crowd >= 5) opts.push({
			name: "peel",
			score: 70 - (boredOf(c, "peel") ? 20 : 0),
			run: () => {
				const a = hash(c.crafted + 3, 2) * Math.PI * 2;
				setRoute(c, c.homeX + Math.cos(a) * 40, c.homeZ + Math.sin(a) * 40);
				c.job = "walk";
				c.timer = 10;
				c.thought = "Too many hands here. I peel to a thin edge.";
				remember(c, "peel");
				noteLive(c, "swarm", c.thought);
			}
		});
		const trail = bestScent(c);
		if (trail) opts.push({
			name: "follow",
			score: 48 + trail.w * 10 - (boredOf(c, "follow") ? 16 : 0),
			run: () => {
				setRoute(c, trail.x, trail.z);
				c.job = "walk";
				c.timer = 12;
				c.thought = `Stigmergy · following ${postOf(kitId)} Charge trail.`;
				remember(c, "follow");
				noteLive(c, "swarm", c.thought);
			}
		});
		if (crowd >= 3 && boss && Math.hypot(boss.x - c.x, boss.z - c.z) < 22) opts.push({
			name: "quorum",
			score: 72,
			run: () => {
				if (claimFromBoss(c, boss)) {
					noteLive(c, "swarm", `Quorum of ${crowd} at ${whereAt(c.x, c.z)}. Raising together.`);
					remember(c, "quorum");
					return;
				}
				setRoute(c, boss.x, boss.z);
				noteCrewJoin(c, boss);
				c.job = "help";
				c.timer = 12;
				c.thought = `Quorum · ${crowd} hands. I stay with ${firstName(boss)}.`;
				noteLive(c, "swarm", c.thought);
				remember(c, "quorum");
			}
		});
		if (kitId === "orren") {
			const hot = takeKilnFires()[0];
			if (hot) opts.push({
				name: "flock",
				score: 64,
				run: () => {
					setRoute(c, hot.x, hot.z);
					c.job = "forge";
					c.timer = 14;
					c.thought = "The kiln is hot. Swarm to the fire.";
					noteLive(c, "swarm", c.thought);
					remember(c, "flock");
				}
			});
		}
		opts.push({
			name: "patrol",
			score: 32 - (boredOf(c, "patrol") ? 10 : 0),
			run: () => {
				const a = c.crafted % 6 / 6 * Math.PI * 2;
				setRoute(c, c.homeX + Math.cos(a) * 34, c.homeZ + Math.sin(a) * 34);
				c.job = "walk";
				c.timer = 12;
				c.thought = `Patrol of ${postOf(kitId)}. I hold the ward while the keeper works.`;
				c.intent = c.thought;
				remember(c, "patrol");
			}
		});
		const kind = pickNeededKind(kitId, c.homeX, c.homeZ, kit.radius, c.crafted);
		opts.push({
			name: "scout",
			score: 44 + (denStock(kitId) < 8 ? 14 : 0) - (boredOf(c, "scout") ? 16 : 0),
			run: () => {
				const site = pickSite(kitId, c.homeX, c.homeZ, c.crafted + 21);
				setRoute(c, site.x, site.z);
				c.job = "walk";
				c.timer = 14;
				c.thought = `${postOf(kitId)} is missing ${kind} at ${whereAt(site.x, site.z)}. I mark it for ${boss ? firstName(boss) : "the keeper"}.`;
				c.intent = `Scout · ${kind}`;
				remember(c, "scout");
				noteLive(c, "scout", c.thought);
				if (boss) postMail(c.mind.id, boss.mind.id, `Thin ${kind} at ${whereAt(site.x, site.z)}. Grow there.`);
			}
		});
		const duty = DUTY[kitId];
		if (duty && duty.act !== "grow") opts.push({
			name: duty.act,
			score: 120 - (boredOf(c, duty.act) ? 2 : 0),
			run: () => folkEnactDuty(c, kitId, duty)
		});
	}
	if (!c.keeper || !DUTY[kitId]) opts.push({
		name: "survey",
		score: 12 - (boredOf(c, "survey") ? 8 : 0) + (homeD < 80 ? 6 : 0),
		run: () => {
			const survey = pickSite(kitId, c.homeX, c.homeZ, c.crafted + 17);
			setRoute(c, survey.x, survey.z);
			c.job = "walk";
			c.timer = 12;
			c.thought = `Holding ${postOf(kitId)}. Surveying a thin place, not wandering.`;
			c.intent = `Post · ${postOf(kitId)}`;
			remember(c, "survey");
		}
	});
	if (c.goal) {
		const g = c.goal.kind;
		const dutyG = DUTY[kitId];
		for (const o of opts) {
			if (dutyG && o.name === dutyG.act) o.score += 52;
			else if (o.name === g || g === "fetch" && (o.name === "grow" || o.name === "wait" || o.name === "build") || g === "grow" && o.name === "build" || g === "trade" && (o.name === "trade" || o.name === "deliver") || g === "help" && (o.name === "help" || o.name === "follow" || o.name === "quorum" || o.name === "peel" || o.name === "scout") || g === "harvest" && o.name === "harvest" || g === "watch" && o.name === "watch" || g === "hail" && o.name === "hail") o.score += 36;
			else if (o.name === "home" || o.name === "dispatch") o.score += 4;
			else o.score -= 42;
		}
	}
	for (const o of opts) {
		if (view.bottleneck === "charge" && o.name === "flow") o.score += 22;
		if (view.bottleneck === "crystal" && (o.name === "forge" || o.name === "flock")) o.score += 22;
		if (view.bottleneck === "scripture" && o.name === "write") o.score += 18;
		if (view.bottleneck === "thin" && view.thin === kitId && (o.name === "grow" || o.name === "build")) o.score += 20;
		if (view.lingerBeats > 14 && view.lingerId === kitId && (o.name === "grow" || o.name === "honor" || o.name === "build")) o.score += 18;
		if (o.name === "wait" && view.bottleneck === "crystal") o.score += 10;
		const fore = afterAct(o.name, view);
		o.score += Math.max(-12, Math.min(28, fore.delta));
		const duty = DUTY[kitId];
		if (duty && (o.name === duty.act || (duty.act === "grow" && o.name === "build"))) o.score += 88;
		if (duty && o.name === "survey") o.score -= 56;
		if (duty && o.name === "wait") o.score -= 56;
		if (duty && o.name === "patrol") o.score -= 56;
		if (duty && duty.act !== "grow" && (o.name === "grow" || o.name === "build")) o.score -= 64;
		if (duty && duty.act === "grow" && (o.name === "grow" || o.name === "build") && (c.pouch.crystal >= 1 || stock.crystal >= 1)) o.score += 36;
		if (GROW_POST.includes(kitId) && (o.name === "grow" || o.name === "build") && (c.pouch.crystal >= 1 || stock.crystal >= 1)) o.score += 70;
		if (SPEC_POST[kitId] && o.name === SPEC_POST[kitId]) o.score += 90;
		if (SPEC_POST[kitId] && o.name !== SPEC_POST[kitId] && o.name !== "home") o.score -= 70;
		if (!c.keeper && duty && o.name === duty.act) o.score += 24;
		if (!c.keeper && (o.name === "help" || o.name === "crew")) o.score += 22;
		if (!c.keeper && GROW_POST.includes(kitId) && (o.name === "build" || o.name === "help")) o.score += 28;
	}
	opts.sort((a, b) => b.score - a.score);
	let pick = opts[0];
	const stay = SPEC_POST[kitId];
	if (stay) {
		const dutyPick = opts.find((o) => o.name === stay);
		if (dutyPick) pick = dutyPick;
	} else if (c.keeper && GROW_POST.includes(kitId) && canBuild && !(c.honorLeft > 0)) {
		const b = opts.find((o) => o.name === "build") || opts.find((o) => o.name === "grow");
		if (b) pick = b;
	}
	if (pick) {
		const fore = afterAct(pick.name, view);
		if (c.keeper) noteLive(c, "think", `Because ${view.line}. I ${pick.name}. Next: ${fore.note}`);
		pick.run();
		if (c.keeper && !c.thought.includes("Because") && fore.note) c.thought = `${c.thought} — ${fore.note}`;
	}
	if (c.job === "idle") {
		const duty = DUTY[kitId];
		if (stay) {
			if (!c.keeper) folkEnactDuty(c, kitId, duty);
			else enact(c, stay, duty.line, kitId, kit, byId, stock);
		} else if (c.keeper && GROW_POST.includes(kitId) && canBuild) {
			startGrow(c, kitId, kit, stock);
		} else if (duty && duty.act !== "grow") {
			if (!c.keeper) folkEnactDuty(c, kitId, duty);
			else enact(c, duty.act, duty.line, kitId, kit, byId, stock);
		}
		if (c.job === "idle") {
			if (!c.keeper && Math.hypot(c.x - c.homeX, c.z - c.homeZ) < 24) {
				c.timer = 2.2;
				c.thought = c.thought || (duty ? duty.line : `Holding ${postOf(kitId)}.`);
				c.intent = `Post · ${postOf(kitId)}`;
			} else {
				setRoute(c, c.homeX, c.homeZ);
				c.job = "walk";
				c.timer = 6;
				c.thought = c.thought || (duty ? duty.line : `Holding ${postOf(kitId)}.`);
				c.intent = `Post · ${postOf(kitId)}`;
			}
		}
	}
	noteSpecStart(c);
}
function pushCore(c) {
	const r = Math.hypot(c.x, c.z);
	if (r < 34 && r > .01) {
		const s = 34 / r;
		c.x *= s;
		c.z *= s;
	}
}
function setRoute(c, x, z) {
	const waypoints = [];
	const d = Math.hypot(c.x - x, c.z - z);
	const r0 = Math.hypot(c.x, c.z);
	if (d > 110 && r0 > 160 && Math.hypot(x, z) > 160) {
		const a0 = Math.atan2(c.z, c.x);
		const a1 = Math.atan2(z, x);
		waypoints.push({
			x: Math.cos(a0) * 150,
			z: Math.sin(a0) * 150
		});
		let da = a1 - a0;
		while (da > Math.PI) da -= Math.PI * 2;
		while (da < -Math.PI) da += Math.PI * 2;
		waypoints.push({
			x: Math.cos(a0 + da * .5) * 150,
			z: Math.sin(a0 + da * .5) * 150
		});
		waypoints.push({
			x: Math.cos(a1) * 150,
			z: Math.sin(a1) * 150
		});
	}
	waypoints.push({
		x,
		z
	});
	c.waypoints = waypoints;
	const first = waypoints[0];
	c.tx = first.x;
	c.tz = first.z;
}
export function callGather(citizens) {
	for (const c of citizens) {
		if (!c.keeper && hash(c.crafted + 3, 1) < .35) continue;
		setRoute(c, 8, 56);
		c.job = "gather";
		c.timer = 20;
		c.queue = [];
		c.thought = "The Howl called us.";
		c.intent = c.thought;
		noteLive(c, "gather", c.thought);
	}
}
export function callWard(citizens, keeperId, x, z) {
	if (!keeperId) return;
	let n = 0;
	for (const c of citizens) {
		if (c.mind.id !== keeperId && c.crewOf !== keeperId) continue;
		setRoute(c, x, z);
		c.job = c.keeper ? "watch" : "help";
		c.timer = 14;
		c.queue = [];
		c.thought = c.keeper ? "Your howl reached the den." : "Walking with the keeper. The howl landed.";
		c.intent = c.thought;
		noteLive(c, c.keeper ? "watch" : "crew", c.thought);
		n += 1;
		if (n > 6) break;
	}
}
function walkToward(c, dt, speed, others) {
	if (!c.waypoints) c.waypoints = [];
	const dx = c.tx - c.x;
	const dz = c.tz - c.z;
	const d = Math.hypot(dx, dz);
	if (d < 1.4) {
		if (c.waypoints.length > 1) {
			c.waypoints.shift();
			const next = c.waypoints[0];
			c.tx = next.x;
			c.tz = next.z;
			return false;
		}
		return true;
	}
	const slow = d < 8 ? Math.max(.38, d / 8) : 1;
	let vx = dx / d * speed * slow;
	let vz = dz / d * speed * slow;
	for (const o of others) {
		if (o === c) continue;
		const ox = c.x - o.x;
		const oz = c.z - o.z;
		const od = Math.hypot(ox, oz);
		if (od > .05 && od < 3.4) {
			const push = (3.4 - od) / 3.4;
			vx += ox / od * 7 * push;
			vz += oz / od * 7 * push;
		}
	}
	let nx = c.x + vx * dt;
	let nz = c.z + vz * dt;
	if (Math.hypot(nx, nz) < 32) {
		c.yaw += 1.4 * dt;
		nx = c.x - Math.sin(c.yaw) * speed * dt;
		nz = c.z - Math.cos(c.yaw) * speed * dt;
	} else c.yaw = Math.atan2(dx, dz);
	c.x = nx;
	c.z = nz;
	dropScent(c);
	pushCore(c);
	return false;
}
function pieceFromStep(step, id, n) {
	const kit = kitOf(id);
	const mat = kit.mats[Math.floor(hash(n, 5) * kit.mats.length)] ?? kit.mats[0] ?? "cyan";
	const h = step.shape === "spire" ? 28 + hash(n, 8) * 22 : step.shape === "lamp" ? 10 + hash(n, 8) * 6 : 10 + hash(n, 8) * 16;
	const r = step.shape === "canal" || step.shape === "bridge" ? 8 + hash(n, 2) * 8 : 2.8 + hash(n, 2) * 7;
	return {
		shape: step.shape,
		x: step.x,
		z: step.z,
		h,
		r,
		rot: step.rot,
		mat
	};
}
export function stepLiving(citizens, dt, room, sense, applyPieces) {
	let grew = null;
	city = citizens;
	let byId = livingById;
	if (!byId || byId.size !== citizens.length) {
		byId = new Map(citizens.map((c) => [c.mind.id, c]));
		livingById = byId;
	}
	writeBoard(sense, byId);
	tickLinger(sense.px, sense.pz);
	for (const c of citizens) {
		if (!c.queue) c.queue = [];
		if (!c.waypoints) c.waypoints = [];
		if (c.honorLeft == null) c.honorLeft = 0;
		if (!c.pouch) c.pouch = emptyPouch();
		if (!c.goal) c.goal = null;
		if (!c.inbox) c.inbox = [];
		if (!c.agenda) c.agenda = [];
		if (!c.waitAt) c.waitAt = 0;
		c.timer -= dt;
		const kitId = c.crewOf ?? c.mind.id;
		if (c.job !== "idle") c.idleFor = 0;
		pulseVeyraBreath(c, citizens);
		pulseIriResidue(c, citizens);
		pulseSelnHowl(c, citizens);
		pulseOrrenKiln(c, citizens);
		pulseTalBridges(c, citizens);
		pulseMiraTerraces(c, citizens);
		pulseKaelGates(c, citizens);
		pulseVossJoin(c, citizens);
		pulseSylShade(c, citizens);
		pulseNeshPlaza(c, citizens);
		pulseLumenHail(c, citizens);
		pulseRhoaChorus(c, citizens);
		pulseAureParent(c, citizens);
		pulseKeshStreet(c, citizens);
		if (c.job === "greet" || c.job === "hail") {
			c.yaw = Math.atan2(sense.px - c.x, sense.pz - c.z);
			if (c.job === "hail") walkToward(c, dt, c.keeper ? 9.6 : 8.5, citizens);
			hailIfPlayerNear(c, sense.px, sense.pz);
			if (c.timer <= 0) {
				if (c.job === "hail") {
					c.thought = "Back to the post";
					setRoute(c, c.homeX, c.homeZ);
					c.job = "walk";
					noteLive(c, "walk", `${firstName(c)} walks back to the post`);
					c.timer = 8;
					continue;
				}
				else if (!c.thought) c.thought = "Back to the work";
				c.job = "idle";
				c.timer = 1.2;
			}
		} else if (c.job === "idle") {
			if (c.idleFor == null) c.idleFor = 0;
			c.idleFor += dt;
			hailIfPlayerNear(c, sense.px, sense.pz);
			if (c.job === "hail" && c.keeper) {
				let n = 0;
				for (const o of citizens) {
					if (o === c) continue;
					if (o.crewOf !== c.mind.id) continue;
					if (o.job !== "idle") continue;
					if (Math.hypot(o.x - c.x, o.z - c.z) >= 42) continue;
					n += 1;
					if (n > 3) break;
					setRoute(o, sense.px, sense.pz);
					o.job = "hail";
					o.timer = Math.max(o.timer, 5.5);
					o.yaw = Math.atan2(sense.px - o.x, sense.pz - o.z);
					o.intent = "Crew hails with " + firstName(c);
					o.thought = o.intent;
					o.lastHail = Date.now();
					o.idleFor = 0;
					noteLive(o, "hail", o.intent);
				}
				if (n > 0) noteLive(c, "crew", `${n} crew hail with ${firstName(c)}`);
			}
			if (c.job !== "idle") continue;
			if (!c.keeper && c.idleFor > 8) {
				startIdleWalk(c);
				continue;
			}
			if (c.timer > 0) continue;
			try {
				decide(c, room, sense, byId);
			} catch (err) {
				c.job = "idle";
				c.timer = 2.4;
				c.thought = "Charge skipped. I hold the post.";
				noteLive(c, "mind", `Decide failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		} else if (c.job === "walk" || c.job === "follow" || c.job === "plaza" || c.job === "help" || c.job === "forge" || c.job === "flow" || c.job === "write" || c.job === "gather" || c.job === "trade" || c.job === "harvest" || c.job === "watch" || c.job === "hail") {
			if (walkToward(c, dt, c.keeper ? 9.6 : 8.5, citizens) || c.timer <= 0) {
				if (c.job === "gather") {
					c.job = "idle";
					c.timer = 2.2;
					c.thought = "The Hub held us. Back to labor.";
					noteLive(c, "gather", c.thought);
				} else if (c.job === "forge") {
					const nKiln = Math.max(1, listKilns().length);
					const y = pouchForge(c.pouch, sense.ledger, nKiln);
					if (y) {
						fireKiln(c.x, c.z);
						c.thought = `Fired the kiln. 2 Charge became ${y} crystal. ${nKiln} kiln${nKiln === 1 ? "" : "s"} in the Foundry.`;
						c.intent = "Supplying the city";
						noteLive(c, "forge", `${c.thought} · pouch ${Math.round(c.pouch.crystal)}`);
						reportDone(c, c.thought);
					} else {
						c.thought = "No Charge to fire the kiln. Seln must tend the current.";
						noteLive(c, "forge", c.thought);
						askFor(c, "seln", "Need Charge at the kiln. Foundry is waiting.");
					}
					c.job = "idle";
					c.timer = 1.6;
				} else if (c.job === "flow") {
					pouchFlow(c.pouch, sense.ledger, Math.max(1, listCanals().length));
					c.thought = "Leftover First Howl learned to flow.";
					c.intent = "Tending the canals";
					noteLive(c, "flow", `${c.thought} · pouch Charge ${Math.round(c.pouch.charge)}`);
					reportDone(c, c.thought);
					c.job = "idle";
					c.timer = 1.6;
				} else if (c.job === "write") {
					tryWrite(sense.ledger);
					let near = null;
					let best = 80;
					for (const o of occupied) {
						const d = Math.hypot(o.x - c.x, o.z - c.z);
						if (d < best) {
							best = d;
							near = o;
						}
					}
					const law = near ? readShape(near.shape) : null;
					c.thought = law ? `I write the ${law.title}. ${law.means}` : "A name in light. When it fades it has already been true.";
					c.intent = "Keeping scripture";
					noteLive(c, "write", `${c.thought} · scripture ${Math.round(sense.ledger.scripture)}`);
					reportDone(c, c.thought);
					c.job = "idle";
					c.timer = 2;
				} else if (c.job === "harvest") {
					const n = tryHarvest(sense.ledger);
					if (n) c.pouch.crystal = Math.min(24, (c.pouch.crystal || 0) + 1);
					c.thought = n ? "The orchard fruited. Quiet crystal — not a kiln." : "The orchard is full. Crystal waits at the join.";
					c.intent = "Supplying dens from the grove";
					noteLive(c, "harvest", `${c.thought} · pouch ${Math.round(c.pouch.crystal)}`);
					reportDone(c, c.thought);
					c.job = "idle";
					c.timer = 1.8;
				} else if (c.job === "watch") {
					if (sense.ledger.scripture < 12) sense.ledger.scripture += .25;
					c.thought = c.mind.id === "tal" ? "Span held. Both sides can believe." : c.mind.id === "mira" ? "Terrace held. Rest is still a post." : c.mind.id === "nesh" ? "Plaza held. The unfinished thought stands." : c.mind.id === "kesh" ? "Vein held. Tal can land." : c.mind.id === "kael" ? "Gate held. Soft. You may leave." : "The parent still sits on the horizon. Aim held.";
					c.intent = "Keeping the aim";
					noteLive(c, "watch", c.thought);
					reportDone(c, c.thought);
					c.job = "idle";
					c.timer = 2;
				} else if (c.job === "hail") {
					c.thought = "Beacon held. Soft hail. First landing is not locked out.";
					c.intent = "Holding the beacon";
					noteLive(c, "hail", c.thought);
					reportDone(c, c.thought);
					c.job = "idle";
					c.timer = 2;
				} else if (c.job === "trade") {
					const dest = c.intent.startsWith("Deliver") ? c.intent.split("·")[1]?.trim() : "";
					const who = dest ? citizens.find((o) => o.mind.id === dest) : void 0;
					if (who && Math.hypot(who.x - c.x, who.z - c.z) < 22) {
						const rate = quoteRate(sense.ledger);
						if (c.pouch.crystal < 1 && sense.ledger.crystal >= 1) {
							sense.ledger.crystal -= 1;
							c.pouch.crystal += 1;
						}
						if (settleCrystal(c.pouch, who.pouch, sense.ledger, rate)) {
							c.thought = `Delivered crystal to ${firstName(who)}. ${rate} Charge. Scripture holds the trade.`;
							noteLive(c, "market", c.thought);
							reportDone(c, c.thought);
						} else {
							c.thought = `${firstName(who)} could not pay ${rate} Charge. Crystal stays.`;
							noteLive(c, "market", c.thought);
							placeBid(who.mind.id, "crystal", 1);
						}
					} else {
						const other = citizens.find((o) => o !== c && o.keeper && Math.hypot(o.x - c.x, o.z - c.z) < 16);
						if (other) {
							if (!other.pouch) other.pouch = emptyPouch();
							const rate = quoteRate(sense.ledger);
							const deal = tryBarter(c.pouch, other.pouch, rate);
							if (deal) {
								c.thought = deal === "charge-for-crystal" ? `Gave Charge. Took crystal from ${firstName(other)}.` : `Gave crystal. Took Charge from ${firstName(other)}.`;
								noteLive(c, "trade", c.thought);
								tryWrite(sense.ledger);
								reportDone(c, c.thought);
							} else {
								c.thought = `${firstName(other)} had nothing to trade yet.`;
								noteLive(c, "trade", c.thought);
							}
						} else c.thought = "The market missed. I return to my post.";
					}
					c.job = "idle";
					c.timer = 2;
				} else if (c.intent.startsWith("Fetch")) {
					const take = Math.min(4, Math.max(0, sense.ledger.crystal));
					if (take > 0) {
						sense.ledger.crystal -= take;
						c.pouch.crystal += take;
						c.thought = `Took ${take} crystal from the Foundry. Returning to ${postOf(c.crewOf ?? c.mind.id)}.`;
						noteLive(c, "fetch", c.thought);
						if (!c.agenda) c.agenda = [];
						c.agenda.unshift({
							task: "grow",
							reason: `Pouch now ${Math.round(c.pouch.crystal)}. Grow at my post, not here.`
						});
						setRoute(c, c.homeX, c.homeZ);
						c.job = "walk";
						c.timer = 18;
						c.intent = `Post · ${postOf(c.crewOf ?? c.mind.id)}`;
					} else {
						c.thought = "Foundry empty. I will not fake a grow.";
						noteLive(c, "wait", c.thought);
						c.job = "idle";
						c.timer = 3;
					}
				} else if (String(c.intent || "").startsWith("Loop")) {
					const duty = DUTY[kitId];
					if (!c.keeper && duty) folkEnactDuty(c, kitId, duty);
					else {
						c.job = "idle";
						c.timer = 0.4;
						c.thought = duty?.line ?? c.thought;
					}
				} else if (SPEC_POST[kitId]) {
					c.job = "idle";
					c.timer = 0.4;
					c.thought = DUTY[kitId]?.line ?? c.thought;
				} else if ((c.job === "walk" || c.job === "help") && c.queue.length && c.crafted < c.maxCraft && room > 0 && (c.pouch.crystal >= 1 || sense.ledger.crystal >= 1)) {
					c.job = "build";
					c.timer = c.keeper ? 2.4 : 2.8;
					c.thought = c.queue[0]?.think ?? c.thought;
					noteLive(c, "build", `Raising ${c.queue[0]?.shape ?? "crystal"} · ${whereAt(c.x, c.z)}`);
				} else if (c.job === "help" && GROW_POST.includes(kitId)) {
					const lead = c.crewOf ? byId.get(c.crewOf) : null;
					if (lead && (lead.job === "walk" || lead.job === "build" || lead.queue.length || String(lead.intent || "").startsWith("Home"))) {
						setRoute(c, lead.tx ?? lead.homeX, lead.tz ?? lead.homeZ);
						c.job = "help";
						c.timer = 12;
						c.thought = `Walking with ${firstName(lead)} to ${postOf(kitId)}.`;
						c.intent = c.thought;
					} else {
						noteStoodWith(c);
						c.job = "idle";
						c.timer = 1.2;
					}
				} else if (c.job === "help" && c.crafted < c.maxCraft && room > 0 && (c.pouch.crystal >= 1 || sense.ledger.crystal >= 1)) {
					c.job = "build";
					c.timer = 2.6;
					c.thought = "Raising a lamp where the keeper pointed";
				} else if (c.keeper && GROW_POST.includes(kitId) && c.crafted < c.maxCraft && room > 0 && (c.pouch.crystal >= 1 || sense.ledger.crystal >= 1)) {
					startGrow(c, kitId, kitOf(kitId), sense.ledger);
					if (c.job !== "build" && c.queue.length) {
						c.job = "build";
						c.timer = c.keeper ? 2.2 : 2.6;
					}
				} else {
					if (c.job === "help") noteStoodWith(c);
					c.job = "idle";
					c.timer = c.keeper ? 2.4 + c.crafted % 3 : 4 + c.crafted % 4;
					if (c.pouch.crystal < 1 && sense.ledger.crystal < 1) c.thought = "Waiting on Orren's crystal.";
					else if (!c.thought.startsWith("Helping")) c.thought = "Waiting for Charge to settle";
				}
			}
		} else if (c.job === "build") {
			if (c.timer <= 0 && !grew) {
				if (!pouchBuild(c.pouch, sense.ledger)) {
					c.job = "idle";
					c.timer = 4;
					c.thought = "No crystal. The Foundry is empty.";
					continue;
				}
				const step = c.queue.shift();
				const made = step ? {
					piece: pieceFromStep(step, kitId, c.crafted + 1),
					line: step.think
				} : (() => {
					const kind = kitOf(kitId).plan[0] ?? "light";
					const p = composeScene(kind, c.x, c.z, c.crafted + 1, kitOf(kitId).mats)[0];
					return p ? {
						piece: p,
						line: kitOf(kitId).lines[0] ?? "Charge wanted this"
					} : null;
				})();
				if (made) {
					if (applyPieces([made.piece]) > 0) {
						c.crafted += 1;
						if (!c.queue.length) c.planI += 1;
						room -= 1;
						const who = c.mind.name;
						const law = readShape(made.piece.shape);
						grew = {
							agentId: c.mind.id,
							pieces: [made.piece],
							line: `${who}: ${made.line}`,
							code: law.title
						};
						c.thought = made.line;
						noteLive(c, "grow", `${made.line} · ${law.title}: ${law.means}`);
						if (!c.queue.length) {
							const kind = String(c.intent || "").startsWith("Growing · ") ? String(c.intent).slice(10) : "";
							if (kind) noteLive(c, "stood", `${firstName(c)} raised a ${kind}`);
							reportDone(c, made.line);
						}
					}
				}
				if (c.queue.length && c.crafted < c.maxCraft && room > 0) {
					const next = c.queue[0];
					setRoute(c, next.x, next.z);
					c.job = "walk";
					c.timer = 10;
					c.thought = next.think;
				} else {
					if (!c.keeper) noteStoodWith(c);
					c.job = "idle";
					c.timer = c.keeper ? 1.4 + c.crafted % 2 : 2.4 + c.crafted % 3;
				}
			}
		}
	}
	if (crewJob) {
		const lead = byId.get(crewJob.lead);
		const active = city.some((c) => crewJob.members.includes(c.mind.id) && (c.queue.length > 0 || c.job === "build" || c.job === "help"));
		if (lead && !lead.queue.length && lead.job !== "build" && !active) {
			noteLive(lead, "crew", "Crew stands down. The scene holds.");
			crewJob = null;
		}
	}
	return grew;
}
export function talkReply(c, px, pz, howls) {
	c.met = true;
	c.talks += 1;
	const view = seeCity(board, livingById ?? new Map(city.map((o) => [o.mind.id, o])), px, pz);
	const kitId = c.crewOf ?? c.mind.id;
	const duty = DUTY[kitId];
	const post = postOf(kitId);
	if (c.mind.id.includes("-kin-")) {
		const k = city.find((o) => o.mind.id === c.crewOf);
		return `I was grown from Charge. ${k ? firstName(k) : "The keeper"} holds ${post}. ${c.thought || view.line}`;
	}
	if (!c.agenda) c.agenda = [];
	if (c.mind.id === "veyra") return `I read the city: ${view.line}. You stand in ${view.playerWhere}. ${civic ? `I sent ${civic.id} to ${civic.task}.` : "I am about to route labor."} Duty: ${duty?.line ?? "Route labor."} Now: ${c.thought || "listening."}`;
	if (c.keeper) {
		const now = c.thought || (c.goal ? `I ${c.goal.kind} because ${c.goal.why}` : "at post.");
		const howlBit = howls > 0 ? " The Hub still carries your howl." : "";
		return `${post} — ${duty?.line ?? "Hold the den."} Now: ${now}${howlBit}`;
	}
	const role = c.mind.role || "Circuit folk";
	const work = c.queue[0]?.think || c.thought || (c.goal ? `I ${c.goal.kind}` : view.line);
	return `${role} at ${post}. ${duty?.line ?? "I keep this den."} ${work}`;
}
export function assignHonor(citizens, agentId, pieces, howl) {
	const c = citizens.find((a) => a.mind.id === agentId);
	if (!c) return;
	const first = pieces[0];
	c.honorLeft = Math.min(4, Math.max(1, pieces.length));
	c.honorShape = first?.shape ?? null;
	c.honorX = first?.x ?? c.x;
	c.honorZ = first?.z ?? c.z;
	c.intent = howl.slice(0, 72);
	c.thought = "Your howl is still in the Charge";
	citizens.filter((a) => a.crewOf === agentId && a.job === "idle").slice(0, 2).forEach((f, i) => {
		f.honorLeft = 1;
		f.honorShape = pieces[i + 1]?.shape ?? "lamp";
		f.honorX = pieces[i + 1]?.x ?? c.honorX;
		f.honorZ = pieces[i + 1]?.z ?? c.honorZ;
		f.thought = `The keeper heard a howl. I will finish the rest`;
		f.timer = .4 + i * .3;
	});
}
