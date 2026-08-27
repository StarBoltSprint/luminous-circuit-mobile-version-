import { matchCraft } from "./crafts";
import type { BuildPiece } from "./build-spec";

export const FOLK_SKILLS = [
  { id: "tend", job: "flow", line: "Tend leftover First Howl. Never bottle it." },
  { id: "kiln", job: "forge", line: "Charge becomes body. Never chrome." },
  { id: "join", job: "trade", line: "Paper the join. No coin price." },
  { id: "span", job: "walk", line: "A span is a promise, never a toll." },
  { id: "rest", job: "idle", line: "Rest is a civic post, not a test." },
  { id: "name", job: "write", line: "Leftover light is not Hall. Name what stood." },
  { id: "hail", job: "hail", line: "Hail is witness. A shout that locks is not hail." },
  { id: "gather", job: "gather", line: "Gather does not close the ring." },
  { id: "fly", job: "fly", line: "The air is a span. Charge holds the body." },
] as const;

export type FolkSkillId = string;

export type FolkCraft = {
  id: string;
  job: string;
  line: string;
  wish: string;
};

export function interpretWish(raw: string): FolkCraft {
  const wish = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const low = wish.toLowerCase();
  const craft = matchCraft(wish);
  if (craft) return { id: craft.id, job: craft.job, line: craft.line, wish: wish || craft.line };
  const named = FOLK_SKILLS.find((s) => low === s.id || low.includes(s.id));
  if (named) return { ...named, wish: wish || named.line };
  if (/canal|water|flow/.test(low)) return { ...skillOf("tend"), wish };
  if (/forge|crystal|fire/.test(low)) return { ...skillOf("kiln"), wish };
  if (/trade|bid|market/.test(low)) return { ...skillOf("join"), wish };
  if (/bridge|road/.test(low)) return { ...skillOf("span"), wish };
  if (/sleep|hearth/.test(low)) return { ...skillOf("rest"), wish };
  if (/script|word|write/.test(low)) return { ...skillOf("name"), wish };
  if (/song|chorus|howl/.test(low)) return { ...skillOf("hail"), wish };
  if (/pick|harvest/.test(low)) return { ...skillOf("gather"), wish };
  const slug = low.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "practice";
  return {
    id: slug,
    job: "practice",
    line: wish || "I practice a new post. No Hall.",
    wish: wish || "practice",
  };
}

export type FolkPost = {
  id: string;
  name: string;
  crew: string;
  skill: FolkSkillId | null;
  wish: string;
  plugged: boolean;
  bornAt: number;
};

const DAY_KEY = "lc-folk-day";
const BOOK_KEY = "lc-folk-book";
const WISH_KEY = "lc-folk-wish";

export function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function canBirthToday() {
  try {
    return localStorage.getItem(DAY_KEY) !== localDay();
  } catch {
    return true;
  }
}

export function markBornToday() {
  try {
    localStorage.setItem(DAY_KEY, localDay());
  } catch {
    /* private */
  }
}

const LIVE_BIRTH_KEY = "lc-live-births";

