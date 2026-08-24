/** Trading Place — paper Join + $BOLT witness. Never custody. Never transfer. */

export const BOLT_MINT = "7Y6Rix8X2botuMaJ2mno4UqSWdQZqU4RezY6qp7zpump";
export const BOLT_CA_SHORT = "7Y6R…pump";
export const BOLT_DEX = `https://dexscreener.com/solana/${BOLT_MINT}`;
export const HOWL_TEXT =
  "Luminous Circuit Join. I witness BOLT as outer spark. No coin on the stall. No deposit. Voss does not take the bag. Not an xAI product.";

const BOOK_KEY = "lc-paper-join";
const WITNESS_KEY = "lc-bolt-witness";

export type PaperFill = {
  at: number;
  who: string;
  side: "charge" | "crystal";
  n: number;
  rate: number;
  note: string;
};

export type Witness = {
  at: number;
  pub: string;
};

export type SparkMark = {
  usd: string;
  change: string;
  ok: boolean;
};

const HANDS = ["Voss", "Seln's runner", "Orren's kiln-hand", "Join folk"];

function clampRate(n: number) {
  if (!Number.isFinite(n)) return 3;
  return Math.max(2, Math.min(6, Math.round(n)));
}

export function loadBook(): PaperFill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOK_KEY) || "[]") as PaperFill[];
    if (!Array.isArray(raw)) return seedBook();
    const clean = raw.filter((f) => f && typeof f.who === "string" && typeof f.note === "string").slice(-36);
    return clean.length ? clean : seedBook();
  } catch {
    return seedBook();
  }
}

function seedBook(): PaperFill[] {
  const now = Date.now();
  const seed: PaperFill[] = [
    { at: now - 120000, who: "Voss", side: "charge", n: 3, rate: 3, note: "Paper quote. Charge for crystal. No coin." },
    { at: now - 80000, who: "Orren's kiln-hand", side: "crystal", n: 1, rate: 3, note: "Paper fill. Kiln met the join." },
    { at: now - 40000, who: "Seln's runner", side: "charge", n: 2, rate: 4, note: "Paper bid. Canal brought leftover Howl." },
  ];
  saveBook(seed);
  return seed;
}

function saveBook(rows: PaperFill[]) {
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(rows.slice(-36)));
  } catch {
    /* private mode */
  }
}

export function tickPaper(rate: number, charge: number, crystal: number, now = Date.now()): PaperFill[] {
  const book = loadBook();
  const last = book[book.length - 1];
  if (last && now - last.at < 9000) return book;
  const r = clampRate(rate);
  const dry = charge < 2 && crystal < 1;
  const who = HANDS[Math.floor((now / 9000) % HANDS.length)] ?? "Voss";
  const side: PaperFill["side"] = crystal >= charge ? "crystal" : "charge";
  const note = dry
    ? "Paper stall. Canal thin. No coin still."
    : side === "crystal"
      ? "Paper fill. Crystal met Charge. Voss did not take spark."
      : "Paper quote. Charge seeking crystal. No $BOLT on the stall.";
  const row: PaperFill = { at: now, who, side, n: side === "crystal" ? 1 : r, rate: r, note };
  const next = [...book, row].slice(-36);
  saveBook(next);
  return next;
}

export function loadWitness(): Witness | null {
  try {
    const raw = JSON.parse(localStorage.getItem(WITNESS_KEY) || "null") as Witness | null;
    if (!raw || typeof raw.pub !== "string" || !raw.at) return null;
    return { at: Number(raw.at) || 0, pub: raw.pub.slice(0, 12) };
  } catch {
    return null;
  }
}

function saveWitness(w: Witness) {
  try {
    localStorage.setItem(WITNESS_KEY, JSON.stringify(w));
  } catch {
    /* private mode */
  }
}

type Phantom = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey?: { toString: () => string } }>;
  signMessage: (m: Uint8Array, enc?: string) => Promise<unknown>;
};

function phantom(): Phantom | null {
  if (typeof window === "undefined") return null;
  const sol = (window as unknown as { solana?: Phantom }).solana;
  if (!sol || typeof sol.connect !== "function" || typeof sol.signMessage !== "function") return null;
  return sol;
}

export async function witnessHowl(): Promise<{ ok: true; pub: string } | { ok: false; reason: string }> {
  const sol = phantom();
  if (!sol) {
    return { ok: false, reason: "No Phantom. Witness is a signed Howl, not a deposit. Keys stay with you." };
  }
  try {
    const conn = await sol.connect();
    const pub = conn?.publicKey?.toString?.() ?? "";
    const bytes = new TextEncoder().encode(HOWL_TEXT);
    await sol.signMessage(bytes, "utf8");
    const w: Witness = { at: Date.now(), pub: pub.slice(0, 12) || "howl" };
    saveWitness(w);
    return { ok: true, pub: w.pub };
  } catch {
    return { ok: false, reason: "Howl unsigned. Nothing moved. The Join does not take $BOLT." };
  }
}

export async function fetchSpark(signal?: AbortSignal): Promise<SparkMark> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${BOLT_MINT}`, { signal });
    if (!res.ok) return { usd: "—", change: "", ok: false };
    const data = (await res.json()) as { pairs?: { priceUsd?: string; priceChange?: { h24?: number } }[] };
    const p = data.pairs?.[0];
    const usd = p?.priceUsd ? Number(p.priceUsd).toExponential(2) : "—";
    const ch = p?.priceChange?.h24;
    const change = Number.isFinite(ch) ? `${ch! >= 0 ? "+" : ""}${ch!.toFixed(1)}%` : "";
    return { usd, change, ok: usd !== "—" };
  } catch {
    return { usd: "—", change: "", ok: false };
  }
}
