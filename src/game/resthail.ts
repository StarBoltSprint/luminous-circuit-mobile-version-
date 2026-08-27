/** REST WALKING TO THE HAIL on empty ground BETWEEN Crystal Terraces and High Beacon.
 * Mira wards rest so Lumen's first landing is not a trial.
 * Not restgate.ts (terrace↔gate). Not hush.ts (beacon↔gate).
 * Not hailchorus.ts (beacon↔ring). Not choir.ts (terrace↔ring).
 * Not hubhail.ts (hub↔beacon). Not spanrest.ts (bridge↔terrace).
 * Not rest/steps (AT terrace). Not beam/hail (AT beacon).
 * Parent hooks with:
 *   laterOn(() => { try { growResthail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft cyan rest-hail — Mira's rest walking to Lumen, a landing, never a trial. */
function restCyan() {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground rest-hail disc. A rest-ward on the walk, not a sit, not a lock. */
const CIRCLE_R = 0.78;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.16;
const CIRCLE_HEX = 0x3aa8c0;
/**
 * Empty middle of terrace→beacon. t=0.28..0.72 is the long BETWEEN strip.
 * Terrace (48, 660) r=130 skip 140. Beacon (780, 620) r=120 skip 128.
 * Soft Gates (520, 480) and Outer Howl (40, 920) skip 140 so we do
 * not sit on Kael or Rhoa.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const SKIP_TERRACE = 140;
const SKIP_BEACON = 128;
const SKIP_GATE = 140;
const SKIP_RING = 140;
const N_FINE = 4;
const N_COARSE = 2;

export const RESTHAIL_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipTerrace: SKIP_TERRACE,
  skipBeacon: SKIP_BEACON,
  skipGate: SKIP_GATE,
  skipRing: SKIP_RING,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nDiscs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: CIRCLE_R, y: CIRCLE_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Rest walking to the hail on empty ground between DISTRICTS terrace and beacon.
 * 4 CircleGeometry r=0.78 (coarse 2) MeshBasic cyan 0x3aa8c0 opacity 0.16,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.28..0.72 of terrace(48,660) →
 * beacon(780,620). Skip hypot < 140 from terrace or < 128 from beacon.
 * Also skip hypot < 140 from gate (520,480) and < 140 from ring (40,920).
 * Mira wards rest so Lumen's first landing is not a trial. Not restgate.
 * Not hush. Not hailchorus. Not choir. Not hubhail. Not spanrest. Not
 * rest/steps. Not beam/hail. No tick.
 */
export function growResthail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "resthail";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.resthailCounts = counts;
  root.userData.resthailCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipTerrace: SKIP_TERRACE,
    skipBeacon: SKIP_BEACON,
    skipGate: SKIP_GATE,
    skipRing: SKIP_RING,
  };

  const terrace = den("terrace") ?? { x: 48, z: 660 };
  const beacon = den("beacon") ?? { x: 780, z: 620 };
  const gate = den("gate") ?? { x: 520, z: 480 };
  const ring = den("ring") ?? { x: 40, z: 920 };

  const dx = beacon.x - terrace.x;
  const dz = beacon.z - terrace.z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = restCyan();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = terrace.x + dx * t;
    const z = terrace.z + dz * t;
    if (Math.hypot(x - terrace.x, z - terrace.z) < SKIP_TERRACE) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - ring.x, z - ring.z) < SKIP_RING) continue;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, CIRCLE_Y, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    root.add(mesh);
    positions.push({ x, z });
  }

  counts.n = positions.length;
  root.userData.resthailCount = positions.length;
}
