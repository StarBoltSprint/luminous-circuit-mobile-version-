/** HUB BREATH WALKING TO THE JOIN on empty ground BETWEEN Hub and Charge-crystal Join.
 * Veyra's breath so Voss's paper join stays civic, not coin.
 * Not joinflow.ts (canal↔join). Not joinwalk.ts (foundry↔join).
 * Not namestone.ts (hub↔archive). Not hubaim.ts (hub↔overlook).
 * Not breathrest.ts (hub↔terrace). Not stall.ts / pier.ts / scales.ts (AT join).
 * Not fountain.ts / font.ts (AT hub).
 * Parent hooks with:
 *   laterOn(() => { try { growHubjoin(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft gold breath — a walk-disc on the street, civic, not coin. */
function breathGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground breath-disc. Radius of an inhale-mark, flush to empty street. */
const CIRCLE_R = 0.82;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.18;
const CIRCLE_HEX = 0xc4a060;
/**
 * Empty middle of hub(0,0) → join(−300, −340). t=0.24..0.72 is the
 * long BETWEEN strip. Hub civic floor skip r<90. Join r=110 skip 120.
 */
const T_LO = 0.24;
const T_HI = 0.72;
const SKIP_HUB = 90;
const SKIP_JOIN = 120;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const HUBJOIN_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipHub: SKIP_HUB,
  skipJoin: SKIP_JOIN,
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
 * Hub-breath-to-join discs on empty ground hub(0,0) → DISTRICTS market (join).
 * 4 CircleGeometry r=0.82 (coarse 2) MeshBasic gold 0xc4a060 opacity 0.18,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.24..0.72 of hub(0,0) →
 * join(−300,−340). Skip hypot < 90 from hub or < 120 from join.
 * Veyra's breath so Voss's paper join stays civic, not coin. Not joinflow.
 * Not joinwalk. Not namestone. Not hubaim. Not breathrest. Not stall/pier/scales.
 * Not fountain/font. No tick.
 */
export function growHubjoin(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hubjoin";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.hubjoinCounts = counts;
  root.userData.hubjoinCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipHub: SKIP_HUB,
    skipJoin: SKIP_JOIN,
  };

  const join = den("market") ?? { x: -300, z: -340 };

  const dx = join.x - HUB_X;
  const dz = join.z - HUB_Z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = breathGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = HUB_X + dx * t;
    const z = HUB_Z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;
    if (Math.hypot(x - join.x, z - join.z) < SKIP_JOIN) continue;

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
  root.userData.hubjoinCount = positions.length;
}
