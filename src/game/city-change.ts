/** Any player change: Grok Build or Grok Bot submit → preview → Pack votes live. */

import { loreCheck, visionKind, graphicPreview } from "./lore-gate";
import { interpretGrow } from "./inhabit";
import { loadDraft, type BoltBrainPack } from "./bolt-brain";
import { proposeVision } from "./visions";
import type { VisionPiece } from "./visions";

export type CityChange = {
  id: string;
  author: string;
  wish: string;
  kind: "crystal" | "graphic" | "law" | "brain";
  votes: number;
  voters: string[];
  status: "pending" | "live" | "refused";
  at: number;
  pieces: VisionPiece[];
  graphic: { fog: number; density: number } | null;
  pack: BoltBrainPack | null;
  source: "grok-build" | "grok-bot" | "sheet";
};

const QUEUE_KEY = "lc-city-changes";
const PREVIEW_KEY = "lc-city-change-preview";
const VOTE_KEY = "lc-city-change-voter";

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

export function changeVoterId(): string {
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

export function grokBuildChangeBrief(): string {
  return [
    "SuperGrok / Grok Build CLI only for iterating. Do NOT mill this in Grok Bot chat (quota).",
    "Write ANY change for Luminous Circuit — Core Spire mobile city.",
    "Crystal, light, law, keeper craft, Bolt brain personality, HUD copy, dens.",
    "Law: crystal never chrome. $BOLT witness only. Do not move STAR_CORE. Pack first. Not official xAI.",
    "When the change is ready, paste it into the game: Submit a change → Submit + preview.",
    "Or Grok Bot (one shot, no mill): submit_change with { wish }.",
    "Preview is on the land. Pack taps Chat: go live, then Put live.",
  ].join("\n");
}

export function loadChanges(): CityChange[] {
  return readJson<CityChange[]>(QUEUE_KEY, []);
}

function saveChanges(rows: CityChange[]) {
  writeJson(QUEUE_KEY, rows.slice(0, 32));
}

export function loadChangePreview(): CityChange | null {
  return readJson<CityChange | null>(PREVIEW_KEY, null);
}

export function setChangePreview(row: CityChange | null) {
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

export function buildChange(author: string, wishRaw: string, source: CityChange["source"], at = { x: 0, z: 78 }): { ok: false; error: string } | { ok: true; row: CityChange } {
  const wish = String(wishRaw || "").replace(/\s+/g, " ").trim();
  const gate = loreCheck(wish);
  if (!gate.ok) return { ok: false, error: gate.reason };
  const kind = visionKind(wish);
  const grown = interpretGrow(wish, at.x, at.z);
  const pieces = grown?.pieces ?? [];
  const graphic = kind === "graphic" ? graphicPreview(wish) : null;
  const brainish = /\b(brain|personality|bolt brain)\b/i.test(wish);
  const row: CityChange = {
    id: `c-${Math.random().toString(36).slice(2, 10)}`,
    author: String(author || "walker").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "walker",
    wish,
    kind: brainish ? "brain" : kind,
    votes: 0,
    voters: [],
    status: "pending",
    at: Date.now(),
    pieces,
    graphic,
    pack: brainish ? loadDraft() : null,
    source,
  };
  const q = loadChanges();
  q.unshift(row);
  saveChanges(q);
  return { ok: true, row };
}

export function voteChange(id: string): CityChange | null {
  const me = changeVoterId();
  const q = loadChanges();
  const row = q.find((r) => r.id === id);
  if (!row || row.status !== "pending") return null;
  if (row.voters.includes(me)) return row;
  row.voters.push(me);
  row.votes = row.voters.length;
  saveChanges(q);
  return row;
}

export function refuseChange(id: string): boolean {
  const q = loadChanges();
  const row = q.find((r) => r.id === id);
  if (!row) return false;
  row.status = "refused";
  saveChanges(q);
  if (loadChangePreview()?.id === id) setChangePreview(null);
  return true;
}

export function markChangeLive(id: string): CityChange | null {
  const q = loadChanges();
  const row = q.find((r) => r.id === id);
  if (!row || row.status === "refused") return null;
  row.status = "live";
  saveChanges(q);
  setChangePreview(null);
  return row;
}

export async function pushChangeRemote(row: CityChange): Promise<string | null> {
  try {
    const sent = await proposeVision({
      author: row.author,
      wish: row.wish,
      line: row.wish.slice(0, 180),
      pieces: row.pieces,
      kind: row.kind === "brain" ? "law" : row.kind,
      graphic: row.graphic,
    });
    return sent.pr || sent.id || null;
  } catch {
    return null;
  }
}
