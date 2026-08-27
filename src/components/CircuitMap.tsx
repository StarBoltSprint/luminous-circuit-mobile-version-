import { useMemo, useState, useEffect, type ReactNode } from "react";
import { CITIZENS, DISTRICTS, type District } from "@/game/lore";
import { readShape } from "@/game/build-spec";
import { civicBrief, civicForKeeper } from "@/game/civic";
import type { HudSnap } from "@/game/engine";

const RANGE = 1400;
const MAP_W = 720;
const MAP_H = 740;
const CX = MAP_W / 2;
const CY = 400;
const SCALE = MAP_W * 0.38;
const LABEL_GAP = 28;
const SCALE_U = 200;
/** Diamond rule: hud.crystal → 4px gold diamonds, opacity 0.7, cap 48, pointer-events none. */
const DIAMOND_CAP = 48;
const DIAMOND_PX = 4;

function mx(x: number) {
  return CX + (x / RANGE) * SCALE;
}
function mz(z: number) {
  return CY + (z / RANGE) * SCALE;
}
function diamondPts(x: number, y: number) {
  const h = DIAMOND_PX / 2;
  return `${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`;
}
function CrystalDiamonds({
  pieces,
  at,
}: {
  pieces: { x: number; z: number }[];
  at: (x: number, z: number) => { x: number; y: number };
}) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {pieces.slice(-DIAMOND_CAP).map((p, i) => {
        const { x, y } = at(p.x, p.z);
        return <polygon key={`xd-${i}`} points={diamondPts(x, y)} className="map-gold" opacity={0.7} />;
      })}
    </g>
  );
}
function shortLabel(d: District) {
  if (d.id === "zone-market") return "Join";
  if (d.id === "zone-terrace") return "Terraces";
  if (d.id === "zone-canal") return "Canals";
  if (d.id === "zone-foundry") return "Foundry";
  if (d.id === "zone-gate") return "Gates";
  if (d.id === "zone-archive") return "Archive";
  if (d.id === "zone-overlook") return "Overlook";
  if (d.id === "zone-bridge") return "Light-Bridge";
  if (d.id === "zone-grove") return "Orchard";
  if (d.id === "zone-wild") return "Wild Veins";
  if (d.id === "zone-beacon") return "Beacon";
  if (d.id === "zone-ring") return "Howl Ring";
  return d.label.replace(" Ward", "");
}
type WardMark = {
  id: string;
  d: District;
  x: number;
  y: number;
  r: number;
  lx: number;
  ly: number;
  name: string;
  hub: number;
  hit: number;
};
function markFor(d: District): WardMark {
  const x = mx(d.x);
  const y = mz(d.z);
  const r = Math.max(22, (d.radius / RANGE) * SCALE);
  const ang = Math.atan2(d.z, d.x || 0.01);
  const lx = x + Math.cos(ang) * (r + 16);
  const ly = y + Math.sin(ang) * (r + 14);
  return {
    id: d.id,
    d,
    x,
    y,
    r,
    lx,
    ly,
    name: shortLabel(d),
    hub: Math.hypot(d.x, d.z),
    hit: Math.max(r + 8, 36),
  };
}
function labelHalfW(name: string) {
  return Math.max(LABEL_GAP / 2, name.length * 3.6);
}
function labelsWithin28(a: WardMark, b: WardMark) {
  const anchor = Math.hypot(a.lx - b.lx, a.ly - b.ly);
  if (anchor < LABEL_GAP) return true;
  const dx = Math.abs(a.lx - b.lx) - (labelHalfW(a.name) + labelHalfW(b.name));
  const dy = Math.abs(a.ly - b.ly) - LABEL_GAP;
  const gap = Math.hypot(Math.max(0, dx), Math.max(0, dy));
  return gap < LABEL_GAP;
}
function hiddenFarLabels(marks: WardMark[]) {
  const hide = new Set<string>();
  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      const a = marks[i];
      const b = marks[j];
      if (!labelsWithin28(a, b)) continue;
      hide.add(a.hub >= b.hub ? a.id : b.id);
    }
  }
  return hide;
}
function MapCompass() {
  const x = MAP_W - 34;
  const y = 40;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <line x1={x} y1={y + 11} x2={x} y2={y - 9} className="map-scale" />
      <polygon
        points={`${x},${y - 14} ${x + 3.4},${y - 3} ${x - 3.4},${y - 3}`}
        className="map-gold"
      />
      <text x={x} y={y - 18} textAnchor="middle" className="map-caption">
        N
      </text>
    </g>
  );
}
function MapScaleBar() {
  const len = (SCALE_U / RANGE) * SCALE;
  const x = 22;
  const y = MAP_H - 26;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <line x1={x} y1={y} x2={x + len} y2={y} className="map-scale" />
      <line x1={x} y1={y - 3.5} x2={x} y2={y + 3.5} className="map-scale" />
      <line x1={x + len} y1={y - 3.5} x2={x + len} y2={y + 3.5} className="map-scale" />
      <text x={x + len / 2} y={y - 8} textAnchor="middle" className="map-caption">
        200u
      </text>
    </g>
  );
}
function keeperName(id: string) {
  return CITIZENS.find((c) => c.id === id)?.name.split(" ")[0] ?? id;
}
function inWard(x: number, z: number, d: District) {
  return Math.hypot(x - d.x, z - d.z) <= d.radius + 36;
}
function isRaiseShape(shape: string) {
  return shape === "kiln" || shape === "grove" || shape === "bridge" || shape === "arch" || shape === "beacon" || shape === "vein" || shape === "disc" || shape === "cascade" || shape === "weir" || shape === "font" || shape === "cradle" || shape === "tablet" || shape === "stele" || shape === "orbit" || shape === "veil" || shape === "lens" || shape === "bough" || shape === "lamp" || shape === "pad" || shape === "inlay" || shape === "hearth" || shape === "terrace" || shape === "spire" || shape === "ring" || shape === "well" || shape === "mosaic" || shape === "canal" || shape === "bell" || shape === "anvil" || shape === "forge" || shape === "sluice" || shape === "prism" || shape === "grate" || shape === "chimney" || shape === "basin" || shape === "dais" || shape === "post" || shape === "cairn" || shape === "slab" || shape === "stone" || shape === "ledge" || shape === "notch" || shape === "rib" || shape === "lintel" || shape === "pier" || shape === "stall";
}
function isGrowJob(job: string) {
  const j = job.toLowerCase();
  return j.includes("grow") || j.includes("build") || j.includes("forge");
}
function isWalkJob(job: string) {
  const j = job.toLowerCase();
  return j.includes("walk") || j.includes("hail") || j.includes("watch");
}
function foreignWard(x: number, z: number, id: string) {
  return DISTRICTS.some((d) => d.keeper !== id && Math.hypot(x - d.x, z - d.z) < d.radius * 0.65);
}
function prettyLast(code: string) {
  if (!code) return "";
  const m = /Build\.(\w+)/i.exec(code) || /^([A-Za-z][\w-]*)/.exec(code);
  const shape = (m?.[1] || "").toLowerCase();
  if (!shape) return "";
  return readShape(shape).title || shape;
}
function raiseHalo(x: number, y: number, s: number) {
  return (
    <circle
      cx={x}
      cy={y}
      r={Math.max(5.2, 6.8 * s)}
      className="map-raise"
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    />
  );
}
function withRaise(shape: string, x: number, y: number, s: number, node: ReactNode) {
  if (!isRaiseShape(shape)) return node;
  return (
    <g>
      {raiseHalo(x, y, s)}
      {node}
    </g>
  );
}
function buildClass(shape: string) {
  if (shape === "kiln" || shape === "hearth") return "map-gold";
  if (shape === "grove" || shape === "bough") return "map-gold";
  if (shape === "tablet" || shape === "stele" || shape === "beacon") return "fill-gold";
  if (shape === "arch" || shape === "ring" || shape === "bell") return "map-violet";
  return "map-cyan";
}

