import { useEffect, useState, type FormEvent } from "react";
import { AGENTS, agentById } from "@/game/agents";
import { askCircuitAgent } from "@/game/ask-agent";
import { readShape, type BuildPiece } from "@/game/build-spec";
import { DISTRICTS } from "@/game/lore";
import { loadNames } from "@/game/civic";
import type { HudSnap } from "@/game/engine";

export const LOG_TABS = [
  { id: "now", label: "Now" },
  { id: "work", label: "Work" },
  { id: "keepers", label: "Keepers" },
  { id: "folk", label: "Folk" },
  { id: "grown", label: "Grown" },
  { id: "names", label: "Names" },
  { id: "ask", label: "Ask" },
] as const;

export type LogTab = (typeof LOG_TABS)[number]["id"];

const WORK_KINDS = new Set(["grow", "build", "forge", "flow", "harvest", "trade", "write", "hail", "watch", "crew", "stood", "walk", "home", "howl", "gather"]);

function isIdleJob(job: string) {
  const j = (job || "").trim().toLowerCase();
  return !j || j === "at rest" || j === "idle";
}

function keeperOrder(job: string) {
  const j = (job || "").trim().toLowerCase();
  if (j === "hail" || j === "greet") return 0;
  if (isIdleJob(j)) return 2;
  return 1;
}

function civicPip(id: string): "cyan" | "gold" | "gold-muted" | "keep" {
  if (id === "seln") return "cyan";
  if (id === "orren") return "gold";
  if (id === "voss") return "gold-muted";
  return "keep";
}

const PIP_FILL = {
  cyan: "var(--color-accent)",
  gold: "var(--color-gold)",
  "gold-muted": "color-mix(in oklab, var(--color-gold) 58%, var(--color-muted))",
  keep: "var(--color-violet)",
} as const;

function prettyLast(code: string) {
  if (!code) return "—";
  const m = /Build\.(\w+)/i.exec(code) || /^([A-Za-z][\w-]*)/.exec(code);
  const shape = (m?.[1] || "").toLowerCase();
  if (!shape) return "—";
  return readShape(shape).title || shape;
}

function folkOrder(job: string) {
  const j = (job || "").trim().toLowerCase();
  if (j.includes("crew")) return 0;
  if (j === "hail" || j === "greet") return 0;
  if (j === "build" || j.includes("grow") || j === "kin") return 1;
  if (isIdleJob(j)) return 2;
  return 0;
}

