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
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter((id, i, a) => typeof id === "string" && id.length > 0 && a.indexOf(id) === i).slice(-48) : [],
      talked: Array.isArray(parsed.talked) ? parsed.talked.filter((id, i, a) => typeof id === "string" && id.length > 0 && a.indexOf(id) === i).slice(-48) : [],
      builds: Array.isArray(parsed.builds) ? parsed.builds.filter((id, i, a) => typeof id === "string" && id.length > 0 && a.indexOf(id) === i).slice(-48) : [],
      structures: Array.isArray(parsed.structures) ? parsed.structures.filter((s, i, a) => s && typeof s === "object" && "id" in s && typeof (s as { id?: unknown }).id === "string" && String((s as { id?: unknown }).id).length > 0 && a.findIndex((x) => x && typeof x === "object" && "id" in x && (x as { id?: unknown }).id === (s as { id?: unknown }).id) === i).slice(-CITY_CAP) : [],
      lastCode: typeof parsed.lastCode === "string" ? parsed.lastCode.replace(/\s+/g, " ").trim().slice(0, 80) : "",
      crafted:
        parsed.crafted && typeof parsed.crafted === "object" && !Array.isArray(parsed.crafted)
          ? Object.fromEntries(
              Object.entries(parsed.crafted as Record<string, unknown>)
                .filter(([id, n]) => typeof id === "string" && id.length > 0 && Number.isFinite(Number(n)))
                .map(([id, n]) => [id, Number(n)]),
            )
          : {},
      log: Array.isArray(parsed.log)
        ? parsed.log.filter((row, i, a) => {
            const line = row && typeof row === "object" && "line" in row ? String((row as { line?: unknown }).line ?? "") : "";
            return line ? a.findIndex((x) => x && typeof x === "object" && "line" in x && String((x as { line?: unknown }).line ?? "") === line) === i : false;
          }).slice(-36)
        : [],
      resonance: clamp(Number(parsed.resonance) || DEFAULT.resonance, 0, 100),
      howls: clamp(Number.isFinite(Number(parsed.howls)) ? Math.floor(Number(parsed.howls)) : 0, 0, 99),
      px: Number.isFinite(Number(parsed.px)) ? Math.max(-2400, Math.min(2400, Number(parsed.px))) : 0,
      pz: Number.isFinite(Number(parsed.pz)) ? Math.max(-2400, Math.min(2400, Number(parsed.pz))) : 78,
      yaw: Number.isFinite(Number(parsed.yaw)) ? Number(parsed.yaw) : 0,
      ledger,
      pouches:
        parsed.pouches && typeof parsed.pouches === "object" && !Array.isArray(parsed.pouches)
          ? Object.fromEntries(
              Object.entries(parsed.pouches as Record<string, Pouch>).filter(([id]) => typeof id === "string" && id.length > 0).map(([id, p]) => [id, clampPouch(p)]),
            )
          : {},
      kin: Array.isArray(parsed.kin)
        ? (parsed.kin as KinSeed[]).filter((k, i, a) => k && typeof k.id === "string" && k.id.length > 0 && typeof k.crew === "string" && k.crew.length > 0 && a.findIndex((x) => x && typeof x.id === "string" && x.id === k.id) === i).slice(0, 24)
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
        visited: Array.isArray(data.visited) ? data.visited.filter((id, i, a) => a.indexOf(id) === i).slice(-48) : [],
        talked: Array.isArray(data.talked) ? data.talked.filter((id, i, a) => a.indexOf(id) === i).slice(-48) : [],
        builds: Array.isArray(data.builds) ? data.builds.filter((id, i, a) => a.indexOf(id) === i).slice(-48) : [],
        kin: Array.isArray(data.kin)
          ? data.kin.filter((k, i, a) => {
              const id = k && typeof k === "object" && "id" in k ? String((k as { id?: unknown }).id ?? "") : "";
              return id ? a.findIndex((x) => x && typeof x === "object" && "id" in x && String((x as { id?: unknown }).id ?? "") === id) === i : i === a.indexOf(k);
            }).slice(0, 24)
          : [],
        log: Array.isArray(data.log)
          ? data.log.filter((row, i, a) => {
              const line = row && typeof row === "object" && "line" in row ? String((row as { line?: unknown }).line ?? "") : "";
              return line ? a.findIndex((x) => x && typeof x === "object" && "line" in x && String((x as { line?: unknown }).line ?? "") === line) === i : i === a.indexOf(row);
            }).slice(-36)
          : [],
        structures: Array.isArray(data.structures) ? data.structures.filter((s, i, a) => s && typeof s === "object" && "id" in s && typeof (s as { id?: unknown }).id === "string" && String((s as { id?: unknown }).id).length > 0 && a.findIndex((x) => x && typeof x === "object" && "id" in x && (x as { id?: unknown }).id === (s as { id?: unknown }).id) === i).slice(-CITY_CAP) : [],
        lastCode: typeof data.lastCode === "string" ? data.lastCode.replace(/\s+/g, " ").trim().slice(0, 80) : "",
        crafted: data.crafted && typeof data.crafted === "object" && !Array.isArray(data.crafted)
          ? Object.fromEntries(Object.entries(data.crafted).slice(0, 24).map(([k, v]) => [k, Number.isFinite(Number(v)) ? Number(v) : 0]))
          : {},
        lastAway: clampLastAway(data.lastAway || undefined),
        pouches: data.pouches && typeof data.pouches === "object" && !Array.isArray(data.pouches)
          ? Object.fromEntries(Object.entries(data.pouches).slice(0, 24).map(([id, p]) => [id, clampPouch(p)]))
          : {},
        resonance: clamp(Number.isFinite(Number(data.resonance)) ? Number(data.resonance) : 12, 0, 100),
        howls: clamp(Number.isFinite(Number(data.howls)) ? Math.floor(Number(data.howls)) : 0, 0, 99),
        px: Number.isFinite(Number(data.px)) ? Math.max(-2400, Math.min(2400, Number(data.px))) : 0,
        pz: Number.isFinite(Number(data.pz)) ? Math.max(-2400, Math.min(2400, Number(data.pz))) : 78,
        yaw: Number.isFinite(Number(data.yaw)) ? Math.max(-6.2832, Math.min(6.2832, Number(data.yaw))) : 0,
        ledger: clampLedger(data.ledger),
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
  const summary = typeof raw.summary === "string" ? raw.summary.replace(/\s+/g, " ").trim().slice(0, 180) : "";
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