/** Unique wash per DISTRICTS kind — opacity + pattern, not a shared gray. */
const WARD_WASH_OPACITY: Record<District["kind"], number> = {
  canal: 0.92,
  foundry: 0.9,
  grove: 0.94,
  bridge: 0.78,
  terrace: 0.86,
  gate: 0.8,
  archive: 0.76,
  overlook: 0.74,
  market: 0.84,
  wild: 0.7,
  beacon: 0.88,
  ring: 0.82,
};

function wardWashUrl(kind: District["kind"], prefix = "ward") {
  return `url(#${prefix}-wash-${kind})`;
}

function WardWashDefs({ prefix = "ward" }: { prefix?: string }) {
  const id = (kind: District["kind"]) => `${prefix}-wash-${kind}`;
  return (
    <>
      <pattern id={id("canal")} patternUnits="userSpaceOnUse" width="12" height="8">
        <rect width="12" height="8" fill="#5ec8d4" fillOpacity="0.2" />
        <path d="M0 4 Q3 1.2 6 4 T12 4" fill="none" stroke="#7ee8f2" strokeWidth="0.85" opacity="0.42" />
      </pattern>
      <pattern id={id("foundry")} patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#d4b46a" fillOpacity="0.22" />
        <path d="M-1 9 L9 -1" stroke="#e8c87a" strokeWidth="0.75" opacity="0.4" />
        <path d="M-1 5 L5 -1" stroke="#c49a4a" strokeWidth="0.5" opacity="0.28" />
      </pattern>
      <pattern id={id("grove")} patternUnits="userSpaceOnUse" width="11" height="11">
        <rect width="11" height="11" fill="#163528" fillOpacity="0.42" />
        <circle cx="3.2" cy="3.4" r="1.6" fill="#1f4630" opacity="0.7" />
        <circle cx="8.2" cy="7.4" r="2" fill="#244f36" opacity="0.55" />
      </pattern>
      <pattern id={id("bridge")} patternUnits="userSpaceOnUse" width="14" height="8">
        <rect width="14" height="8" fill="#4aa8b8" fillOpacity="0.12" />
        <path d="M0 4 H6 M8 4 H14" stroke="#7ee8f2" strokeWidth="0.7" opacity="0.38" />
      </pattern>
      <pattern id={id("terrace")} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#9b70ff" fillOpacity="0.16" />
        <path d="M0 3 H10 M0 7 H10" stroke="#b89cff" strokeWidth="0.55" opacity="0.32" />
      </pattern>
      <pattern id={id("gate")} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#6b50b8" fillOpacity="0.13" />
        <path d="M3 0 V10 M7 0 V10" stroke="#9b70ff" strokeWidth="0.7" opacity="0.34" />
      </pattern>
      <pattern id={id("archive")} patternUnits="userSpaceOnUse" width="9" height="10">
        <rect width="9" height="10" fill="#c4a878" fillOpacity="0.11" />
        <path d="M2 1 V9 M5 1.5 V8.5 M8 1 V9" stroke="#d4b46a" strokeWidth="0.7" opacity="0.36" />
      </pattern>
      <pattern id={id("overlook")} patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="#b8a050" fillOpacity="0.1" />
        <circle cx="6" cy="6" r="1.1" fill="#d4b46a" opacity="0.45" />
        <circle cx="1.5" cy="2" r="0.6" fill="#e8d090" opacity="0.35" />
      </pattern>
      <pattern id={id("market")} patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#d4b46a" fillOpacity="0.1" />
        <rect x="0" y="0" width="4" height="4" fill="#7ee8f2" fillOpacity="0.1" />
        <rect x="4" y="4" width="4" height="4" fill="#d4b46a" fillOpacity="0.14" />
      </pattern>
      <pattern id={id("wild")} patternUnits="userSpaceOnUse" width="12" height="10">
        <rect width="12" height="10" fill="#2a4a3c" fillOpacity="0.12" />
        <path d="M0 7 C3 1 6 9 12 3" fill="none" stroke="#3d6b58" strokeWidth="0.8" opacity="0.4" strokeDasharray="3 2" />
      </pattern>
      <pattern id={id("beacon")} patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="#e8d090" fillOpacity="0.14" />
        <path d="M6 1 V11 M1 6 H11" stroke="#d4b46a" strokeWidth="0.55" opacity="0.38" />
      </pattern>
      <pattern id={id("ring")} patternUnits="userSpaceOnUse" width="12" height="12">
        <rect width="12" height="12" fill="#8a6cff" fillOpacity="0.11" />
        <circle cx="6" cy="6" r="3.4" fill="none" stroke="#9b70ff" strokeWidth="0.7" opacity="0.4" />
      </pattern>
    </>
  );
}

