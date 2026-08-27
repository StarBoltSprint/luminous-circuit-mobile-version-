/** PAPER JOIN WALKING TO THE SOFT GATE on empty ground BETWEEN
 * Charge-crystal Join (−300,−340 r=110) and Soft Gates (520,480 r=130).
 * Voss's paper is never a lock. Kael keeps the door after Lumen's hail.
 * Not hubjoin.ts (hub↔join). Not joinflow.ts (canal↔join). Not joinwalk.ts (foundry↔join).
 * Not restgate.ts (terrace↔gate). Not hush.ts (beacon↔gate).
 * Not gates.ts / veil.ts (AT gate). Not stall.ts / pier.ts / scales.ts (AT join).
 * Parent hooks with:
 *   laterOn(() => { try { growJoinsoft(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft gold paper-walk — Voss's join walking to Kael's door, never a lock. */
function paperGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground paper-disc. Radius of a join-mark, flush to empty street. */
const CIRCLE_R = 0.8;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.17;
const CIRCLE_HEX = 0xc4a060;
/**
 * Empty middle of join(−300,−340) → gate(520,480). t=0.26..0.74 is the
 * long BETWEEN strip. Join r=110 skip 120. Gate r=130 skip 140.
 * Hub civic floor skip r<90 so paper never sits on Veyra's breath.
 */
const T_LO = 0.26;
const T_HI = 0.74;
const SKIP_JOIN = 120;
const SKIP_GATE = 140;
const SKIP_HUB = 90;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const JOINSOFT_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipJoin: SKIP_JOIN,
  skipGate: SKIP_GATE,
  skipHub: SKIP_HUB,
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
 * Paper-join-to-soft-gate discs on empty ground DISTRICTS market → gate.
 * 4 CircleGeometry r=0.8 (coarse 2) MeshBasic gold 0xc4a060 opacity 0.17,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.26..0.74 of join(−300,−340) →
 * gate(520,480). Skip hypot < 120 from join or < 140 from gate.
 * Also skip hypot < 90 from hub (0,0). Voss's paper is never a lock.
 * Kael keeps the door after Lumen's hail. Not hubjoin. Not joinflow.
 * Not joinwalk. Not restgate. Not hush. Not gates/veil. Not stall/pier/scales.
 * No tick.
 */
export function growJoinsoft(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "joinsoft";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.joinsoftCounts = counts;
  root.userData.joinsoftCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipJoin: SKIP_JOIN,
    skipGate: SKIP_GATE,
    skipHub: SKIP_HUB,
  };

  const join = den("market") ?? { x: -300, z: -340 };
  const gate = den("gate") ?? { x: 520, z: 480 };

  const dx = gate.x - join.x;
  const dz = gate.z - join.z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = paperGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = join.x + dx * t;
    const z = join.z + dz * t;
    if (Math.hypot(x - join.x, z - join.z) < SKIP_JOIN) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;

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
  root.userData.joinsoftCount = positions.length;
}
