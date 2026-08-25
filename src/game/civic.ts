/** Civic utility — briefs, location Howl, scripture names. Never coin, never custody. */
import { composeScene, defaultScene, type BuildPiece, type SceneKind } from "./build-spec";
import { DISTRICTS, HUB, LORE } from "./lore";
import { howlMult, type HowlGrade } from "./play";
import {
  addCharge,
  HOWL_YIELD,
  matsOf,
  tryFlow,
  tryForge,
  tryHarvest,
  tryTrade,
  tryWrite,
  type Ledger,
} from "./society";

export type CivicAsk = {
  keeper: string;
  label: string;
  hint: string;
  join?: boolean;
};

export type CivicBrief = {
  id: string;
  line: string;
  walk: string;
  keeper: string;
  zoneId: string | null;
  here: boolean;
  join?: boolean;
};

export type HowlResult = {
  toast: string;
  gather: boolean;
  resonance: number;
};

export type HowlName = { at: number; keeper: string; text: string };

export type CivicStock = {
  charge: number;
  crystal: number;
  scripture: number;
  bids: number;
};

const NAMES_KEY = "lc-scripture-names";

/** Tend canal → kiln → join → name. Hub is the listening fallback, not a loop. */
const DUTY_CHAIN = ["seln", "orren", "voss", "iri"] as const;

const ASK: Record<string, Omit<CivicAsk, "keeper">> = {
  veyra: { label: "Ask Veyra to steady the breath", hint: "Hub listens. A new ring or font." },
  tal: { label: "Ask Tal to raise a span", hint: "A crossing both sides can believe." },
  seln: { label: "Ask Seln to tend the current", hint: "Leftover Howl learns a path." },
  orren: { label: "Ask Orren to grow kiln-body", hint: "Charge becomes crystal. Never chrome." },
  mira: { label: "Ask Mira to ward rest", hint: "Pause stays a post, not a test." },
  kael: { label: "Ask Kael to keep the gate soft", hint: "Leave. Return. No score." },
  iri: { label: "Ask Iri to name what stood", hint: "Scripture. Residual light." },
  nesh: { label: "Ask Nesh to notice", hint: "The plaza was unfinished." },
  aure: { label: "Ask Aure to keep aim", hint: "Parent stays on the horizon." },
  voss: { label: "Ask Voss to raise the Trading Place", hint: "Paper join. No coin.", join: true },
  kesh: { label: "Ask Kesh to choose a street", hint: "Wild Charge picks a vein." },
  lumen: { label: "Ask Lumen to hail", hint: "First landing is not a lock." },
  rhoa: { label: "Ask Rhoa to hold the chorus", hint: "Howl as gather, not volume." },
  syl: { label: "Ask Syl to fruit the grove", hint: "Quiet crystal, not a kiln." },
};

const WALK: Record<string, { walk: string; zoneId: string | null }> = {
  veyra: { walk: "Hub", zoneId: null },
  tal: { walk: "Light-Bridge", zoneId: "zone-bridge" },
  seln: { walk: "Canals", zoneId: "zone-canal" },
  orren: { walk: "Foundry", zoneId: "zone-foundry" },
  mira: { walk: "Terraces", zoneId: "zone-terrace" },
  kael: { walk: "Gates", zoneId: "zone-gate" },
  iri: { walk: "Archive", zoneId: "zone-archive" },
  nesh: { walk: "Hub", zoneId: null },
  aure: { walk: "Overlook", zoneId: "zone-overlook" },
  voss: { walk: "Join", zoneId: "zone-market" },
  kesh: { walk: "Wild Veins", zoneId: "zone-wild" },
  lumen: { walk: "Beacon", zoneId: "zone-beacon" },
  rhoa: { walk: "Howl Ring", zoneId: "zone-ring" },
  syl: { walk: "Orchard", zoneId: "zone-grove" },
};

export function civicForKeeper(id: string): CivicAsk | null {
  const row = ASK[id];
  if (!row) return null;
  return { keeper: id, ...row };
}