function BuildMark({ x, y, shape, s = 1 }: { x: number; y: number; shape: string; s?: number }) {
  const k = buildClass(shape);
  if (shape === "kiln") {
    return withRaise(shape, x, y, s, <rect x={x - 2.2 * s} y={y - 6 * s} width={4.4 * s} height={9 * s} rx={0.6} className="map-gold" />);
  }
  if (shape === "canal" || shape === "weir" || shape === "cascade") {
    return withRaise(shape, x, y, s, <rect x={x - 7 * s} y={y - 1.2 * s} width={14 * s} height={2.4 * s} rx={1.2} className="map-cyan" opacity={0.85} />);
  }
  if (shape === "bridge") {
    return withRaise(
      shape,
      x,
      y,
      s,
      <rect x={x - 8 * s} y={y - 1.4 * s} width={16 * s} height={2.8 * s} rx={1} className="map-cyan" transform={`rotate(35 ${x} ${y})`} />,
    );
  }
  if (shape === "arch") {
    return withRaise(shape, x, y, s, <path d={`M${x - 6 * s} ${y + 3 * s} Q${x} ${y - 8 * s} ${x + 6 * s} ${y + 3 * s}`} className="map-stroke" />);
  }
  if (shape === "grove") {
    return withRaise(shape, x, y, s, <circle cx={x} cy={y} r={3.6 * s} className="map-gold" opacity={0.7} />);
  }
  if (shape === "bough") return <circle cx={x} cy={y} r={3.6 * s} className="map-gold" opacity={0.7} />;
  if (shape === "tablet" || shape === "stele") return withRaise(shape, x, y, s, <rect x={x - 1.2 * s} y={y - 5 * s} width={2.4 * s} height={9 * s} rx={0.4} className="fill-gold" />);
  if (shape === "beacon") {
    return withRaise(shape, x, y, s, <polygon points={`${x},${y - 7 * s} ${x + 2.4 * s},${y + 3 * s} ${x - 2.4 * s},${y + 3 * s}`} className="map-gold" />);
  }
  if (shape === "terrace" || shape === "pad" || shape === "disc") return withRaise(shape, x, y, s, <ellipse cx={x} cy={y} rx={5 * s} ry={2.4 * s} className="map-soft" />);
  if (shape === "house") return <rect x={x - 3 * s} y={y - 3 * s} width={6 * s} height={6 * s} rx={0.8} className={k} />;
  if (shape === "lamp") return <circle cx={x} cy={y} r={1.6 * s} className="map-lamp" />;
  if (shape === "ring" || shape === "orbit") return <circle cx={x} cy={y} r={4.2 * s} className="map-stroke" />;
  if (shape === "spire") return <polygon points={`${x},${y - 8 * s} ${x + 2.6 * s},${y + 3 * s} ${x - 2.6 * s},${y + 3 * s}`} className="map-cyan" />;
  return withRaise(shape, x, y, s, <circle cx={x} cy={y} r={2.1 * s} className={k} />);
}

