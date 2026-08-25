import type { BuildPiece } from "./build-spec";
import { clampLedger, clampPouch, defaultLedger, CITY_CAP, MAX_AWAY_BEATS, type Ledger, type Pouch } from "./society";
import type { KinSeed } from "./living";

const KEY = "lc-android-save-v1";
const HIDDEN_KEY = "lc-android-hidden";
const SAVE_VERSION = 4;

export type SeasonLine = {
  at: number;
  agent: string;
  text: string;
};

export type LastAway = {
  summary: string;
  beats: number;
  at: number;
};

export type SaveData = {
  version: number;
  resonance: number;
  howls: number;
  visited: string[];
  talked: string[];
  builds: string[];
  structures: BuildPiece[];
  lastCode: string;
  crafted: Record<string, number>;
  log: SeasonLine[];
  px: number;
  pz: number;
  yaw: number;
  ledger: Ledger;
  pouches: Record<string, Pouch>;
  kin: KinSeed[];
  lastAway?: LastAway;
};

const EMPTY_AWAY: LastAway = { summary: "", beats: 0, at: 0 };

const DEFAULT: SaveData = {
  version: SAVE_VERSION,
  resonance: 12,
  howls: 0,
  visited: [],
  talked: [],
  builds: [],
  structures: [],
  lastCode: "",
  crafted: {},
  log: [],
  px: 0,
  pz: 78,
  yaw: 0,
  ledger: defaultLedger(0),
  pouches: {},
  kin: [],
  lastAway: { ...EMPTY_AWAY },
};

let hiddenArmed = false;

function stampHidden() {
  try {
    localStorage.setItem(HIDDEN_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

/** First loadSave in the browser: stamp pagehide / visibility hidden. */
function armHiddenStamp() {
  if (hiddenArmed) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  hiddenArmed = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stampHidden();
  });
  window.addEventListener("pagehide", stampHidden);
}

function readHiddenStamp(): number {
  try {
    const n = Number(localStorage.getItem(HIDDEN_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function loadSave(): SaveData {
  armHiddenStamp();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const now = Date.now();
    const ledger = clampLedger(parsed.ledger, now);
    const hidden = readHiddenStamp();
    if (hidden) {
      // Stamp proves we hid. lastTick stays last simulation — never the hide time.
      const tick = Number(parsed.ledger?.lastTick);
      if (Number.isFinite(tick) && tick > 1_000_000) ledger.lastTick = tick;
    }
    return {
      ...DEFAULT,
      ...parsed,
      version: SAVE_VERSION,
      visited: Array.isArray(parsed.visited) ? parsed.visited.slice(-48) : [],
      talked: Array.isArray(parsed.talked) ? parsed.talked.slice(-48) : [],
      builds: Array.isArray(parsed.builds) ? parsed.builds : [],
      structures: Array.isArray(parsed.structures) ? parsed.structures.slice(-CITY_CAP) : [],
      lastCode: typeof parsed.lastCode === "string" ? parsed.lastCode : "",
      crafted:
        parsed.crafted && typeof parsed.crafted === "object" && !Array.isArray(parsed.crafted)
          ? parsed.crafted
          : {},
      log: Array.isArray(parsed.log) ? parsed.log.slice(-36) : [],
      resonance: clamp(Number(parsed.resonance) || DEFAULT.resonance, 0, 100),
      ledger,
      pouches:
        parsed.pouches && typeof parsed.pouches === "object" && !Array.isArray(parsed.pouches)
          ? Object.fromEntries(
              Object.entries(parsed.pouches as Record<string, Pouch>).map(([id, p]) => [id, clampPouch(p)]),
            )
          : {},
      kin: Array.isArray(parsed.kin)
        ? (parsed.kin as KinSeed[]).filter((k) => k && typeof k.id === "string" && typeof k.crew === "string").slice(0, 24)
        : [],
      lastAway: clampLastAway(parsed.lastAway),
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...data,
        version: SAVE_VERSION,
        log: data.log.slice(-36),
        structures: data.structures.slice(-CITY_CAP),
        lastAway: clampLastAway(data.lastAway),
      }),
    );
  } catch {
    /* private mode */
  }
}

export function resetSave(): SaveData {
  const fresh = emptySave();
  writeSave(fresh);
  return fresh;
}

function emptySave(): SaveData {
  return {
    ...DEFAULT,
    visited: [],
    talked: [],
    builds: [],
    structures: [],
    crafted: {},
    log: [],
    ledger: defaultLedger(),
    pouches: {},
    kin: [],
    lastAway: { ...EMPTY_AWAY },
  };
}

function clampLastAway(raw: Partial<LastAway> | undefined): LastAway {
  if (!raw || typeof raw !== "object") return { ...EMPTY_AWAY };
  const beats = Number(raw.beats);
  const at = Number(raw.at);
  const summary = typeof raw.summary === "string" ? raw.summary.slice(0, 180) : "";
  let n = Number.isFinite(beats) ? clamp(Math.floor(beats), 0, MAX_AWAY_BEATS) : 0;
  if (summary && n === 0) n = 1;
  return {
    summary,
    beats: n,
    at: Number.isFinite(at) && at > 0 ? at : 0,
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