export function civicForZone(zone: string | null): CivicAsk | null {
  if (!zone) return null;
  if (zone === HUB.title || /spire|hub/i.test(zone)) return civicForKeeper("veyra");
  const d = DISTRICTS.find((x) => x.label === zone || zone.startsWith(x.label));
  if (d) return civicForKeeper(d.keeper);
  return null;
}

function doLine(keeper: string): string {
  if (keeper === "syl") return "Hold Howl, then fruit the grove — Fruit.";
  if (keeper === "mira") return "Hold Howl, then rest the terrace — Ward.";
  if (keeper === "iri") return "Hold Howl, then name the tablet — Name.";
  if (keeper === "kael") return "Hold Howl, then keep the gate soft — Gate.";
  if (keeper === "orren") return "Hold Howl, then kiln what Charge wanted — Kiln.";
  if (keeper === "seln") return "Hold Howl, then tend the current — Tend.";
  if (keeper === "voss") return "Hold Howl, then join what Charge wanted — Join.";
  if (keeper === "tal") return "Hold Howl, then span what Charge wanted — Span.";
  if (keeper === "rhoa") return "Hold Howl, then chorus at the ring — Chorus.";
  if (keeper === "nesh") return "Hold Howl, then notice what the plaza saw — Notice.";
  return `Hold Howl, then let go on the gold — ${howlVerb(keeper)}.`;
}

function briefOf(keeper: string, line: string, zoneLabel: string | null, join?: boolean): CivicBrief {
  const meta = WALK[keeper] ?? { walk: "Hub", zoneId: null };
  const here =
    keeper === "veyra" || keeper === "nesh" || keeper === "rhoa"
      ? !zoneLabel || zoneLabel === HUB.title || /spire|hub|ring/i.test(zoneLabel)
      : civicForZone(zoneLabel)?.keeper === keeper;
  return { id: keeper, line: here ? doLine(keeper) : line, walk: meta.walk, keeper, zoneId: meta.zoneId, here, join };
}

function stockOf(stock: CivicStock | null | undefined) {
  return {
    charge: Number(stock?.charge) || 0,
    crystal: Number(stock?.crystal) || 0,
    bids: Number(stock?.bids) || 0,
    scripture: Number(stock?.scripture) || 0,
  };
}

function needLive(keeper: string, s: ReturnType<typeof stockOf>): boolean {
  if (keeper === "seln") return s.charge < 4;
  if (keeper === "orren") return s.crystal < 3;
  if (keeper === "voss") return s.bids >= 3 || (s.charge >= 2 && s.crystal >= 1 && s.bids > 0);
  if (keeper === "iri") return s.scripture < 1;
  return false;
}

function needLine(keeper: string, s: ReturnType<typeof stockOf>): { line: string; join?: boolean } {
  if (keeper === "seln") {
    return { line: s.charge < 4 ? "Canal thin. Walk Canals. Howl — Seln tends." : "Walk Canals. Howl — Seln tends." };
  }
  if (keeper === "orren") {
    return { line: s.crystal < 3 ? "Kiln hungry. Walk Foundry. Howl — Orren grows body." : "Walk Foundry. Howl — Orren grows body." };
  }
  if (keeper === "voss") {
    if (s.bids >= 3) return { line: "Join busy. Walk Join. Howl — paper fill, no coin.", join: true };
    if (s.bids > 0) return { line: "Bids at the Join. Walk Join. Howl.", join: true };
    return { line: "Walk Join. Howl — paper fill, no coin.", join: true };
  }
  if (keeper === "iri") {
    return { line: s.scripture < 1 ? "Iri quiet. Walk Archive. Howl — a name in residual light." : "Walk Archive. Howl — a name in residual light." };
  }
  return { line: "Hub listens. Walk Core Spire. Howl — civic gather." };
}

function pickNeed(s: ReturnType<typeof stockOf>): { keeper: string; line: string; join?: boolean } {
  if (needLive("seln", s)) return { keeper: "seln", ...needLine("seln", s) };
  if (needLive("orren", s)) return { keeper: "orren", ...needLine("orren", s) };
  if (needLive("voss", s)) return { keeper: "voss", ...needLine("voss", s) };
  if (needLive("iri", s)) return { keeper: "iri", ...needLine("iri", s) };
  return { keeper: "veyra", ...needLine("veyra", s) };
}