function WardGlyph({ d, x, y, r }: { d: District; x: number; y: number; r: number }) {
  const k = d.kind;
  if (k === "canal") {
    return (
      <>
        <path d={`M${x - r * 0.7} ${y} Q${x} ${y - r * 0.35} ${x + r * 0.7} ${y}`} className="map-ward-art" />
        <path d={`M${x - r * 0.55} ${y + 6} Q${x} ${y - r * 0.18} ${x + r * 0.55} ${y + 6}`} className="map-ward-art" />
      </>
    );
  }
  if (k === "foundry") {
    return <rect x={x - 7} y={y - 11} width={14} height={18} rx={2} className="map-foundry-mark" />;
  }
  if (k === "bridge") {
    return <path d={`M${x - r * 0.55} ${y + 4} Q${x} ${y - r * 0.4} ${x + r * 0.55} ${y + 4}`} className="map-ward-art" />;
  }
  if (k === "terrace") {
    return (
      <>
        <ellipse cx={x} cy={y + 2} rx={r * 0.55} ry={r * 0.22} className="map-terrace-ring" />
        <ellipse cx={x} cy={y - 4} rx={r * 0.38} ry={r * 0.14} className="map-terrace-ring" />
      </>
    );
  }
  if (k === "gate") {
    return <path d={`M${x - 10} ${y + 8} Q${x} ${y - 14} ${x + 10} ${y + 8}`} className="map-ward-art" />;
  }
  if (k === "archive") {
    return (
      <>
        <rect x={x - 8} y={y - 8} width={4} height={14} rx={0.6} className="map-foundry-mark" />
        <rect x={x - 2} y={y - 10} width={4} height={16} rx={0.6} className="map-foundry-mark" />
        <rect x={x + 4} y={y - 7} width={4} height={13} rx={0.6} className="map-foundry-mark" />
      </>
    );
  }
  if (k === "overlook") {
    return <circle cx={x} cy={y} r={6} className="map-stroke-gold" />;
  }
  if (k === "market") {
    return <polygon points={`${x},${y - 8} ${x + 8},${y + 5} ${x - 8},${y + 5}`} className="map-foundry-mark" />;
  }
  if (k === "wild") {
    return <path d={`M${x - 10} ${y + 6} C${x - 4} ${y - 10}, ${x + 4} ${y + 12}, ${x + 10} ${y - 4}`} className="map-ward-art" />;
  }
  if (k === "beacon") {
    return <polygon points={`${x},${y - 12} ${x + 4},${y + 6} ${x - 4},${y + 6}`} className="map-foundry-mark" />;
  }
  if (k === "ring") {
    return <circle cx={x} cy={y} r={r * 0.42} className="map-plaza" />;
  }
  if (k === "grove") {
    return (
      <>
        <circle cx={x - 6} cy={y + 2} r={6} className="map-foundry-mark" />
        <circle cx={x + 5} cy={y - 3} r={7} className="map-foundry-mark" />
      </>
    );
  }
  return <circle cx={x} cy={y} r={5} className="map-core" />;
}

