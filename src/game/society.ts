import {
  composeScene,
  defaultScene,
  denOf,
  piecesToCode,
  type BuildPiece,
  type Mat,
  type SceneKind,
} from "./build-spec";

export type Ledger = {
  charge: number;
  crystal: number;
  scripture: number;
  lastTick: number;
};

export const BUILD_COST = 1;
export const FORGE_COST = 2;
export const FORGE_YIELD = 3;
export const FLOW_YIELD = 2;
export const HOWL_YIELD = 10;
export const BEAT_MS = 70_000;
export const MAX_AWAY_BEATS = 32;
export const MAX_AWAY_GROW = 16;
export const CITY_CAP = 280;
export const KIN_CHARGE = 4;
export const KIN_CRYSTAL = 2;
export const KIN_CAP = 28;

const GROWERS = ["tal", "mira", "kael", "nesh", "veyra", "iri", "kesh", "rhoa", "lumen", "aure", "voss", "syl", "seln", "orren"] as const;
const MATS: Record<string, Mat[]> = {
  veyra: ["glow", "violet", "crystal"],
  tal: ["cyan", "glow", "spire"],
  seln: ["cyan", "gold", "glow"],
  orren: ["gold", "crystal", "spire"],
  mira: ["violet", "crystal", "glow"],
  kael: ["violet", "glow", "cyan"],
  iri: ["gold", "crystal", "glow"],
  nesh: ["cyan", "gold", "spire"],
  aure: ["gold", "crystal", "glow"],
  voss: ["cyan", "gold", "glow"],
  kesh: ["gold", "cyan", "crystal"],
  lumen: ["violet", "glow", "gold"],
  rhoa: ["violet", "glow", "crystal"],
  syl: ["gold", "crystal", "violet"],
};

export function matsOf(id: string): Mat[] {
  return MATS[id] ?? ["cyan", "glow", "crystal"];
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** Parse a ledger/pouch count. Missing → fallback. Never NaN, never negative. */
function stockOf(n: unknown, fallback: number, hi = 99) {
  if (n == null || n === "") return fallback;
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, 0, hi);
}

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function defaultLedger(now = Date.now()): Ledger {
  return { charge: 18, crystal: 6, scripture: 0, lastTick: now };
}

export function clampLedger(raw: Partial<Ledger> | undefined, now = Date.now()): Ledger {
  const d = defaultLedger(now);
  if (!raw || typeof raw !== "object") return d;
  const tick = Number(raw.lastTick);
  return {
    // 0 Charge is a dry canal, not a missing save. Never negative leftover First Howl.
    charge: stockOf(raw.charge, d.charge, 99),
    crystal: stockOf(raw.crystal, d.crystal, 99),
    scripture: stockOf(raw.scripture, 0, 99),
    lastTick: Number.isFinite(tick) && tick > 1_000_000 ? tick : now,
  };
}

export function awayBeats(lastTick: number, now = Date.now()) {
  if (!lastTick) return 0;
  return Math.min(MAX_AWAY_BEATS, Math.floor(Math.max(0, now - lastTick) / BEAT_MS));
}

export function addCharge(ledger: Ledger, n: number) {
  const delta = Number.isFinite(n) ? n : 0;
  ledger.charge = clamp(ledger.charge + delta, 0, 99);
}

export function kilnYield(kilnCount: number) {
  return Math.min(6, FORGE_YIELD + Math.max(0, kilnCount - 1));
}

export function tryForge(ledger: Ledger, kilnCount = 1) {
  if (ledger.charge < FORGE_COST) return 0;
  ledger.charge = clamp(ledger.charge - FORGE_COST, 0, 99);
  const y = kilnYield(kilnCount);
  ledger.crystal = clamp(ledger.crystal + y, 0, 99);
  return y;
}

export function tryBuildSpend(ledger: Ledger) {
  if (ledger.crystal < BUILD_COST) return false;
  ledger.crystal = clamp(ledger.crystal - BUILD_COST, 0, 99);
  ledger.scripture = clamp(ledger.scripture + 1, 0, 99);
  return true;
}

export function tryFlow(ledger: Ledger, beat = 0) {
  // Dry canal: leftover First Howl still seeps. At least 1 every other beat so the city cannot die forever dry.
  if (ledger.charge <= 0) {
    if (beat % 2 === 0) ledger.charge = clamp(ledger.charge + 1, 0, 99);
    return true;
  }
  ledger.charge = clamp(ledger.charge + FLOW_YIELD, 0, 99);
  return true;
}