export function civicBrief(
  stock: { charge: number; crystal: number; scripture: number; bids: number },
  zoneLabel: string | null,
): CivicBrief {
  const s = stockOf(stock);
  const row = pickNeed(s);
  return briefOf(row.keeper, row.line, zoneLabel, row.join);
}

/** After a successful howl, send the player to a DIFFERENT post. Canal → kiln → join → name. */
export function civicNext(
  stock: { charge: number; crystal: number; scripture: number; bids: number },
  justDidKeeper: string,
): CivicBrief {
  const s = stockOf(stock);
  const did = (justDidKeeper || "").toLowerCase();
  const i = DUTY_CHAIN.indexOf(did as (typeof DUTY_CHAIN)[number]);
  const order =
    i >= 0 ? [...DUTY_CHAIN.slice(i + 1), ...DUTY_CHAIN.slice(0, i)] : [...DUTY_CHAIN];
  const pick = order.find((k) => needLive(k, s)) ?? order[0] ?? "seln";
  const row = needLine(pick, s);
  const brief = briefOf(pick, row.line, null, row.join);
  return { ...brief, here: false, line: row.line };
}

export function loadNames(): HowlName[] {
  try {
    const raw = JSON.parse(localStorage.getItem(NAMES_KEY) || "[]") as HowlName[];
    if (!Array.isArray(raw)) return [];
    return raw.filter((x) => x && typeof x.text === "string").slice(-36);
  } catch {
    return [];
  }
}

function rememberHowl(keeper: string, text: string) {
  const row: HowlName = { at: Date.now(), keeper: keeper || "circuit", text };
  const next = [...loadNames(), row].slice(-36);
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(next));
  } catch {
    /* private */
  }
}

export function howlVerb(keeper: string | null): string {
  if (keeper === "seln") return "Tend";
  if (keeper === "orren") return "Kiln";
  if (keeper === "voss") return "Join";
  if (keeper === "iri") return "Name";
  if (keeper === "syl") return "Fruit";
  if (keeper === "mira") return "Ward";
  if (keeper === "kael") return "Gate";
  if (keeper === "aure") return "Aim";
  if (keeper === "lumen") return "Hail";
  if (keeper === "nesh") return "Notice";
  if (keeper === "tal") return "Span";
  if (keeper === "veyra") return "Breath";
  if (keeper === "rhoa") return "Chorus";
  if (keeper === "kesh") return "Vein";
  return "Howl";
}

function gradeOf(grade?: HowlGrade): HowlGrade {
  if (grade === "thin" || grade === "held" || grade === "true") return grade;
  return "true";
}

function firstVisit(keeper: string | null): boolean {
  if (!keeper) return true;
  try {
    return !loadNames().some((n) => n.keeper === keeper);
  } catch {
    return true;
  }
}

function clampStock(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(99, v));
}

/** Scale positive Charge/crystal/scripture gains. Costs stay. Thin still leaves a little. */
function scaleGains(
  ledger: Ledger,
  before: { charge: number; crystal: number; scripture: number },
  m: number,
) {
  if (m === 1) return;
  const bump = (now: number, prev: number) => {
    const d = now - prev;
    if (d <= 0) return now;
    let s = Math.round(d * m);
    if (m < 1) s = Math.max(1, s);
    if (m > 1 && s <= d) s = d + 1;
    return clampStock(prev + s);
  };
  ledger.charge = bump(ledger.charge, before.charge);
  ledger.crystal = bump(ledger.crystal, before.crystal);
  ledger.scripture = bump(ledger.scripture, before.scripture);
}

function tagGrade(toast: string, grade?: HowlGrade): string {
  if (!grade) return toast;
  if (grade === "held") return `${toast} Held.`;
  if (grade === "thin") return `${toast} Thin.`;
  return `${toast} True.`;
}

