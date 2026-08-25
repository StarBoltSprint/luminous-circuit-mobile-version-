import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bug,
  Gem,
  MapPinned,
  MessageCircle,
  Pause,
  Play,
  Scale,
  ScrollText,
  Volume2,
  VolumeX,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { EngineHandle, HudSnap } from "@/game/engine";
import { briefCircuit } from "@/game/ask-agent";
import { CircuitMap } from "./CircuitMap";
import { LogSheet, type LogTab } from "./LogSheet";
import { TradingSheet } from "./TradingSheet";
import { DISTRICTS } from "@/game/lore";
import { civicForZone, civicBrief, enactCivic, howlVerb } from "@/game/civic";
import { buzz } from "@/game/haptics";
import { loadChain, needleDeg, talkWitness } from "@/game/play";

const EMPTY: HudSnap = {
  zone: null,
  zoneTag: null,
  resonance: 12,
  howls: 0,
  nearby: null,
  howlProgress: 0,
  atHub: false,
  toast: null,
  heading: 0,
  visited: [],
  talked: 0,
  talkTotal: 8,
  builds: [],
  structures: 0,
  lastCode: "",
  log: [],
  living: [],
  folk: { total: 0, walking: 0, building: 0, idle: 0 },
  px: 0,
  pz: 78,
  crystal: [],
  people: [],
  stock: { charge: 18, crystal: 6, scripture: 0, rate: 3, bids: 0, line: "" },
  live: [],
  crew: null,
  kilns: [],
  reading: null,
  mode: "title",
  debug: { fps: 0, bug: "", citizens: 0, building: 0, structures: 0 },
  away: null,
};