export function tryWrite(ledger: Ledger) {
  ledger.scripture = clamp(ledger.scripture + 1, 0, 99);
}

export type Pouch = { charge: number; crystal: number };

export function emptyPouch(): Pouch {
  return { charge: 0, crystal: 0 };
}

export function clampPouch(raw: Partial<Pouch> | undefined): Pouch {
  return {
    charge: stockOf(raw?.charge, 0, 24),
    crystal: stockOf(raw?.crystal, 0, 24),
  };
}

export function flowYield(canalCount: number) {
  return Math.min(5, FLOW_YIELD + Math.max(0, canalCount - 1));
}

/** Join quote: Charge per 1 crystal. Scarce crystal costs more leftover First Howl. No coin. Band 2–6 C/X. */
export function quoteRate(ledger: Ledger) {
  const crystal = Math.max(1, Number.isFinite(ledger.crystal) ? Math.max(0, ledger.crystal) : 1);
  const charge = Number.isFinite(ledger.charge) ? Math.max(0, ledger.charge) : 0;
  const scripture = Number.isFinite(ledger.scripture) ? Math.max(0, ledger.scripture) : 0;
  const memory = 1 - Math.min(0.25, scripture * 0.02);
  return clamp(Math.round((charge / crystal) * 1.3 * memory), 2, 6);
}

/** Voss quoting: 1 crystal at quoteRate Charge. Moves Charge for crystal. No coin. Clamped. */
export function tryTrade(ledger: Ledger) {
  if (ledger.charge < 2 || ledger.crystal < 1) return false;
  const pay = quoteRate(ledger);
  if (ledger.charge < pay) return false;
  ledger.charge = clamp(ledger.charge - pay, 0, 99);
  ledger.crystal = clamp(ledger.crystal + 1, 0, 99);
  return true;
}

export type MarketSnap = {
  rate: number;
  bids: number;
  line: string;
};