function YouMark({ x, y, label = true }: { x: number; y: number; label?: boolean }) {
  return (
    <g aria-label="You">
      <title>You</title>
      <circle cx={x} cy={y} r="16" className="map-you-halo" />
      <circle cx={x} cy={y} r="11" className="map-you-ring" />
      <circle cx={x} cy={y} r="11" className="map-you-ring map-you-ring-late" />
      <circle cx={x} cy={y} r="4.5" className="map-you-dot" />
      {label && (
        <text x={x} y={y - 18} textAnchor="middle" className="map-you-label">
          You
        </text>
      )}
    </g>
  );
}

export function CircuitMap({
  hud,
  onClose,
  onDuty,
  onJoin,
  focusId,
}: {
  hud: HudSnap;
  onClose: () => void;
  onDuty?: (keeper: string) => void;
  onJoin?: () => void;
  focusId?: string | null;
}) {
  const [zoneId, setZoneId] = useState<string | null>(focusId ?? null);
  useEffect(() => {
    if (focusId) setZoneId(focusId);
  }, [focusId]);
  const zone = DISTRICTS.find((d) => d.id === zoneId) ?? null;
  const wards = useMemo(() => DISTRICTS.map(markFor), []);
  const quietLabels = useMemo(() => hiddenFarLabels(wards), [wards]);
  const brief = civicBrief(hud.stock, hud.zone);
  const den = DISTRICTS.find((d) => d.id === brief.zoneId);
  const dutyX = den?.x ?? 0;
  const dutyZ = den?.z ?? 0;
  const pathKeeper = hud.people.find((p) => p.keeper && p.id === brief.keeper);
  const keeperPath =
    !brief.here && pathKeeper
      ? (() => {
          const x1 = mx(pathKeeper.x);
          const y1 = mz(pathKeeper.z);
          const x3 = mx(dutyX);
          const y3 = mz(dutyZ);
          const x2 = (x1 + x3) / 2 + (CX - (x1 + x3) / 2) * 0.32;
          const y2 = (y1 + y3) / 2 + (CY - (y1 + y3) / 2) * 0.32;
          return `${x1},${y1} ${x2},${y2} ${x3},${y3}`;
        })()
      : null;

  const stars = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 48; i++) {
      out.push({ x: (i * 97) % MAP_W, y: (i * 137) % MAP_H, r: 0.6 + (i % 3) * 0.35 });
    }
    return out;
  }, []);

  return (
    <div className="sheet map-sheet absolute inset-0 z-40 flex flex-col bg-bg hud-safe" role="dialog" aria-modal="true" aria-label="Circuit map">
      <header className="sheet-head pointer-events-auto">
        <div>
          <p className="sheet-kicker">Living circuit{prettyLast(hud.lastCode) ? ` · last ${prettyLast(hud.lastCode)}` : ""}</p>
          <h3 className="sheet-title">Circuit map</h3>
        </div>
        <button type="button" className="map-close min-h-11" aria-label="Close map" title="Close map" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="map-stage">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" className="map-canvas">
          <defs>
            <radialGradient id="map-void" cx="50%" cy="42%" r="70%">
              <stop offset="0%" stopColor="#0c1420" />
              <stop offset="100%" stopColor="#070910" />
            </radialGradient>
            <WardWashDefs prefix="ward" />
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#map-void)" />
          {stars.map((s, i) => (
            <circle key={`st-${i}`} cx={s.x} cy={s.y} r={s.r} className="map-star-dot" />
          ))}
          <g>
            <line x1={CX} y1="36" x2={CX} y2="78" className="map-star-ray" />
            <circle cx={CX} cy="36" r="7" className="map-gold" />
            <text x={CX} y="22" textAnchor="middle" className="map-caption">
              Star Core
            </text>
          </g>
          <circle cx={CX} cy={CY} r="210" className="map-ring" />
          <circle cx={CX} cy={CY} r="128" className="map-ring" />
          <circle cx={CX} cy={CY} r="58" className="map-plaza" />
          {DISTRICTS.map((d) => (
            <path
              key={`ave-${d.id}`}
              d={`M${CX} ${CY} Q${(CX + mx(d.x)) / 2} ${(CY + mz(d.z)) / 2 - 18} ${mx(d.x)} ${mz(d.z)}`}
              className="map-avenue"
            />
          ))}
          <path d={`M${mx(-620)} ${mz(96)} Q${CX - 80} ${CY - 40} ${mx(70)} ${mz(-680)}`} className="map-river-glow" />
          <path d={`M${mx(-620)} ${mz(96)} Q${CX - 80} ${CY - 40} ${mx(70)} ${mz(-680)}`} className="map-river" />
          <circle cx={CX} cy={CY} r="18" className="map-gold" opacity={0.25} />
          <circle cx={CX} cy={CY} r="12" className="map-gold" opacity={0.4} />
          <circle cx={CX} cy={CY} r="6" className="map-gold" opacity={0.7} />
          <polygon points={`${CX},${CY - 28} ${CX + 8},${CY + 10} ${CX - 8},${CY + 10}`} className="map-cyan" />
          <text x={CX} y={CY + 48} textAnchor="middle" className="map-hub-name">
            Core Spire
          </text>
          {wards.map((m) => (
            <g key={m.id}>
              <circle
                cx={m.x}
                cy={m.y}
                r={m.r}
                className={`map-ward map-ward-${m.d.kind}`}
                style={{ fill: wardWashUrl(m.d.kind), fillOpacity: WARD_WASH_OPACITY[m.d.kind] }}
              />
              {(hud.zone === m.id || hud.zone === m.d.label) && (
                <circle cx={m.x} cy={m.y} r={m.r + 2} className="map-stroke" />
              )}
              <WardGlyph d={m.d} x={m.x} y={m.y} r={m.r} />
              {!quietLabels.has(m.id) && hud.zone !== m.id && hud.zone !== m.d.label && (
                <text x={m.lx} y={m.ly} textAnchor="middle" className="map-label">
                  {m.name}
                </text>
              )}
              <circle
                cx={m.x}
                cy={m.y}
                r={m.hit}
                fill="transparent"
                className="map-hit"
                role="button"
                tabIndex={0}
                aria-label={`Open ${m.name}`}
                onClick={() => setZoneId(m.id)}
                onPointerUp={() => setZoneId(m.id)}
              />
            </g>
          ))}
          <CrystalDiamonds pieces={hud.crystal} at={(x, z) => ({ x: mx(x), y: mz(z) })} />
          {hud.people.filter((p) => p.keeper).map((p) => (
            <g key={p.id}>
              {isGrowJob(p.job) && raiseHalo(mx(p.x), mz(p.z), 1)}
              {isWalkJob(p.job) && (
                <circle cx={mx(p.x)} cy={mz(p.z)} r={7} className="map-stroke" />
              )}
              <circle
                cx={mx(p.x)}
                cy={mz(p.z)}
                r={isGrowJob(p.job) ? 4.4 : 3.4}
                className="map-violet"
              />
              {Math.hypot(p.x, p.z) > 150 && !foreignWard(p.x, p.z, p.id) && (
                <text x={mx(p.x)} y={mz(p.z) - 8} textAnchor="middle" className="map-name">
                  {p.name.split(" ")[0]}
                </text>
              )}
            </g>
          ))}
          {hud.people.filter((p) => !p.keeper).slice(0, 40).map((p) => (
            <g key={p.id}>
              {isGrowJob(p.job) && raiseHalo(mx(p.x), mz(p.z), 1)}
              {isWalkJob(p.job) && (
                <circle cx={mx(p.x)} cy={mz(p.z)} r={5} className="map-stroke" />
              )}
              <circle
                cx={mx(p.x)}
                cy={mz(p.z)}
                r={isGrowJob(p.job) ? 3.2 : 2.4}
                className="map-cyan"
                opacity={0.7}
              />
            </g>
          ))}
          {!brief.here && (
            <>
              {keeperPath && (
                <polyline
                  points={keeperPath}
                  className="map-keeper-path"
                  strokeWidth={1.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
              {brief.keeper === "seln" && (
                <line
                  x1={mx(hud.px)}
                  y1={mz(hud.pz)}
                  x2={mx(dutyX)}
                  y2={mz(dutyZ)}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  pointerEvents="none"
                />
              )}
              <line
                x1={mx(hud.px)}
                y1={mz(hud.pz)}
                x2={mx(dutyX)}
                y2={mz(dutyZ)}
                className="map-stroke-gold"
                opacity={0.45}
                pointerEvents="none"
              />
              <circle
                cx={mx(dutyX)}
                cy={mz(dutyZ)}
                r={10}
                className="map-gold"
                opacity={0.35}
                pointerEvents="none"
              />
              <polygon
                points="11,0 5,3 5,-3"
                className="map-gold-chevron"
                transform={`translate(${mx(hud.px)} ${mz(hud.pz)}) rotate(${(Math.atan2(mz(dutyZ) - mz(hud.pz), mx(dutyX) - mx(hud.px)) * 180) / Math.PI})`}
                pointerEvents="none"
              />
            </>
          )}
          <YouMark x={mx(hud.px)} y={mz(hud.pz)} label={!DISTRICTS.some((d) => inWard(hud.px, hud.pz, d))} />
          <MapCompass />
          <MapScaleBar />
        </svg>
        <p className="map-hint">Tap a ward.{prettyLast(hud.lastCode) ? ` Last ${prettyLast(hud.lastCode)}.` : ""}</p>
      </div>
      <div className="sheet-legend map-legend-float pointer-events-none" role="list" aria-label="Circuit legend">
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-you" />You</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-keeper" />Keeper</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-folk" />Folk</span>
        <span className="map-legend-item"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" className="map-raise" /></svg>Raising</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-canal" />Canal</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-foundry" />Kiln</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-grove" />Grove</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-bridge" />Span</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-terrace" />Rest</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-wild" />Wild</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-beacon" />Hail</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-foundry" />Join</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-ring" />Chorus</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-archive" />Name</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-gate" />Gate</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-aim" />Aim</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-fruit" />Fruit</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-breath" />Breath</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-tend" />Tend</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-howl" />Howl</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-ward" />Ward</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-vein" />Vein</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-notice" />Notice</span>
        <span className="map-legend-item"><i className="map-legend-swatch map-legend-sit" />Sit</span>
        <span className="map-legend-item"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" className="map-stroke" /></svg>Walk</span>
      </div>
      <div className="map-ward-rail pointer-events-auto">
        {[...DISTRICTS].sort((a, b) => (inWard(hud.px, hud.pz, b) ? 1 : 0) - (inWard(hud.px, hud.pz, a) ? 1 : 0)).map((d) => (
          <button
            key={d.id}
            type="button"
            className="hud-chip min-h-11 px-3"
            data-on={inWard(hud.px, hud.pz, d) ? "true" : undefined}
            aria-current={inWard(hud.px, hud.pz, d) ? "true" : undefined}
            aria-label={`Open ${shortLabel(d)}`}
            onClick={() => setZoneId(d.id)}
          >
            {inWard(hud.px, hud.pz, d) ? `Here · ${shortLabel(d)} · ${keeperName(d.keeper)}` : `${shortLabel(d)} · ${keeperName(d.keeper)}`}
          </button>
        ))}
      </div>
      {zone && (
        <ZoneSheet
          d={zone}
          hud={hud}
          onClose={() => setZoneId(null)}
          onDuty={onDuty}
          onJoin={onJoin}
        />
      )}
    </div>
  );
}

function ZoneSheet({
  d,
  hud,
  onClose,
  onDuty,
  onJoin,
}: {
  d: District;
  hud: HudSnap;
  onClose: () => void;
  onDuty?: (keeper: string) => void;
  onJoin?: () => void;
}) {
  const pad = d.radius * 1.55;
  const left = d.x - pad;
  const top = d.z - pad;
  const size = pad * 2;
  const sx = (x: number) => ((x - left) / size) * 720;
  const sy = (z: number) => ((z - top) / size) * 720;
  const crystal = hud.crystal.filter((p) => inWard(p.x, p.z, d));
  const folk = hud.people.filter((p) => inWard(p.x, p.z, d));
  const keeper = folk.find((p) => p.id === d.keeper) ?? hud.people.find((p) => p.id === d.keeper);
  const living = hud.living.find((a) => a.id === d.keeper);
  const work = hud.live.filter((l) => l.id === d.keeper || l.id.startsWith(`folk-${d.keeper}-`) || l.id.includes(d.id)).slice(-8).reverse();
  const youHere = inWard(hud.px, hud.pz, d);
  const hubX = sx(d.x);
  const hubY = sy(d.z);
  const growers = folk.filter((p) => isGrowJob(p.job)).length;
  const growingNow = hud.folk.building > 0 && growers > 0;
  const avenues = [0.32, 1.88, 3.42, 5.02].map((a, i) => {
    const x2 = hubX + Math.cos(a) * 268;
    const y2 = hubY + Math.sin(a) * 268;
    const qx = hubX + Math.cos(a + 0.22) * 128;
    const qy = hubY + Math.sin(a + 0.22) * 128;
    return { i, d: `M${hubX} ${hubY} Q${qx} ${qy} ${x2} ${y2}` };
  });
  const lamps = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i * Math.PI * 2) / 6 + 0.18;
    return { i, x: hubX + Math.cos(a) * 98, y: hubY + Math.sin(a) * 98 };
  });
  const shapes = Object.entries(
    crystal.reduce<Record<string, number>>((acc, p) => {
      acc[p.shape] = (acc[p.shape] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="sheet zone-sheet absolute inset-0 z-50 flex flex-col bg-bg hud-safe" role="dialog" aria-modal="true" aria-label="Ward map">
      <header className="sheet-head pointer-events-auto">
        <div>
          <p className="sheet-kicker">{keeperName(d.keeper)} · {d.duty}{growingNow ? " · raising" : ""}</p>
          <h3 className="sheet-title">{shortLabel(d)}</h3>
        </div>
        <button type="button" className="hud-chip min-h-11 px-3 zone-close" aria-label="Close ward" title="Close ward" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="px-4 text-xs text-muted">{d.tag}</p>
      {growingNow && <p className="px-4 text-xs text-accent">{growers} growing · {keeperName(d.keeper)}</p>}
      {youHere && <p className="px-4 text-xs text-accent">You are here · {shortLabel(d)}</p>}
      <div className="map-stage">
        <svg viewBox="0 0 720 720" preserveAspectRatio="xMidYMid meet" className="map-canvas">
          <defs>
            <WardWashDefs prefix="zone" />
          </defs>
          <rect width="720" height="720" fill="#070910" />
          <circle
            cx="360"
            cy="360"
            r="310"
            className={`map-ward map-ward-${d.kind}`}
            style={{ fill: wardWashUrl(d.kind, "zone"), fillOpacity: WARD_WASH_OPACITY[d.kind] }}
          />
          {avenues.map((a) => (
            <path key={`zave-${a.i}`} d={a.d} className="map-avenue" />
          ))}
          <BuildMark x={hubX} y={hubY} shape="pad" s={6.4} />
          <WardGlyph d={d} x={360} y={360} r={120} />
          <circle cx={hubX} cy={hubY} r="8" className="map-core" />
          {lamps.map((l) => (
            <BuildMark key={`zlamp-${l.i}`} x={l.x} y={l.y} shape="lamp" s={2.2} />
          ))}
          <CrystalDiamonds pieces={crystal} at={(x, z) => ({ x: sx(x), y: sy(z) })} />
          {folk.filter((p) => p.keeper).map((p) => (
            <g key={p.id}>
              {isGrowJob(p.job) && raiseHalo(sx(p.x), sy(p.z), 1)}
              {isWalkJob(p.job) && (
                <circle cx={sx(p.x)} cy={sy(p.z)} r={8} className="map-stroke" />
              )}
              <circle cx={sx(p.x)} cy={sy(p.z)} r={isGrowJob(p.job) ? 6 : 5} className="map-violet" />
              {Math.hypot(sx(p.x) - hubX, sy(p.z) - hubY) > 48 && (
                <text x={sx(p.x)} y={sy(p.z) - 12} textAnchor="middle" className="map-name">
                  {p.name.split(" ")[0]}
                </text>
              )}
            </g>
          ))}
          {folk.filter((p) => !p.keeper).slice(0, 20).map((p) => (
            <g key={p.id}>
              {isGrowJob(p.job) && raiseHalo(sx(p.x), sy(p.z), 1)}
              {isWalkJob(p.job) && (
                <circle cx={sx(p.x)} cy={sy(p.z)} r={5} className="map-stroke" />
              )}
              <circle
                cx={sx(p.x)}
                cy={sy(p.z)}
                r={isGrowJob(p.job) ? 4 : 3}
                className="map-cyan"
                opacity={0.7}
              />
            </g>
          ))}
          {youHere && <YouMark x={sx(hud.px)} y={sy(hud.pz)} />}
        </svg>
      </div>
      <div className="map-zone-meta pointer-events-auto">
        <p className="text-muted">{d.purpose ?? d.tag}</p>
        <p className="mt-1 text-accent">
          {crystal.length} standing · {folk.length} inhabitants
          {living ? ` · ${living.name.split(" ")[0]} ${living.job}` : ""}
          {keeper && !living ? ` · ${keeper.name.split(" ")[0]} ${keeper.job}` : ""}
        </p>
        {shapes.length > 0 && (
          <ul>
            {shapes.slice(0, 6).map(([shape, n]) => {
              const law = readShape(shape);
              return (
                <li key={shape}>
                  <span className="hud-title">{law.title}</span>
                  <span className="text-muted"> · {n}</span>
                </li>
              );
            })}
          </ul>
        )}
        {shapes.length === 0 && <p className="mt-2 text-muted">No crystal grown here yet. Ask the keeper — they will grow it.</p>}
        {work.length > 0 && (
          <ul>
            {work.slice(0, 3).map((l, i) => (
              <li key={`${l.at}-${i}`}>
                <span className="text-accent">{l.name.split(" ")[0]}</span>
                <span className="text-muted"> · {l.kind}</span>
              </li>
            ))}
          </ul>
        )}
        <DutyRow d={d} onDuty={onDuty} onJoin={onJoin} />
      </div>
    </div>
  );
}

function DutyRow({
  d,
  onDuty,
  onJoin,
}: {
  d: District;
  onDuty?: (keeper: string) => void;
  onJoin?: () => void;
}) {
  const ask = civicForKeeper(d.keeper);
  if (!ask) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {ask.join && onJoin && (
        <button type="button" className="hud-chip min-h-11 px-3" onClick={onJoin}>
          Open Trading Place
        </button>
      )}
      {onDuty && (
        <button type="button" className="hud-chip min-h-11 px-3" onClick={() => onDuty(d.keeper)}>
          {ask.label}
        </button>
      )}
    </div>
  );
}
