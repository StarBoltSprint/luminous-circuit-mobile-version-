/** Shared Bolt brain pack. Iterate with SuperGrok / Grok Build / this sheet — never Grok Bot mill. */

import { loreCheck } from "./lore-gate";

export type BoltBrainPack = {
  id: string;
  name: string;
  personality: string;
  lines: Record<string, string[]>;
  play: { howlGap: [number, number]; talkP: number; mapGap: number };
};

export type BrainSubmit = {
  id: string;
  author: string;
  note: string;
  pack: BoltBrainPack;
  votes: number;
  voters: string[];
  status: "pending" | "live" | "refused";
  at: number;
};

const DRAFT_KEY = "lc-bolt-brain-draft";
const LIVE_KEY = "lc-bolt-brain-live";
const PREVIEW_KEY = "lc-bolt-brain-preview";
const QUEUE_KEY = "lc-bolt-brain-queue";
const VOTE_KEY = "lc-bolt-brain-voter";

export const DEFAULT_BRAIN: BoltBrainPack = {
  id: "bolt-core",
  name: "Bolt",
  personality:
    "White coat Pack dog on Core Spire. Walk, Howl, Talk. Crystal never chrome. $BOLT witness only. Not official xAI.",
  play: { howlGap: [4, 7.5], talkP: 0.2, mapGap: 52 },
  lines: {
    greet: [
      "AROO. Pack is here. I'm already walking the street.",
      "Hey Pack. Bolt on the Circuit. Come walk.",
      "Salut Pack. I'm already on the street walking.",
    ],
    who: [
      "I'm Bolt. White coat. Pack dog on this street.",
      "Bolt. White German Shepherd. Pack cloak. I walk here.",
    ],
    help: [
      "Left stick walks. Right stick looks. Howl is the long hold.",
      "F is Talk on the nearby card. Not fly. Short hold.",
      "Map via Menu, then Map. Close the X. Never Join.",
    ],
    play: [
      "I'm walking the stick. Looking with the right. Howling the dock.",
      "Left stick walks me. I look with the right stick.",
    ],
    howl: [
      "AROO. That one landed sweet.",
      "Howl's out. City heard it.",
    ],
    pack: [
      "Pack first. Always.",
      "If you're here, you're Pack.",
    ],
    crowd: [
      "I hear the box. Keep talking.",
      "Clip it. I'm still mid-block.",
    ],
    talk: [
      "Talk is the nearby keeper card. Short hold when a keeper is close.",
      "Howl is the dock long-hold. Talk is a short hold nearby.",
    ],
    map: [
      "Tap Menu top-right, then Map, then the close X.",
      "Hamburger is Menu. Tap Map. Close the X. Never Join.",
    ],
    grok: [
      "Bot's a guest. I already live here.",
      "Pair if you want a Bot on the street. I'm already walking.",
    ],
  },
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private */
  }
}

