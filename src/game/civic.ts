/** Civic utility — briefs, location Howl, scripture names. Never coin, never custody. */
import { composeScene, defaultScene, type BuildPiece, type SceneKind } from "./build-spec";
import { DISTRICTS, HUB, LORE } from "./lore";
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

const NAMES_KEY = "lc-scripture-names";

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

function briefOf(keeper: string, line: string, zoneLabel: string | null, join?: boolean): CivicBrief {
  const meta = WALK[keeper] ?? { walk: "Hub", zoneId: null };
  const here =
    keeper === "veyra" || keeper === "nesh" || keeper === "rhoa"
      ? !zoneLabel || zoneLabel === HUB.title || /spire|hub|ring/i.test(zoneLabel)
      : civicForZone(zoneLabel)?.keeper === keeper;
  return { id: keeper, line, walk: meta.walk, keeper, zoneId: meta.zoneId, here, join };
}

export function civicBrief(
  stock: { charge: number; crystal: number; scripture: number; bids: number },
  zoneLabel: string | null,
): CivicBrief {
  const charge = Number(stock?.charge) || 0;
  const crystal = Number(stock?.crystal) || 0;
  const bids = Number(stock?.bids) || 0;
  const scripture = Number(stock?.scripture) || 0;
  if (charge < 4) return briefOf("seln", "Canal thin. Walk Canals. Howl — Seln tends.", zoneLabel);
  if (crystal < 3) return briefOf("orren", "Kiln hungry. Walk Foundry. Howl — Orren grows body.", zoneLabel);
  if (bids >= 3) return briefOf("voss", "Join busy. Walk Join. Howl — paper fill, no coin.", zoneLabel, true);
  if (charge >= 2 && crystal >= 1 && bids > 0) return briefOf("voss", "Bids at the Join. Walk Join. Howl.", zoneLabel, true);
  if (scripture < 1) return briefOf("iri", "Iri quiet. Walk Archive. Howl — a name in residual light.", zoneLabel);
  return briefOf("veyra", "Hub listens. Walk Core Spire. Howl — civic gather.", zoneLabel);
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
  if (keeper === "mira") return "Rest";
  if (keeper === "kael") return "Gate";
  return "Howl";
}

export function resolveHowl(keeper: string | null, ledger: Ledger): HowlResult {
  let out: HowlResult;
  if (!keeper || keeper === "veyra" || keeper === "rhoa" || keeper === "nesh") {
    addCharge(ledger, HOWL_YIELD);
    out = { toast: LORE.howl, gather: true, resonance: 8 };
  } else if (keeper === "seln") {
    tryFlow(ledger);
    out = { toast: "Seln: leftover Howl learned the banks.", gather: false, resonance: 5 };
  } else if (keeper === "orren") {
    const y = tryForge(ledger);
    out = y
      ? { toast: `Orren: Charge became ${y} crystal. Not chrome.`, gather: false, resonance: 5 }
      : { toast: "Orren: kiln waits on Charge. Tend the canal first.", gather: false, resonance: 2 };
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