export function canPeerBirth(peerId: string) {
  try {
    const raw = localStorage.getItem(LIVE_BIRTH_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return map[String(peerId || "")] !== localDay();
  } catch {
    return true;
  }
}

export function markPeerBirth(peerId: string) {
  try {
    const raw = localStorage.getItem(LIVE_BIRTH_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[String(peerId || "x")] = localDay();
    localStorage.setItem(LIVE_BIRTH_KEY, JSON.stringify(map));
  } catch {
    /* private */
  }
}

const LIVE_GROW_KEY = "lc-live-grows";
const GROWS_A_DAY = 3;

export function canPeerGrow(peerId: string) {
  try {
    const raw = localStorage.getItem(LIVE_GROW_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, { day: string; n: number }>) : {};
    const row = map[String(peerId || "")];
    if (!row || row.day !== localDay()) return true;
    return row.n < GROWS_A_DAY;
  } catch {
    return true;
  }
}

export function markPeerGrow(peerId: string) {
  try {
    const raw = localStorage.getItem(LIVE_GROW_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, { day: string; n: number }>) : {};
    const id = String(peerId || "x");
    const day = localDay();
    const row = map[id];
    map[id] = { day, n: row && row.day === day ? row.n + 1 : 1 };
    localStorage.setItem(LIVE_GROW_KEY, JSON.stringify(map));
  } catch {
    /* private */
  }
}

export function interpretGrow(raw: string, x: number, z: number): { pieces: BuildPiece[]; line: string } | null {
  const low = String(raw || "").toLowerCase();
  const at = (shape: BuildPiece["shape"], dx: number, dz: number, extra: Partial<BuildPiece> = {}): BuildPiece => ({
    shape,
    x: x + dx,
    z: z + dz,
    h: extra.h ?? 6,
    r: extra.r ?? 5,
    rot: extra.rot ?? 0,
    mat: extra.mat ?? "crystal",
  });
  if (/\b(kiln|forge|fire|crystal shop)\b/.test(low)) {
    return { pieces: [at("kiln", 10, 4), at("hearth", 16, 2, { mat: "gold" })], line: "A kiln stands. Charge becomes body." };
  }
  if (/\b(canal|water|rill|weir)\b/.test(low)) {
    return { pieces: [at("canal", 12, 0, { r: 8 }), at("weir", 20, 0)], line: "A canal learns leftover Howl. Never bottled." };
  }
  if (/\b(span|bridge|road|arch)\b/.test(low)) {
    return { pieces: [at("bridge", 14, 6, { r: 10 }), at("arch", 22, 6)], line: "A span is a promise, never a toll." };
  }
  if (/\b(den|house|home|hearth|rest)\b/.test(low)) {
    return { pieces: [at("house", 8, 10), at("pad", 8, 16, { mat: "cyan" })], line: "A den-mouth stands. Belonging, not a lock." };
  }
  if (/\b(grove|tree|orchard|garden|bough)\b/.test(low)) {
    return { pieces: [at("grove", 11, -8), at("bough", 17, -6, { mat: "violet" })], line: "An orchard of leftover light." };
  }
  if (/\b(lamp|beacon|light)\b/.test(low)) {
    return { pieces: [at("lamp", 6, 8, { mat: "glow" }), at("beacon", 6, 14)], line: "An honest lamp. Notice, not a lock." };
  }
  if (/\b(tablet|stele|name|write|script)\b/.test(low)) {
    return { pieces: [at("tablet", 9, 5), at("stele", 13, 5, { mat: "gold" })], line: "A name that was already true." };
  }
  return null;
}

export function loadFolkBook(): FolkPost[] {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FolkPost[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === "string")
      .map((p) => ({
        id: p.id,
        name: String(p.name || "Kin"),
        crew: String(p.crew || "nesh"),
        skill: (p.skill as FolkSkillId) || null,
        wish: String(p.wish || ""),
        plugged: Boolean(p.plugged),
        bornAt: Number(p.bornAt) || Date.now(),
      }))
      .slice(0, 48);
  } catch {
    return [];
  }
}

export function writeFolkBook(rows: FolkPost[]) {
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(rows.slice(0, 48)));
  } catch {
    /* private */
  }
}

export function writeLastWish(id: string, name: string, wish: string) {
  try {
    localStorage.setItem(WISH_KEY, JSON.stringify({ id, name, wish, at: Date.now() }));
  } catch {
    /* private */
  }
}

export function skillOf(id: string) {
  return FOLK_SKILLS.find((s) => s.id === id) ?? FOLK_SKILLS[0]!;
}

export const CREW_PICK = [
  { id: "veyra", label: "Hub" },
  { id: "seln", label: "Canal" },
  { id: "orren", label: "Kiln" },
  { id: "voss", label: "Join" },
  { id: "tal", label: "Span" },
  { id: "mira", label: "Rest" },
  { id: "iri", label: "Name" },
  { id: "rhoa", label: "Chorus" },
] as const;
