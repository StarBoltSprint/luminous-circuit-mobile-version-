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
                  <span className="res-label">Names</span>
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
          <p className="pointer-events-none mt-1 truncate px-1 text-[10px] uppercase tracking-[0.14em] text-muted">
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

        {playing && brief && !mapOpen && !logOpen && !joinOpen && (
          <div className="pointer-events-auto px-1 pt-1">
            <button
              type="button"
              className="hud-chip min-h-11 px-3 max-w-full"
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
              {brief.here ? `Hold Howl · ${brief.walk}` : brief.line}
            </button>
          </div>
        )}

        <div className="flex-1 relative pointer-events-none min-h-0">
          {hud.toast && !title && (
            <div className="hud-toast panel">
              <p className="hud-title">{hud.toast}</p>
            </div>
          )}
          {playing && awayOpen && hud.away && !mapOpen && !logOpen && !joinOpen && (
            <div className="nearby-card pointer-events-auto mt-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">While you were gone</p>
              <p className="hud-title mt-1">{hud.away}</p>
              <button type="button" className="hud-chip mt-2 min-h-11 px-3" onClick={() => setAwayOpen(false)}>Heard</button>
            </div>
          )}
          {hud.nearby && playing && !logOpen && !mapOpen && !joinOpen && (
            <div className="nearby-card pointer-events-auto" data-toast={hud.toast ? "true" : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="hud-title">{hud.nearby.name.split(" ")[0]}</p>
                  <p className="text-xs text-muted">{hud.nearby.role}</p>
                </div>
                <span className="text-xs text-accent">{hud.nearby.job}</span>
              </div>
              <p className="mt-2 text-sm">{hud.nearby.line}</p>
              {zoneAsk && (
                <button
                  type="button"
                  className="hud-chip mt-2 min-h-11 px-3"
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
              {hud.nearby && (
                <button
                  type="button"
                  className="hud-chip mt-2 min-h-11 px-3"
                  onClick={() => engineRef.current?.escort(hud.nearby!.id)}
                >
                  Walk with {hud.nearby.name.split(" ")[0]}
                </button>
              )}
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
                data-held={hud.howlProgress > 0.04 ? "true" : undefined}
                aria-label={howlVerb(zoneAsk?.keeper ?? null)}
                onPointerDown={(e) => { e.preventDefault(); engineRef.current?.input.setHowl(true); }}
                onPointerUp={() => engineRef.current?.input.setHowl(false)}
                onPointerCancel={() => engineRef.current?.input.setHowl(false)}
              >
                {howlVerb(zoneAsk?.keeper ?? null)}
                <span className="howl-meter" aria-hidden>
                  <span style={{ width: `${Math.max(4, Math.round((hud.howlProgress || 0) * 100))}%` }} />
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
          onPointerDown={(e) => { e.preventDefault(); landNow(); }}
          onTouchStart={(e) => { e.preventDefault(); landNow(); }}
          onClick={landNow}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 40,
            border: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px 96px",
            background: "linear-gradient(180deg, rgba(7,9,16,0.2) 0%, rgba(7,9,16,0.92) 70%)",
            color: "#e8eef8",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "auto",
            touchAction: "manipulation",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8b93a7" }}>Luminous Circuit</span>
          <span style={{ fontSize: 34, fontWeight: 800, marginTop: 8, lineHeight: 1 }}>
            {bootError ? "Tap to retry" : wantLand ? "Landing…" : "Tap to land"}
          </span>
          <span style={{ fontSize: 14, color: "#7ee8f2", marginTop: 10, marginBottom: 28 }}>
            {bootError ?? (booted ? "Core Spire is open" : wantLand ? "Growing crystal underfoot…" : "Waking the city…")}
          </span>
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-bg/55 px-4 hud-safe">
          <div className="panel w-[min(92%,24rem)] px-6 py-6">
            <h2 className="hud-title text-2xl">Paused</h2>
            <p className="mt-1 text-sm text-muted">Walkers freeze. Pause is sacred.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="h-11 rounded-lg bg-fg text-bg font-medium" onClick={() => engineRef.current?.setMode("play")}>Resume</button>
              <button type="button" className="h-11 rounded-lg border border-border text-fg" onClick={() => { engineRef.current?.reset(); engineRef.current?.setMode("play"); }}>Reland at plaza</button>
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
    <div className="absolute inset-0 z-50 flex flex-col bg-bg/95 hud-safe">
      <header className="pointer-events-auto flex items-center justify-between px-4">
        <h3 className="hud-title text-lg">City health</h3>
        <button type="button" className="hud-chip min-h-11 px-3" onClick={onClose}>Close</button>
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