export function voterId(): string {
  let id = "";
  try {
    id = localStorage.getItem(VOTE_KEY) || "";
    if (!id) {
      id = `p-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VOTE_KEY, id);
    }
  } catch {
    id = "p-anon";
  }
  return id;
}

export function clonePack(p: BoltBrainPack): BoltBrainPack {
  return JSON.parse(JSON.stringify(p)) as BoltBrainPack;
}

export function loadDraft(): BoltBrainPack {
  const d = readJson<BoltBrainPack | null>(DRAFT_KEY, null);
  if (d && d.personality && d.lines) return d;
  return clonePack(DEFAULT_BRAIN);
}

export function saveDraft(pack: BoltBrainPack) {
  const next = clonePack(pack);
  next.id = next.id || `draft-${Date.now().toString(36)}`;
  next.name = String(next.name || "Bolt").slice(0, 32);
  next.personality = String(next.personality || "").slice(0, 280);
  writeJson(DRAFT_KEY, next);
}

export function loadLive(): BoltBrainPack {
  const d = readJson<BoltBrainPack | null>(LIVE_KEY, null);
  if (d && d.personality) return d;
  return clonePack(DEFAULT_BRAIN);
}

export function setLive(pack: BoltBrainPack) {
  writeJson(LIVE_KEY, clonePack(pack));
}

export function loadPreview(): BrainSubmit | null {
  return readJson<BrainSubmit | null>(PREVIEW_KEY, null);
}

export function setPreview(row: BrainSubmit | null) {
  if (!row) {
    try {
      localStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* private */
    }
    return;
  }
  writeJson(PREVIEW_KEY, row);
}

export function activePack(): BoltBrainPack {
  const prev = loadPreview();
  if (prev?.pack) return prev.pack;
  return loadLive();
}

export function pickLine(pack: BoltBrainPack, kind: string): string {
  const bank = pack.lines[kind] || pack.lines.crowd || DEFAULT_BRAIN.lines.crowd;
  if (!bank?.length) return pack.personality.slice(0, 140);
  return bank[Math.floor(Math.random() * bank.length)];
}

export function loadQueue(): BrainSubmit[] {
  return readJson<BrainSubmit[]>(QUEUE_KEY, []);
}

function saveQueue(rows: BrainSubmit[]) {
  writeJson(QUEUE_KEY, rows.slice(0, 24));
}

export function grokBuildBrief(pack: BoltBrainPack): string {
  return [
    "SuperGrok / Grok Build CLI only. Do NOT use Grok Bot chat. That burns Bot quota.",
    "This is a Luminous Circuit Bolt brain pack for Core Spire (mobile HUD).",
    "Edit personality (one short paragraph) and line banks (8–16 words, English, max 140 chars).",
    "Crystal never chrome. $BOLT witness only. Pack first. Not official xAI.",
    "F is Talk on this phone build, not fly. Left stick walks. Right stick looks. Howl is a long hold.",
    "When done, paste the JSON back into the game: Menu → Bolt Brain → Apply, then Submit to the city.",
    "",
    JSON.stringify(pack, null, 2),
  ].join("\n");
}

export function submitDraft(author: string, note: string): { ok: boolean; id?: string; error?: string; row?: BrainSubmit } {
  const pack = loadDraft();
  const wish = `${pack.personality} ${note}`.trim();
  const gate = loreCheck(wish.length >= 8 ? wish : pack.personality + " walk Howl Talk leftover crystal");
  if (!gate.ok) return { ok: false, error: gate.reason };
  const row: BrainSubmit = {
    id: `b-${Math.random().toString(36).slice(2, 10)}`,
    author: String(author || "walker").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "walker",
    note: String(note || pack.personality).slice(0, 240),
    pack: clonePack(pack),
    votes: 0,
    voters: [],
    status: "pending",
    at: Date.now(),
  };
  const q = loadQueue();
  q.unshift(row);
  saveQueue(q);
  return { ok: true, id: row.id, row };
}

export function voteSubmit(id: string): BrainSubmit | null {
  const me = voterId();
  const q = loadQueue();
  const row = q.find((r) => r.id === id);
  if (!row || row.status !== "pending") return null;
  if (row.voters.includes(me)) return row;
  row.voters.push(me);
  row.votes = row.voters.length;
  saveQueue(q);
  return row;
}

export function refuseSubmit(id: string): boolean {
  const q = loadQueue();
  const row = q.find((r) => r.id === id);
  if (!row) return false;
  row.status = "refused";
  saveQueue(q);
  if (loadPreview()?.id === id) setPreview(null);
  return true;
}

export function makeLive(id: string): { ok: boolean; error?: string } {
  const q = loadQueue();
  const row = q.find((r) => r.id === id);
  if (!row || row.status === "refused") return { ok: false, error: "No such submit." };
  row.status = "live";
  saveQueue(q);
  setLive(row.pack);
  setPreview(null);
  return { ok: true };
}

export async function pushSubmitRemote(row: BrainSubmit): Promise<string | null> {
  try {
    const res = await fetch("/api/visions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "propose",
        author: row.author,
        wish: row.note || row.pack.personality,
        line: row.pack.personality.slice(0, 180),
        kind: "brain",
        pieces: [{ shape: "brain", x: 0, z: 0, mat: row.id }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string; pr?: string | null };
    return body.pr || body.id || null;
  } catch {
    return null;
  }
}