export function resolveHowl(keeper: string | null, ledger: Ledger, grade?: HowlGrade): HowlResult {
  const g = gradeOf(grade);
  const m = howlMult(g);
  const first = firstVisit(keeper);
  const skipKiln = g === "thin" && !first;
  const before = { charge: ledger.charge, crystal: ledger.crystal, scripture: ledger.scripture };
  let out: HowlResult;
  if (!keeper || keeper === "veyra" || keeper === "rhoa" || keeper === "nesh") {
    addCharge(ledger, HOWL_YIELD);
    out = { toast: LORE.howl, gather: true, resonance: 8 };
  } else if (keeper === "seln") {
    tryFlow(ledger);
    out = { toast: "Seln: leftover Howl learned the banks.", gather: false, resonance: 5 };
  } else if (keeper === "orren") {
    if (skipKiln) {
      out = { toast: "Orren: kiln felt a thin howl. Hold through the gold.", gather: false, resonance: 2 };
    } else {
      const y = tryForge(ledger);
      out = y
        ? { toast: `Orren: Charge became ${y} crystal. Not chrome.`, gather: false, resonance: 5 }
        : first
          ? { toast: "Orren: first fire is small. Canal leftover still counts.", gather: false, resonance: 3 }
          : { toast: "Orren: kiln waits on Charge. Tend the canal first.", gather: false, resonance: 2 };
      if (!y && first) {
        ledger.crystal = clampStock(ledger.crystal + 1);
      }
    }
  } else if (keeper === "voss") {
    const ok = tryTrade(ledger);
    out = {
      toast: ok ? "Voss: Charge for crystal. Paper fill. No coin." : "Voss: Join is open. Bring Charge and crystal.",
      gather: false,
      resonance: ok ? 5 : 2,
    };
  } else if (keeper === "iri") {
    tryWrite(ledger);
    out = { toast: "Iri: A name in residual light. Your howl is written.", gather: false, resonance: 4 };
  } else if (keeper === "syl") {
    const n = tryHarvest(ledger, 0);
    out = {
      toast: n ? "Syl: Quiet crystal. Fruit, not a kiln." : "Syl: Grove is full. The city has body enough.",
      gather: false,
      resonance: n ? 4 : 2,
    };
  } else if (keeper === "mira") {
    out = { toast: "Mira: Rest is still a post. The tired may stand.", gather: false, resonance: 3 };
  } else if (keeper === "kael") {
    out = { toast: "Kael: Gate held. Soft. You may leave.", gather: false, resonance: 3 };
  } else if (keeper === "tal") {
    addCharge(ledger, 2);
    out = { toast: "Tal: Both sides can believe this howl.", gather: false, resonance: 4 };
  } else if (keeper === "kesh") {
    addCharge(ledger, 2);
    out = { toast: "Kesh: Wild Charge heard. A street may choose.", gather: false, resonance: 4 };
  } else if (keeper === "lumen") {
    out = { toast: "Lumen: Soft hail. First landing is not a lock.", gather: false, resonance: 3 };
  } else if (keeper === "aure") {
    out = { toast: "Aure: The parent still sits on the horizon.", gather: false, resonance: 3 };
  } else {
    addCharge(ledger, 1);
    out = { toast: "A howl without a den. Walk a ward.", gather: false, resonance: 2 };
  }
  scaleGains(ledger, before, m);
  if (keeper === "orren" && !skipKiln) {
    const gained = ledger.crystal - before.crystal;
    if (gained > 0) {
      out = { ...out, toast: `Orren: Charge became ${gained} crystal. Not chrome.` };
    }
  }
  out = { ...out, toast: tagGrade(out.toast, grade) };
  rememberHowl(keeper || "circuit", out.toast);
  return out;
}

export function enactCivic(keeper: string, x: number, z: number): {
  pieces: BuildPiece[];
  line: string;
  code: string;
  kind: SceneKind;
} {
  const kind = defaultScene(keeper);
  const seed = (Date.now() + Math.floor(x) * 13 + Math.floor(z) * 7) % 99991;
  const pieces = composeScene(kind, x, z, seed, matsOf(keeper), 0, 0);
  const ask = civicForKeeper(keeper);
  const line = ask?.hint ?? "The den answers.";
  return { pieces, line, code: `Build.${kind}`, kind };
}