function savePlayerKey(k: string) {
  try {
    if (k) localStorage.setItem("lc-player-xai", k);
    else localStorage.removeItem("lc-player-xai");
  } catch { /* ok */ }
}
function loadChat(id: string): { role: "user" | "agent"; text: string }[] {
  try {
    const raw = sessionStorage.getItem(`lc-chat-${id}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { role: "user" | "agent"; text: string }[];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch {
    return [];
  }
}
function saveChat(id: string, turns: { role: "user" | "agent"; text: string }[]) {
  try { sessionStorage.setItem(`lc-chat-${id}`, JSON.stringify(turns.slice(-8))); } catch { /* ok */ }
}
function remainingHowls() {
  try { return Math.max(0, 8 - Number(sessionStorage.getItem("lc-howls") || 0)); } catch { return 8; }
}
function spendHowl() {
  try { sessionStorage.setItem("lc-howls", String(8 - remainingHowls() + 1)); } catch { /* ok */ }
}
function ago(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

export function LogSheet({
  hud, tab, onTab, selectedId, onSelect, onClose, onGrow, onSpeak, playerKey, onPlayerKey, cityMind, onCityMind,
}: {
  hud: HudSnap;
  tab: LogTab;
  onTab: (t: LogTab) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onGrow: (id: string, pieces: BuildPiece[], line: string, code: string) => void;
  onSpeak: (id: string, line: string) => void;
  playerKey: string;
  onPlayerKey: (k: string) => void;
  cityMind: boolean;
  onCityMind: (v: boolean) => void;
}) {
  const [howl, setHowl] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const selected = selectedId ? agentById(selectedId) : null;
  const living = hud.living.length ? hud.living : AGENTS.map((a) => ({ id: a.id, name: a.name, role: a.role, job: "At rest", crafted: 0, intent: "" }));
  const folk = (hud.people ?? []).filter((p) => !p.keeper).slice().sort((a, b) => folkOrder(a.job) - folkOrder(b.job));
  const liveAll = (hud.live ?? []).slice().reverse();
  const hailNow = liveAll.filter((l) => /hail|crew/i.test(l.kind)).length;
  const feed = tab === "work" ? liveAll.filter((l) => WORK_KINDS.has(l.kind ?? "")).sort((a, b) => {
    const rank = (k: string) => (k === "crew" || k === "grow" || k === "stood" || k === "build" || k === "forge" || k === "walk" || k === "home" ? 0 : 1);
    return rank(a.kind ?? "") - rank(b.kind ?? "");
  }) : liveAll;
  const grown = Object.entries(
    (hud.crystal ?? []).reduce<Record<string, number>>((acc, p) => {
      acc[p.shape] = (acc[p.shape] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const names = loadNames().slice().reverse();
  const left = remainingHowls();

  useEffect(() => {
    setChat(selectedId ? loadChat(selectedId) : []);
    setHowl("");
  }, [selectedId]);

  async function sendHowl(e: FormEvent, preset?: string) {
    e.preventDefault();
    if (!selected) return;
    const text = (preset ?? howl).trim();
    if (!text || busy || left <= 0) return;
    setBusy(true);
    const turns = [...chat, { role: "user" as const, text }];
    setChat(turns);
    setHowl("");
    try {
      const res = await askCircuitAgent({
        data: {
          agentId: selected.id,
          howl: text,
          px: hud.px,
          pz: hud.pz,
          playerKey: playerKey.trim(),
          crystal: hud.crystal.slice(-24),
          stock: hud.stock,
          job: living.find((a) => a.id === selected.id)?.job,
          thought: living.find((a) => a.id === selected.id)?.intent,
        },
      });
      const reply = res.line || "The city heard you.";
      const next = [...turns, { role: "agent" as const, text: reply }];
      setChat(next);
      saveChat(selected.id, next);
      onSpeak(selected.id, reply);
      if (res.pieces?.length) onGrow(selected.id, res.pieces, reply, res.code || "");
      spendHowl();
    } catch (err) {
      setChat([...turns, { role: "agent", text: err instanceof Error ? err.message : "The circuit is quiet." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet absolute inset-0 z-40 flex flex-col bg-bg hud-safe">
      <header className="sheet-head pointer-events-auto">
        <div>
          <p className="sheet-kicker">Living circuit</p>
          <h3 className="sheet-title">City log</h3>
        </div>
        <button type="button" className="log-close hud-chip min-h-11 px-3" onClick={onClose}>Close</button>
        <nav className="flex w-full min-w-0 flex-wrap gap-1" aria-label="City log">
          {LOG_TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`log-sheet-tab min-h-11 bg-transparent px-3 text-sm font-semibold tracking-[0.04em] ${on ? "border-b-2 border-gold text-gold" : "border-b-2 border-transparent text-muted"}`}
                data-on={tab === t.id}
                aria-current={on ? "page" : undefined}
                onClick={() => onTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>
      <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {(tab === "now" || tab === "work") && (
          <ul className="space-y-2">
            {tab === "now" && hailNow > 0 && (
              <li className="text-muted">{hailNow} hailing now</li>
            )}
            {feed.length === 0 && (
              <li className="text-muted">
                {tab === "work" ? "No labor yet. Charge canals, kiln, then a span." : "Quiet. Walk a keeper — they hail when they see you."}
              </li>
            )}
            {feed.map((l, i) => (
              <li key={`${l.at}-${i}`} className="log-row">
                <span className="text-accent">{l.name.split(" ")[0]}</span>
                <span className="log-kind">{l.kind}</span>
                <p>
                  <span className="log-live-pip inline-block h-[6px] w-[6px] shrink-0 rounded-full align-middle mr-1.5" style={{ background: "var(--color-accent)" }} aria-hidden />
                  {l.text}
                </p>
              </li>
            ))}
          </ul>
        )}
        {tab === "keepers" && (
          <ul className="space-y-2">
            {[...living].sort((a, b) => keeperOrder(a.job) - keeperOrder(b.job)).map((a) => {
              const post = DISTRICTS.find((d) => d.keeper === a.id);
              const pip = civicPip(a.id);
              return (
                <li key={a.id}>
                  <button type="button" className="log-keeper" onClick={() => { onSelect(a.id); onTab("ask"); }}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="log-pip inline-block h-[6px] w-[6px] shrink-0 rounded-full" data-civic={pip} style={{ background: PIP_FILL[pip] }} aria-hidden />
                        <span className="hud-title">{a.name.split(" ")[0]}</span>
                      </span>
                      <span className="text-xs text-accent">{/hail/i.test(a.job) ? "Hailing you" : a.job}</span>
                    </span>
                    <span className="block text-xs text-muted">{a.id === "lumen" && /hail|watch/i.test(a.job) ? "Soft hail · " : a.id === "kael" && /watch|hail/i.test(a.job) ? "On the gate · " : a.id === "veyra" && /watch|hail|breath/i.test(a.job) ? "Hub breath · " : (a.job || "").trim().toLowerCase() === "hail" ? "Hailing · " : a.id === "kesh" && /walk|watch/i.test(a.job) ? "On the wild vein · " : ((a.job || "").includes("Back to the post") || (a.job || "").trim().toLowerCase() === "walk") ? "Walking home · " : a.id === "tal" && /watch/i.test(a.job) ? "On the span · " : a.id === "mira" && /watch/i.test(a.job) ? "On the terrace · " : a.id === "aure" && /watch/i.test(a.job) ? "At the overlook · " : /watch/i.test(a.job) && a.id === "nesh" ? "On the plaza · " : a.id === "rhoa" && /gather|watch/i.test(a.job) ? "At the ring · " : a.id === "syl" && /harvest|watch/i.test(a.job) ? "In the orchard · " : a.id === "voss" && /trade|watch/i.test(a.job) ? "At the join · " : a.id === "iri" && /write|watch/i.test(a.job) ? "At the archive · " : a.id === "orren" && /forge|watch/i.test(a.job) ? "At the kiln · " : a.id === "seln" && /flow|watch/i.test(a.job) ? "On the canal · " : ""}{post?.duty ?? a.role}{a.intent ? ` · ${a.intent}` : ""}</span>
                  </button>
                </li>
              );
            })}
            {living.filter((a) => !isIdleJob(a.job)).length === 0 && <li className="text-muted">All keepers at rest. Walk a post.</li>}
          </ul>
        )}
        {tab === "folk" && (
          <ul className="space-y-2">
            <li className="text-muted">{folk.some(p => /hail|greet|crew/i.test(p.job)) ? `${folk.filter(p => /hail|greet|crew/i.test(p.job)).length} hailing · ` : ""}{folk.filter(p => /walk/i.test(p.job)).length > 0 ? `${folk.filter(p => /walk/i.test(p.job)).length} walking · ` : ""}{hud.folk.total} folk · {hud.folk.building > 0 ? `${hud.folk.building} standing a den` : `${hud.folk.building} growing`} · last {prettyLast(hud.lastCode)}</li>
            {folk.slice(0, 40).map((p) => (
              <li key={p.id} className="log-row">
                <span className="folk-pip inline-block h-[6px] w-[6px] shrink-0 rounded-full align-middle mr-1.5" style={{ background: "var(--color-accent)" }} aria-hidden />
                <span className="text-accent">{p.name.split(" ")[0]}</span>
                <span className="log-kind">{/hail|greet/i.test(p.job) ? "hailing" : /crew/i.test(p.job) ? "crew" : p.job || "at rest"}</span>
              </li>
            ))}
            {folk.length === 0 && <li className="text-muted">No folk yet. Keepers still hold the posts alone.</li>}
          </ul>
        )}
        {tab === "grown" && (
          <ul className="space-y-2">
            <li className="text-muted">{hud.folk.building > 0 ? `${hud.folk.building} going up · ` : ""}{hud.folk.walking > 0 ? `${hud.folk.walking} walking · ` : ""}{hud.structures} standing · {hud.crystal.length} crystal · last {prettyLast(hud.lastCode)}</li>
            {grown.map(([shape, n]) => {
              const law = readShape(shape);
              return (
                <li key={shape} className="log-row">
                  <span className="text-accent">{law.title}</span>
                  <span className="log-kind">{n}</span>
                  <p>
                    <span className="grow-pip inline-block h-[10px] w-[10px] shrink-0 align-middle mr-1.5" style={{ background: "var(--color-gold)", clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} aria-hidden />
                    {shape}
                  </p>
                </li>
              );
            })}
            {grown.length === 0 && <li className="text-muted">No dens named yet. Walk a keeper until crystal stands.</li>}
          </ul>
        )}
        {tab === "names" && (
          <ul className="space-y-2">
            {names.map((n, i) => {
              const who = agentById(n.keeper)?.name.split(" ")[0] || n.keeper || "Iri";
              return (
                <li key={`${n.at}-${i}`} className="log-row">
                  <span className="text-accent">{who}</span>
                  <span className="log-kind">{ago(n.at)}</span>
                  <p>
                    <span className="name-pip inline-block h-[6px] w-[6px] shrink-0 align-middle mr-1.5" style={{ background: "var(--color-gold)", clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} aria-hidden />
                    {n.text}
                  </p>
                </li>
              );
            })}
            {names.length === 0 && <li className="text-muted">Iri has not written your Howls yet. Walk Archive. Hold Howl.</li>}
          </ul>
        )}
        {tab === "ask" && (
          <div>
            {!selected && <p className="text-muted">Pick a keeper. They speak their post — not another mouth.</p>}
            {selected && (
              <form onSubmit={(e) => sendHowl(e)}>
                <p className="hud-title">{selected.name}</p>
                <p className="text-xs text-muted mb-2">{selected.role} · {left} Howls left this sit</p>
                <div className="space-y-1 mb-2 max-h-40 overflow-y-auto">
                  {chat.map((t, i) => (
                    <p key={i} className={t.role === "user" ? "text-accent" : ""}>{t.text}</p>
                  ))}
                </div>
                <input className="log-ask-input w-full min-h-11 rounded-md border border-border bg-transparent px-3" value={howl} onChange={(e) => setHowl(e.target.value)} placeholder="Howl to this mouth" />
                <button type="submit" className="log-ask-send mt-2 h-11 w-full rounded-md bg-fg text-bg font-medium" disabled={busy}>{busy ? "Listening…" : "Speak"}</button>
                <label className="mt-3 block text-xs text-muted">Your xai- key
                  <input className="log-key-input mt-1 w-full h-11 rounded-md border border-border bg-transparent px-3" value={playerKey} onChange={(e) => { onPlayerKey(e.target.value); savePlayerKey(e.target.value); }} placeholder="xai-…" />
                </label>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={cityMind} onChange={(e) => onCityMind(e.target.checked)} />
                  City mind (one brief / 90s)
                </label>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
