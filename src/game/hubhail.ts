/** HUB BREATH WALKING TO THE HAIL on empty ground BETWEEN Hub and High Beacon.
 * Veyra's breath so Lumen's first landing is civic, never locked.
 * Not hubaim.ts (hub↔overlook). Not breathrest.ts (hub↔terrace).
 * Not hubjoin.ts (hub↔join). Not hailchorus.ts (beacon↔ring).
 * Not hush.ts (beacon↔gate). Not beam/hail (AT beacon). Not fountain/font (AT hub).
 * Parent hooks with:
 *   laterOn(() => { try { growHubhail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold hub-hail — Veyra's breath walking to Lumen, civic, never a lock. */
function hailGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.46,
    emissive: 0x3aa8c0,
    emissiveIntensity: 0.13,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.38,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = 2;
  group.add(mesh);
}

/** Low hub-hail stone. Width across the walk, depth along it. */
const STONE_W = 1.15;
const STONE_H = 0.14;
const STONE_D = 0.48;
/** Box center: sits on the civic street. */
const STONE_Y = 0.08;
/**
 * Empty middle of hub(0,0) → beacon(780, 620). t=0.22..0.70 is the
 * long BETWEEN strip. Hub civic floor skip r<90. Beacon r=120 skip 128.
 * Soft Gates (520, 480) and Light-Bridge (640, 90) skip 140 so we do
 * not sit on Kael or Tal.
 */
const T_LO = 0.22;
const T_HI = 0.7;
const SKIP_HUB = 90;
const SKIP_BEACON = 128;
const SKIP_GATE = 140;
const SKIP_BRIDGE = 140;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const HUBHAIL_SIZES = {
  w: STONE_W,
  h: STONE_H,
  d: STONE_D,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipHub: SKIP_HUB,
  skipBeacon: SKIP_BEACON,
  skipGate: SKIP_GATE,
  skipBridge: SKIP_BRIDGE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, w: STONE_W, h: STONE_H, d: STONE_D, y: STONE_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Hub-breath-to-hail stones on empty ground hub(0,0) → DISTRICTS beacon.
 * 4 BoxGeometry 1.15×0.14×0.48 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.13 roughness 0.26 metalness 0.46 iridescence
 * 0.4 clearcoat 0.38, evenly t=0.22..0.70 of hub(0,0) → beacon(780,620),
 * y=0.08. Yaw faces the path. Skip hypot < 90 from hub or < 128 from beacon.
 * Also skip hypot < 140 from gate (520,480) and < 140 from bridge (640,90).
 * Veyra's breath so Lumen's first landing is civic, never locked. Not hubaim.
 * Not breathrest. Not hubjoin. Not hailchorus. Not hush. Not beam/hail.
 * Not fountain/font. No tick.
 */
export function growHubhail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hubhail";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.hubhailCounts = counts;
  root.userData.hubhailCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: STONE_W,
    h: STONE_H,
    d: STONE_D,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    skipHub: SKIP_HUB,
    skipBeacon: SKIP_BEACON,
    skipGate: SKIP_GATE,
    skipBridge: SKIP_BRIDGE,
  };

  const beacon = den("beacon") ?? { x: 780, z: 620 };
  const gate = den("gate") ?? { x: 520, z: 480 };
  const bridge = den("bridge") ?? { x: 640, z: 90 };

  const dx = beacon.x - HUB_X;
  const dz = beacon.z - HUB_Z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = HUB_X + dx * t;
    const z = HUB_Z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - bridge.x, z - bridge.z) < SKIP_BRIDGE) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(STONE_W, STONE_H, STONE_D), hailGold(), poses, root);

  counts.n = poses.length;
  root.userData.hubhailCount = poses.length;
}