/** HUD civic ticker. Rate stays 2–6 C/X. Line: Charge N · crystal M · quote 1 for R. If scripture>=1, append · scripture N. If scripture<1, append · Iri quiet. If bids>0, append · N waiting. If bids>=3, append · join busy. If charge>=4 && crystal>=3 && bids>0, append · sit open. If crystal<3, append · kiln hungry. If charge<4, append · canal thin. If crystal>=12, append · stock fat. If charge>=16, append · canal fat. If charge>=24, append · canal full. If folk building>=1, append · dens rising. If folk building>=3, append · many dens. If folk building>=6, append · city rising. If folk building>=9, append · dens thick. If folk building>=12, append · city thick. If folk building>=15, append · dens full. If folk building>=18, append · dens packed. If folk building>=20, append · city packed. If folk building>=24, append · dens thick. If crystal>=18, append · stock full. If crystal>=24, append · vault full. If crystal>=32, append · vault thick. If crystal>=40, append · vault packed. If crystal>=60, append · vault heavy. If bids>=5, append · join full. If bids>=8, append · join thick. If bids>=12, append · join packed. If bids>=16, append · join fat. If bids>=20, append · join heavy. If scripture>=12, append · names thick. If scripture>=16, append · names full. If scripture>=20, append · hall full. If scripture>=24, append · names packed. If scripture>=28, append · names thick. If scripture>=32, append · names heavy. If charge>=32, append · current fat. If charge>=40, append · current full. If charge>=50, append · current packed. If charge>=60, append · current fat. If charge>=80, append · current heavy. If charge>=100, append · current overflow. If scripture>=8, append · named. If scripture>=1 && charge>=8, append · named current. If scripture>=2 && charge>=6, append · parent seen. If charge>=4 && charge<16, append · current learns. If charge>=8 && crystal>=4, append · parent limb. Line stays under 140. */
export function marketSnap(ledger: Ledger, bids = 0, building = 0): MarketSnap {
  const L = ledger ?? defaultLedger();
  const rate = quoteRate(L);
  const n = clamp(Math.floor(Number.isFinite(Number(bids)) ? Number(bids) : 0), 0, 99);
  const dens = clamp(Math.floor(Number.isFinite(Number(building)) ? Number(building) : 0), 0, 99);
  const charge = Number.isFinite(L.charge) ? Math.max(0, L.charge) : 0;
  const crystal = Number.isFinite(L.crystal) ? Math.max(0, L.crystal) : 0;
  const scripture = Number.isFinite(L.scripture) ? Math.max(0, L.scripture) : 0;
  let line = `Charge ${Math.round(charge)} · crystal ${Math.round(crystal)} · quote 1 for ${rate}`;
  if (scripture >= 1) line += ` · scripture ${Math.round(scripture)}`;
  else line += ` · Iri quiet`;
  if (n > 0) line += ` · ${n} waiting`;
  if (n >= 3) {
    const busy = ` · join busy`;
    if (line.length + busy.length <= 140) line += busy;
  }
  if (charge >= 4 && crystal >= 3 && n > 0) {
    const sit = ` · sit open`;
    if (!line.includes("sit open") && line.length + sit.length <= 140) line += sit;
  }
  if (crystal < 3) line += ` · kiln hungry`;
  if (charge < 4) {
    const thin = ` · canal thin`;
    if (line.length + thin.length <= 140) line += thin;
  }
  if (crystal >= 12) line += ` · stock fat`;
  if (charge >= 16) line += ` · canal fat`;
  if (charge >= 24) {
    const full = ` · canal full`;
    if (line.length + full.length <= 140) line += full;
  }
  if (dens >= 1) line += ` · dens rising`;
  if (dens >= 3) {
    const many = ` · many dens`;
    if (line.length + many.length <= 140) line += many;
  }
  if (dens >= 6) {
    const city = ` · city rising`;
    if (line.length + city.length <= 140) line += city;
  }
  if (dens >= 9) {
    const thick = ` · dens thick`;
    if (!line.includes("dens thick") && line.length + thick.length <= 140) line += thick;
  }
  if (dens >= 12) {
    const thick = ` · city thick`;
    if (line.length + thick.length <= 140 && !line.includes("city thick")) line += thick;
  }
  if (dens >= 15) {
    const full = ` · dens full`;
    if (line.length + full.length <= 140 && !line.includes("dens full")) line += full;
  }
  if (dens >= 18) {
    const packed = ` · dens packed`;
    if (line.length + packed.length <= 140 && !line.includes("dens packed")) line += packed;
  }
  if (dens >= 20) {
    const packed = ` · city packed`;
    if (line.length + packed.length <= 140 && !line.includes("city packed")) line += packed;
  }
  if (dens >= 24) {
    const thick = ` · dens thick`;
    if (line.length + thick.length <= 140 && !line.includes("dens thick")) line += thick;
  }
  if (dens >= 28) {
    const heavy = ` · dens heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("dens heavy")) line += heavy;
  }
  if (dens >= 32) {
    const heavy = ` · city heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("city heavy")) line += heavy;
  }
  if (dens >= 36) {
    const overflow = ` · dens overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("dens overflow")) line += overflow;
  }
  if (dens >= 40) {
    const overflow = ` · city overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("city overflow")) line += overflow;
  }
  if (dens >= 44) {
    const held = ` · city held`;
    if (line.length + held.length <= 140 && !line.includes("city held")) line += held;
  }
  if (dens >= 48) {
    const held = ` · dens held`;
    if (line.length + held.length <= 140 && !line.includes("dens held")) line += held;
  }
  if (dens >= 52) {
    const kept = ` · dens kept`;
    if (line.length + kept.length <= 140 && !line.includes("dens kept")) line += kept;
  }
  if (dens >= 56) {
    const dense = ` · dens dense`;
    if (line.length + dense.length <= 140 && !line.includes("dens dense")) line += dense;
  }
  if (crystal >= 18) {
    const full = ` · stock full`;
    if (line.length + full.length <= 140 && !line.includes("stock full")) line += full;
  }
  if (crystal >= 24) {
    const vault = ` · vault full`;
    if (line.length + vault.length <= 140 && !line.includes("vault full")) line += vault;
  }
  if (crystal >= 32) {
    const thick = ` · vault thick`;
    if (line.length + thick.length <= 140 && !line.includes("vault thick")) line += thick;
  }
  if (crystal >= 40) {
    const packed = ` · vault packed`;
    if (line.length + packed.length <= 140 && !line.includes("vault packed")) line += packed;
  }
  if (crystal >= 60) {
    const heavy = ` · vault heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("vault heavy")) line += heavy;
  }
  if (crystal >= 72) {
    const overflow = ` · vault overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("vault overflow")) line += overflow;
  }
  if (crystal >= 56) {
    const held = ` · vault held`;
    if (line.length + held.length <= 140 && !line.includes("vault held")) line += held;
  }
  if (crystal >= 80) {
    const kept = ` · vault kept`;
    if (line.length + kept.length <= 140 && !line.includes("vault kept")) line += kept;
  }
  if (crystal >= 88) {
    const dense = ` · vault dense`;
    if (line.length + dense.length <= 140 && !line.includes("vault dense")) line += dense;
  }
  if (n >= 5) {
    const full = ` · join full`;
    if (line.length + full.length <= 140 && !line.includes("join full")) line += full;
  }
  if (n >= 8) {
    const thick = ` · join thick`;
    if (line.length + thick.length <= 140 && !line.includes("join thick")) line += thick;
  }
  if (n >= 12) {
    const packed = ` · join packed`;
    if (line.length + packed.length <= 140 && !line.includes("join packed")) line += packed;
  }
  if (n >= 16) {
    const fat = ` · join fat`;
    if (line.length + fat.length <= 140 && !line.includes("join fat")) line += fat;
  }
  if (n >= 20) {
    const heavy = ` · join heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("join heavy")) line += heavy;
  }
  if (n >= 24) {
    const overflow = ` · join overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("join overflow")) line += overflow;
  }
  if (n >= 32) {
    const held = ` · join held`;
    if (line.length + held.length <= 140 && !line.includes("join held")) line += held;
  }
  if (n >= 36) {
    const kept = ` · join kept`;
    if (line.length + kept.length <= 140 && !line.includes("join kept")) line += kept;
  }
  if (n >= 40) {
    const dense = ` · join dense`;
    if (line.length + dense.length <= 140 && !line.includes("join dense")) line += dense;
  }
  if (scripture >= 12) {
    const names = ` · names thick`;
    if (!line.includes("names thick") && line.length + names.length <= 140) line += names;
  }
  if (scripture >= 16) {
    const full = ` · names full`;
    if (line.length + full.length <= 140 && !line.includes("names full")) line += full;
  }
  if (scripture >= 20) {
    const full = ` · hall full`;
    if (line.length + full.length <= 140 && !line.includes("hall full")) line += full;
  }
  if (scripture >= 24) {
    const packed = ` · names packed`;
    if (line.length + packed.length <= 140 && !line.includes("names packed")) line += packed;
  }
  if (scripture >= 28) {
    const thick = ` · names thick`;
    if (line.length + thick.length <= 140 && !line.includes("names thick")) line += thick;
  }
  if (scripture >= 32) {
    const heavy = ` · names heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("names heavy")) line += heavy;
  }
  if (scripture >= 36) {
    const overflow = ` · names overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("names overflow")) line += overflow;
  }
  if (scripture >= 40) {
    const overflow = ` · hall overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("hall overflow")) line += overflow;
  }
  if (scripture >= 44) {
    const kept = ` · names kept`;
    if (line.length + kept.length <= 140 && !line.includes("names kept")) line += kept;
  }
  if (scripture >= 48) {
    const dense = ` · names dense`;
    if (line.length + dense.length <= 140 && !line.includes("names dense")) line += dense;
  }
  if (charge >= 32) {
    const fat = ` · current fat`;
    if (!line.includes("current fat") && line.length + fat.length <= 140) line += fat;
  }
  if (charge >= 40) {
    const full = ` · current full`;
    if (line.length + full.length <= 140 && !line.includes("current full")) line += full;
  }
  if (charge >= 50) {
    const packed = ` · current packed`;
    if (line.length + packed.length <= 140 && !line.includes("current packed")) line += packed;
  }
  if (charge >= 60) {
    const fat = ` · current fat`;
    if (line.length + fat.length <= 140 && !line.includes("current fat")) line += fat;
  }
  if (charge >= 80) {
    const heavy = ` · current heavy`;
    if (line.length + heavy.length <= 140 && !line.includes("current heavy")) line += heavy;
  }
  if (charge >= 100) {
    const overflow = ` · current overflow`;
    if (line.length + overflow.length <= 140 && !line.includes("current overflow")) line += overflow;
  }
  if (scripture >= 8) {
    const named = ` · named`;
    if (line.length + named.length <= 140) line += named;
  }
  if (scripture >= 1 && charge >= 8) {
    const current = ` · named current`;
    if (!line.includes("named current") && line.length + current.length <= 140) line += current;
  }
  if (scripture >= 2 && charge >= 6) {
    const parent = ` · parent seen`;
    if (!line.includes("parent seen") && line.length + parent.length <= 140) line += parent;
  }
  if (charge >= 4 && charge < 16) {
    const learns = ` · current learns`;
    if (!line.includes("current learns") && line.length + learns.length <= 140) line += learns;
  }
  if (charge >= 8 && crystal >= 4) {
    const limb = ` · parent limb`;
    if (!line.includes("parent limb") && line.length + limb.length <= 140) line += limb;
  }
  if (line.length > 140) line = line.slice(0, 140);
  return { rate, bids: n, line };
}

/** Syl's grove: quiet crystal that learned to fruit. Not a kiln. Never spends Charge. Does not grow city pieces — CITY_CAP still gates body. */
export function tryHarvest(ledger: Ledger, grown = 0) {
  if (grown >= CITY_CAP) return 0;
  if (ledger.crystal >= 99) return 0;
  ledger.crystal = clamp(ledger.crystal + 1, 0, 99);
  return 1;
}

export function pouchFlow(pouch: Pouch, ledger: Ledger, canalCount = 1) {
  const y = flowYield(canalCount);
  pouch.charge = clamp(pouch.charge + y, 0, 24);
  addCharge(ledger, Math.max(1, Math.floor(y / 2)));
}

export function tryBarter(a: Pouch, b: Pouch, rate = 3): "charge-for-crystal" | "crystal-for-charge" | null {
  // Voss's join: Charge for crystal, crystal for Charge. No coin.
  // Charge is leftover First Howl — we match it, we do not mint a price.
  const pay = clamp(Math.round(Number(rate) || 3), 2, 6);
  if (a.charge >= pay && b.crystal >= 1) {
    a.charge = clamp(a.charge - pay, 0, 24);
    b.charge = clamp(b.charge + pay, 0, 24);
    b.crystal = clamp(b.crystal - 1, 0, 24);
    a.crystal = clamp(a.crystal + 1, 0, 24);
    return "charge-for-crystal";
  }
  if (a.crystal >= 1 && b.charge >= pay) {
    a.crystal = clamp(a.crystal - 1, 0, 24);
    b.crystal = clamp(b.crystal + 1, 0, 24);
    b.charge = clamp(b.charge - pay, 0, 24);
    a.charge = clamp(a.charge + pay, 0, 24);
    return "crystal-for-charge";
  }
  return null;
}

export function settleCrystal(seller: Pouch, buyer: Pouch, ledger: Ledger, rate: number) {
  // Delivery at the join. Vault Charge may stand in if a pouch is dry. Still no coin.
  if (seller.crystal < 1) return false;
  const pay = clamp(Math.round(Number(rate) || 3), 2, 6);
  if (buyer.charge >= pay) {
    buyer.charge = clamp(buyer.charge - pay, 0, 24);
    seller.charge = clamp(seller.charge + pay, 0, 24);
  } else if (ledger.charge >= pay) {
    ledger.charge = clamp(ledger.charge - pay, 0, 99);
    seller.charge = clamp(seller.charge + Math.min(pay, 2), 0, 24);
  } else {
    return false;
  }
  seller.crystal = clamp(seller.crystal - 1, 0, 24);
  buyer.crystal = clamp(buyer.crystal + 1, 0, 24);
  tryWrite(ledger);
  return true;
}

export function pouchForge(pouch: Pouch, ledger: Ledger, kilnCount = 1) {
  const y = kilnYield(kilnCount);
  if (pouch.charge >= FORGE_COST) {
    pouch.charge = clamp(pouch.charge - FORGE_COST, 0, 24);
    pouch.crystal = clamp(pouch.crystal + y, 0, 24);
    ledger.crystal = clamp(ledger.crystal + Math.max(1, Math.floor(y / 2)), 0, 99);
    return y;
  }
  return tryForge(ledger, kilnCount);
}

export function pouchBuild(pouch: Pouch, ledger: Ledger) {
  if (pouch.crystal >= BUILD_COST) {
    pouch.crystal = clamp(pouch.crystal - BUILD_COST, 0, 24);
    ledger.scripture = clamp(ledger.scripture + 1, 0, 99);
    return true;
  }
  return tryBuildSpend(ledger);
}

export type AwayGrow = {
  agentId: string;
  pieces: BuildPiece[];
  line: string;
  code: string;
};

export type AwayResult = {
  beats: number;
  grew: AwayGrow[];
  summary: string;
};

const AWAY_LINE: Record<string, string> = {
  veyra: "Veyra: Hub breath while you were gone. The Spire kept listening.",
  tal: "Tal: A span both sides can believe. I grew the crossing, not a toll.",
  mira: "Mira: Rest is still a place. I grew a nest while labor walked.",
  kael: "Kael: A gate that is not a lock. Threshold held.",
  nesh: "Nesh: The plaza was unfinished. I finished a piece and noticed.",
  iri: "Iri: A name in residual light. Written while you were gone.",
  aure: "Aure: The parent still sits on the horizon. I kept the aim.",
  kesh: "Kesh: A vein where the circuit had not chosen yet.",
  lumen: "Lumen: Soft hail. First landing is not locked out.",
  rhoa: "Rhoa: The gather that does not close. I held the ring.",
  voss: "Voss: Charge for crystal at the join. No coin. I kept the meeting.",
  syl: "Syl: Crystal learned to fruit. Quiet crystal, not a kiln.",
  seln: "Seln: Leftover First Howl wanted a path. I let it flow.",
  orren: "Orren: Charge became body. Not chrome. The kiln heard a howl.",
};

export function simulateAway(ledger: Ledger, room: number, seed: number, now = Date.now()): AwayResult {
  const beats = awayBeats(ledger.lastTick, now);
  const grew: AwayGrow[] = [];
  if (beats <= 0) {
    ledger.lastTick = now;
    return { beats: 0, grew, summary: "" };
  }
  for (let i = 0; i < beats; i++) {
    tryFlow(ledger, i);
    // Canal → grove → kiln → write → trade → dens. Grove fruit, not kiln. Never spends Charge.
    // CITY_CAP gates dens (body), not fruit — tryHarvest(ledger, grown=0).
    // Iri's residual light: tryWrite once per beat. No Charge, no crystal.
    // Voss quoting: tryTrade once per beat if Charge>=2 and crystal>=1. No coin.
    if (i % 3 === 0) tryHarvest(ledger, 0);
    else if (ledger.charge >= KIN_CHARGE && i % 2 === 0) tryHarvest(ledger, 0);
    tryForge(ledger);
    tryWrite(ledger);
    if (ledger.charge >= 2 && ledger.crystal >= 1) tryTrade(ledger);
    if (grew.length >= MAX_AWAY_GROW || room - grew.length <= 0) continue;
    if (ledger.crystal < BUILD_COST) continue;
    const who = GROWERS[i % GROWERS.length]!;
    const den = denOf(who);
    const kind: SceneKind = defaultScene(who);
    const a = hash(seed + i, 3) * Math.PI * 2;
    const d = 18 + hash(seed + i, 7) * 36;
    const x = den.x + Math.cos(a) * d;
    const z = den.z + Math.sin(a) * d;
    const mats = MATS[who] ?? ["cyan", "gold"];
    const pieces = composeScene(kind, x, z, seed + i, mats, 0, 0).slice(0, 1);
    if (!pieces.length) continue;
    if (!tryBuildSpend(ledger)) continue;
    const piece = pieces[0]!;
    const line = AWAY_LINE[who] ?? `${who[0]!.toUpperCase()}${who.slice(1)}: The city grew a ${kind} while you were away.`;
    grew.push({
      agentId: who,
      pieces: [piece],
      line,
      code: piecesToCode([piece]),
    });
  }
  ledger.lastTick = now;
  const n = grew.length;
  let summary = `While you were gone — ${n} grew in ${beats} beats. Charge ${ledger.charge} / Crystal ${ledger.crystal}.`;
  if (ledger.scripture >= 1) summary += ` · scripture ${ledger.scripture}`;
  if (summary.length > 140) summary = summary.slice(0, 140);
  return { beats, grew, summary };
}