function Joystick({ label, onChange }: { label: string; onChange: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const release = useCallback(() => {
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);
  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(x, y);
      const nx = m > 1 ? x / m : x;
      const ny = m > 1 ? y / m : y;
      setKnob({ x: nx, y: ny });
      onChange(nx, -ny);
    },
    [onChange],
  );
  return (
    <div
      ref={ref}
      className="stick-base pointer-events-auto"
      aria-label={label}
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        moveTo(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        moveTo(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="stick-knob" style={{ transform: `translate(calc(-50% + ${knob.x * 28}px), calc(-50% + ${knob.y * 28}px))` }} />
    </div>
  );
}

function ResourceChip({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: "charge" | "crystal" | "resonance" | "scripture" }) {
  return (
    <div className={`res-chip res-${tone}`}>
      <Icon className="res-icon" strokeWidth={2.25} aria-hidden />
      <div className="res-copy">
        <span className="res-label">{label}</span>
        <span className="res-value">{Math.round(value)}</span>
      </div>
    </div>
  );
}

export function CircuitApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [hud, setHud] = useState<HudSnap>(EMPTY);
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootGen, setBootGen] = useState(0);
  const pendingLand = useRef(false);
  const [muted, setMuted] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logTab, setLogTab] = useState<LogTab>("now");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [wantLand, setWantLand] = useState(false);
  const [playerKey, setPlayerKey] = useState(loadPlayerKey);
  const [cityMind, setCityMind] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [awayOpen, setAwayOpen] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState<string | null>(null);

  useEffect(() => {
    engineRef.current?.setGrokLayer(cityMind && keyLooksValid(playerKey));
  }, [cityMind, playerKey, booted]);

  useEffect(() => {
    if (!cityMind || !keyLooksValid(playerKey) || hud.mode !== "play") return;
    let dead = false;
    let inflight = false;
    const fire = async () => {
      const eng = engineRef.current;
      if (!eng || inflight || dead) return;
      inflight = true;
      try {
        const snap = eng.mindSnap();
        const brief = await briefCircuit({ data: { ...snap, playerKey: playerKey.trim() } });
        if (!dead && brief.ok) eng.applyGrokMind(brief.line, brief.orders);
      } catch {
        /* local */
      } finally {
        inflight = false;
      }
    };
    const first = window.setTimeout(fire, 8000);
    const t = window.setInterval(fire, 90_000);
    return () => {
      dead = true;
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [cityMind, playerKey, hud.mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let handle: EngineHandle | null = null;
    const start = () => {
      import("@/game/engine")
        .then(({ startEngine }) => {
          if (disposed || !canvasRef.current) return;
          try {
            handle = startEngine(canvasRef.current, setHud);
            engineRef.current = handle;
            setBootError(null);
            setBooted(true);
            if (pendingLand.current) handle.land();
          } catch (err) {
            engineRef.current = null;
            setBooted(false);
            setBootError(err instanceof Error ? err.message : "City failed to wake.");
          }
        })
        .catch((err) => {
          if (!disposed) {
            setBooted(false);
            setBootError(err instanceof Error ? err.message : "City failed to wake.");
          }
        });
    };
    const id = window.setTimeout(start, 0);
    const watchdog = window.setTimeout(() => {
      if (!disposed && !engineRef.current) setBootError("The Core Spire is slow to wake. Tap to retry.");
    }, 20000);
    return () => {
      disposed = true;
      window.clearTimeout(id);
      window.clearTimeout(watchdog);
      handle?.dispose();
      engineRef.current = null;
    };
  }, [bootGen]);

  const onMove = useCallback((x: number, y: number) => engineRef.current?.input.setMoveStick(x, y), []);
  const onLook = useCallback((x: number, y: number) => engineRef.current?.input.setLookStick(x, y), []);
  const playing = hud.mode === "play";
  const paused = hud.mode === "pause";
  const title = !!bootError || (!wantLand && hud.mode !== "play" && hud.mode !== "pause");

  function landNow() {
    if (bootError) {
      pendingLand.current = true;
      setWantLand(false);
      setBooted(false);
      setBootError(null);
      setBootGen((n) => n + 1);
      return;
    }
    setWantLand(true);
    pendingLand.current = true;
    engineRef.current?.land();
  }

  function askDuty(keeper: string) {
    const eng = engineRef.current;
    if (!eng) return;
    const den = DISTRICTS.find((d) => d.keeper === keeper);
    const x = den?.x ?? hud.px;
    const z = den?.z ?? hud.pz;
    const job = enactCivic(keeper, x, z);
    if (!job.pieces.length) return;
    eng.grow(keeper, job.pieces, job.line, job.code);
    try { eng.audio.grow(); } catch { /* samsung */ }
    buzz("grow");
  }

  const zoneAsk = civicForZone(hud.zone);
  const brief = civicBrief(hud.stock ?? { charge: 0, crystal: 0, scripture: 0, bids: 0 }, hud.zone);
  const need = (brief.line.split(".")[0] || brief.line).trim();
  const walkLine = brief.here ? "Hold Howl, release on gold" : `Walk ${brief.walk}`;
  const stood = Math.max(0, Math.floor(Number((hud as { stood?: number }).stood) || 0));
  const howlP = hud.howlProgress || 0;
  const howlSweet = howlP >= 0.92 && howlP <= 1.18;
  const howlOver = howlP > 1.18;
  const den = DISTRICTS.find((d) => d.id === brief.zoneId);
  const dutyDeg = needleDeg(hud.px, hud.pz, den?.x ?? 0, den?.z ?? 0, hud.heading);
  const dutyNear = Boolean(brief.here) || Math.abs(dutyDeg) < 18;
  const witnessed = Boolean((hud as { witness?: boolean }).witness) || talkWitness(hud.nearby?.id ?? null, brief.keeper);
  const still = (hud as { still?: boolean }).still;
  const standStill = Boolean(brief.here && howlP > 0.04 && !still);
  const talkFirst = Boolean(brief.here && hud.nearby?.id === brief.keeper && !witnessed);
  const howlThis = brief.here && walkLine && hud.reading?.title ? `Howl this ${hud.reading.title}` : null;
  const hintLines: string[] = [];
  if (standStill) hintLines.push("Stand still");
  if (talkFirst) hintLines.push("Talk, then Howl — they will know you.");
  if (howlThis && hintLines.length < 2) hintLines.push(howlThis);
  const onChain = brief.keeper === "seln" || brief.keeper === "orren" || brief.keeper === "voss";
  if (!brief.here && onChain && hintLines.length < 2) {
    const need = ["seln", "orren", "voss"] as const;
    let i = 0;
    for (const s of loadChain()) {
      if (i < need.length && s === need[i]) i += 1;
    }
    const chainHint = i < 1 ? "Sit: Tend → Kiln → Join" : i < 2 ? "Next: Kiln" : i < 3 ? "Next: Join" : "";
    if (chainHint) hintLines.push(chainHint);
  }

  return (
    <div className="circuit-root" style={{ position: "relative", width: "100%", height: "100dvh", background: "#070910" }}>
      <canvas
        ref={canvasRef}
        className="circuit-canvas z-0"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", background: "#020308", touchAction: "none" }}
      />

      <div className="pointer-events-none absolute inset-0 z-10 hud-safe flex flex-col">
        {!title && (
          <header className="pointer-events-none flex items-start justify-between gap-2">
            <div className="hud-resources min-w-0 flex-1">
              <ResourceChip icon={Zap} label="Charge" value={hud.stock?.charge ?? 0} tone="charge" />
              <ResourceChip icon={Gem} label="Crystal" value={hud.stock?.crystal ?? 0} tone="crystal" />
              <button
                type="button"
                className="res-chip res-scripture pointer-events-auto"
                onClick={() => { setMapOpen(false); setJoinOpen(false); setLogTab("names"); setLogOpen(true); }}
              >
                <BookOpen className="res-icon" strokeWidth={2.25} aria-hidden />
                <div className="res-copy">
                  <span className="res-label">
                    Names
                    {stood > 0 ? (
                      <span className="ml-1 normal-case tracking-[0.06em] text-[9px] font-semibold text-gold">
                        Stood {stood}
                      </span>
                    ) : null}
                  </span>
                  <span className="res-value">{Math.round(hud.stock?.scripture ?? 0)}</span>
                </div>
              </button>
            </div>
            <div className="hud-tools">
              <button type="button" className="hud-icon" aria-label="Open map" onClick={() => { setLogOpen(false); setJoinOpen(false); setMapOpen((v) => !v); }}>
                <MapPinned className="size-4" />
              </button>
              <button type="button" className="hud-icon" aria-label="Open log" onClick={() => { setMapOpen(false); setJoinOpen(false); setLogOpen((v) => !v); }}>
                <ScrollText className="size-4" />
              </button>
              <button type="button" className="hud-icon" aria-label="Open Trading Place" onClick={() => { setMapOpen(false); setLogOpen(false); setJoinOpen((v) => !v); }}>
                <Scale className="size-4" />
              </button>
              <button type="button" className="hud-icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => { const next = !muted; setMuted(next); engineRef.current?.audio.setMuted(next); }}>
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button type="button" className="hud-icon hud-icon-play" aria-label="Pause" onClick={() => engineRef.current?.setMode(playing ? "pause" : "play")}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" className="hud-icon" aria-label="Debug" onClick={() => setDebugOpen((v) => !v)}>
                <Bug className="size-4" />
              </button>
            </div>
          </header>
        )}

        {!title && (hud.zone || hud.stock?.line) && (
          <p className="hud-ticker hud-ticker-live" aria-live="polite">
            {hud.zone ?? "The Circuit"}
            {hud.stock?.line ? ` · ${hud.stock.line}` : ""}
            {` · ${hud.stock?.rate ?? 3}C/X`}
          </p>
        )}

        {playing && hud.reading && !mapOpen && !logOpen && !joinOpen && (
          <p className="hud-reading">
            <span className="text-fg">{hud.reading.title}</span>
            {" — "}
            {hud.reading.means}
          </p>
        )}

        {playing && !mapOpen && !logOpen && !joinOpen && (
          <div className="px-1 pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="hud-chip hud-duty pointer-events-auto min-h-11 min-w-0 flex-1 flex-col items-start justify-center gap-0 py-2 text-left"
                data-near={dutyNear ? "true" : undefined}
                aria-label={`${need}. ${walkLine}`}
                onClick={() => {
                  if (brief.here) {
                    if (brief.join) setJoinOpen(true);
                    return;
                  }
                  setLogOpen(false);
                  setJoinOpen(false);
                  setMapFocus(brief.zoneId);
                  setMapOpen(true);
                }}
              >
                <span className="hud-title block text-[13px] leading-tight">{need}</span>
                <span className="block text-[11px] font-semibold tracking-wide text-accent">{walkLine}</span>
              </button>
              {!brief.here && (
                <span className="duty-needle" data-near={Math.abs(dutyDeg) < 18 ? "true" : undefined} aria-hidden style={{ transform: `rotate(${dutyDeg}deg)` }} />
              )}
            </div>
            {hintLines.map((line) => (
              <p key={line} className="hint-still">{line}</p>
            ))}
          </div>
        )}

        <div className="flex-1 relative pointer-events-none min-h-0">
          {hud.toast && !title && (
            <div className="hud-toast panel">
              <p className="hud-title">{hud.toast}</p>
            </div>
          )}
          {playing && awayOpen && hud.away && !mapOpen && !logOpen && !joinOpen && (
            <div className="nearby-card">
              <p className="nearby-name">While you were gone</p>
              <p className="nearby-line">{hud.away}</p>
              <button type="button" className="nearby-ask" onClick={() => setAwayOpen(false)}>Heard</button>
            </div>
          )}
          {hud.nearby && playing && !logOpen && !mapOpen && !joinOpen && (
            <div className="nearby-card" data-toast={hud.toast ? "true" : undefined}>
              <p className="nearby-name">{hud.nearby.name.split(" ")[0]}</p>
              <span className="nearby-job">{hud.nearby.job}</span>
              <p className="nearby-line">{hud.nearby.line}</p>
              <button
                type="button"
                className="nearby-ask"
                onPointerDown={(e) => { e.preventDefault(); engineRef.current?.input.setTalkHeld(true); }}
                onPointerUp={() => engineRef.current?.input.setTalkHeld(false)}
                onPointerCancel={() => engineRef.current?.input.setTalkHeld(false)}
              >
                Talk
              </button>
              {zoneAsk && (
                <button
                  type="button"
                  className="nearby-ask"
                  onClick={() => {
                    if (zoneAsk.join) {
                      setMapOpen(false);
                      setLogOpen(false);
                      setJoinOpen(true);
                    }
                    askDuty(zoneAsk.keeper);
                  }}
                >
                  {zoneAsk.label}
                </button>
              )}
              <button
                type="button"
                className="nearby-ask"
                onClick={() => engineRef.current?.escort(hud.nearby!.id)}
              >
                Walk with {hud.nearby.name.split(" ")[0]}
              </button>
            </div>
          )}
        </div>

        {playing && !mapOpen && !logOpen && !joinOpen && (
          <footer className="hud-dock pointer-events-none">
            <Joystick label="Move" onChange={onMove} />
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <button
                type="button"
                className="action-talk"
                onPointerDown={(e) => { e.preventDefault(); engineRef.current?.input.setTalkHeld(true); }}
                onPointerUp={() => engineRef.current?.input.setTalkHeld(false)}
                onPointerCancel={() => engineRef.current?.input.setTalkHeld(false)}
              >
                <MessageCircle className="size-4" />
                Talk
              </button>
              <button
                type="button"
                className="action-howl"
                data-held={howlP > 0.04 ? "true" : undefined}
                data-sweet={howlSweet ? "true" : undefined}
                aria-label={howlVerb(zoneAsk?.keeper ?? null)}
                onPointerDown={(e) => { e.preventDefault(); engineRef.current?.input.setHowl(true); }}
                onPointerUp={() => engineRef.current?.input.setHowl(false)}
                onPointerCancel={() => engineRef.current?.input.setHowl(false)}
              >
                {howlVerb(zoneAsk?.keeper ?? null)}
                {witnessed ? (
                  <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-gold">Witnessed</span>
                ) : null}
                <span
                  className="howl-meter"
                  data-sweet={howlSweet ? "true" : undefined}
                  data-over={howlOver ? "true" : undefined}
                  aria-hidden
                >
                  <span style={{ width: `${howlP <= 0.01 ? 0 : Math.min(100, Math.max(4, Math.round(howlP * 100)))}%` }} />
                </span>
              </button>
            </div>
            <Joystick label="Look" onChange={onLook} />
          </footer>
        )}
      </div>


      {title && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Land in Core Spire City"
          className="title-land"
          onPointerDown={(e) => { e.preventDefault(); landNow(); }}
          onTouchStart={(e) => { e.preventDefault(); landNow(); }}
          onClick={landNow}
        >
          <span className="title-kicker">Luminous Circuit</span>
          <span className="title-hero">
            {bootError ? "Tap to retry" : wantLand ? "Landing…" : "Tap to land"}
          </span>
          <span className="title-sub">
            {bootError ?? (booted ? "Core Spire is open" : wantLand ? "Growing crystal underfoot…" : "Waking the city…")}
          </span>
        </div>
      )}

      {paused && (
        <div className="pause-veil">
          <div className="pause-sheet">
            <div className="panel w-[min(92%,24rem)] px-6 py-6">
              <h2 className="hud-title text-2xl">Paused</h2>
              <p className="mt-1 text-sm text-muted">Walkers freeze. Pause is sacred.</p>
              <div className="mt-5 flex flex-col gap-2">
                <button type="button" className="hud-chip h-11 rounded-lg bg-fg text-bg font-medium" onClick={() => engineRef.current?.setMode("play")}>Resume</button>
                <button type="button" className="hud-chip pause-reland h-11 rounded-lg border border-border text-fg" onClick={() => { engineRef.current?.reset(); engineRef.current?.setMode("play"); }}>Reland at plaza</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mapOpen && !title && (
        <CircuitMap
          hud={hud}
          focusId={mapFocus}
          onClose={() => { setMapOpen(false); setMapFocus(null); }}
          onDuty={(id) => {
            askDuty(id);
            setMapOpen(false);
            setMapFocus(null);
          }}
          onJoin={() => {
            setMapOpen(false);
            setMapFocus(null);
            setJoinOpen(true);
          }}
        />
      )}
      {logOpen && !title && (
        <LogSheet
          hud={hud}
          tab={logTab}
          onTab={setLogTab}
          selectedId={agentId}
          onSelect={setAgentId}
          onClose={() => setLogOpen(false)}
          playerKey={playerKey}
          onPlayerKey={setPlayerKey}
          cityMind={cityMind}
          onCityMind={setCityMind}
          onGrow={(id, pieces, line, code) => engineRef.current?.grow(id, pieces, line, code)}
          onSpeak={(id, line) => engineRef.current?.speak(id, line)}
        />
      )}
      {joinOpen && !title && (
        <TradingSheet hud={hud} onClose={() => setJoinOpen(false)} onDuty={() => askDuty("voss")} />
      )}
      {debugOpen && !title && <DebugSheet hud={hud} onClose={() => setDebugOpen(false)} />}
    </div>
  );
}

function DebugSheet({ hud, onClose }: { hud: HudSnap; onClose: () => void }) {
  const d = hud.debug ?? { fps: 0, bug: "", citizens: 0, building: 0, structures: 0 };
  return (
    <div className="debug-sheet absolute inset-0 z-50 flex flex-col bg-bg/95 hud-safe">
      <header className="pointer-events-auto flex items-center justify-between px-4">
        <h3 className="hud-title text-lg">City health</h3>
        <button type="button" className="debug-close hud-chip min-h-11 px-3" onClick={onClose}>Close</button>
      </header>
      <div className="pointer-events-auto px-4 text-sm">
        <p className={d.bug ? "text-danger" : "text-accent"}>{d.bug || "No crash. Loop is holding."}</p>
        <p className="mt-2 text-muted">FPS {d.fps} · {d.citizens} inhabitants · {d.building} growing · {d.structures} standing</p>
      </div>
    </div>
  );
}

const KEY_STORE = "lc-player-xai";
function loadPlayerKey() {
  try { return String(localStorage.getItem(KEY_STORE) ?? ""); } catch { return ""; }
}
function keyLooksValid(k: string) {
  return /^xai-[A-Za-z0-9_-]{16,}$/.test(k.trim());
}
