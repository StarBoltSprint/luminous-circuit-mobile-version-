/** SOFT DOOR WALKING TO WILD LANDINGS on empty ground BETWEEN
 * Soft Gates (520,480 r=130) and Wild Veins (860,-640 r=140).
 * Kael's door so Kesh's becoming-ground is never a lock. Leave. Return. No score.
 * The STRAIGHT gate→wild line PASSES THROUGH Light-Bridge (640,90 r=130).
 * Offset the walk EAST by +160 x so it never crosses Tal's span.
 * Line (680, 480) → (1020, -640).
 * Not landing.ts (wild↔bridge). Not hush.ts (beacon↔gate).
 * Not restgate.ts (terrace↔gate). Not joinsoft.ts (join↔gate).
 * Not kilnwild.ts (foundry↔wild). Not hubhail.ts (hub↔beacon).
 * Not gates.ts / veil.ts / lintel.ts (AT gate). Not wilds.ts / veins.ts (IN the wild).
 * Not spans.ts / pylons.ts (AT bridge).
 * Parent hooks with:
 *   laterOn(() => { try { growGateswild(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold soft-door — Kael's threshold walking to Kesh, never a lock. */
function doorGold() {
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

/** Low door-stone. Width across the walk, depth along it. */
const STONE_W = 1.05;
const STONE_H = 0.14;
const STONE_D = 0.45;
/** Box center: height 0.14 sits on y=0. */
const STONE_Y = 0.07;
/**
 * Offset EAST +160 x of gate→wild so the walk never crosses Tal's span.
 * Line (680, 480) → (1020, -640). t=0.28..0.72 is the long BETWEEN strip.
 * Gate (520,480) r=130 skip 140. Wild (860,-640) r=140 skip 150.
 * Bridge (640,90) r=130 skip 140. Beacon (780,620) r=120 skip 128.
 */
const OFFSET_X = 160;
const T_LO = 0.28;
const T_HI = 0.72;
const SKIP_GATE = 140;
const SKIP_WILD = 150;
const SKIP_BRIDGE = 140;
const SKIP_BEACON = 128;
const AX = 680;
const AZ = 480;
const BX = 1020;
const BZ = -640;
const N_FINE = 4;
const N_COARSE = 2;

export const GATESWILD_SIZES = {
  w: STONE_W,
  h: STONE_H,
  d: STONE_D,
  y: STONE_Y,
  offsetX: OFFSET_X,
  tLo: T_LO,
  tHi: T_HI,
  skipGate: SKIP_GATE,
  skipWild: SKIP_WILD,
  skipBridge: SKIP_BRIDGE,
  skipBeacon: SKIP_BEACON,
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
 * Soft-door-to-wild landings on empty ground, offset EAST of DISTRICTS gate → wild.
 * 4 BoxGeometry 1.05×0.14×0.45 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.13 roughness 0.26 metalness 0.46 iridescence
 * 0.4 clearcoat 0.38, evenly t=0.28..0.72 of (680,480) → (1020,-640),
 * y=0.07. Yaw faces the path. Skip hypot < 140 from gate (520,480),
 * < 150 from wild (860,-640), < 140 from bridge (640,90), < 128 from
 * beacon (780,620). Kael's door so Kesh's becoming-ground is never a lock.
 * Leave. Return. No score. Not landing. Not hush. Not restgate. Not joinsoft.
 * Not kilnwild. Not hubhail. Not gates/veil/lintel. Not wilds/veins. Not spans.
 * No tick.
 */
export function growGateswild(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "gateswild";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.gateswildCounts = counts;
  root.userData.gateswildCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: STONE_W,
    h: STONE_H,
    d: STONE_D,
    y: STONE_Y,
    offsetX: OFFSET_X,
    tLo: T_LO,
    tHi: T_HI,
    skipGate: SKIP_GATE,
    skipWild: SKIP_WILD,
    skipBridge: SKIP_BRIDGE,
    skipBeacon: SKIP_BEACON,
  };

  const gate = den("gate") ?? { x: 520, z: 480 };
  const wild = den("wild") ?? { x: 860, z: -640 };
  const bridge = den("bridge") ?? { x: 640, z: 90 };
  const beacon = den("beacon") ?? { x: 780, z: 620 };

  const ax = gate.x + OFFSET_X;
  const az = gate.z;
  const bx = wild.x + OFFSET_X;
  const bz = wild.z;
  const dx = bx - ax;
  const dz = bz - az;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = ax + dx * t;
    const z = az + dz * t;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - wild.x, z - wild.z) < SKIP_WILD) continue;
    if (Math.hypot(x - bridge.x, z - bridge.z) < SKIP_BRIDGE) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(STONE_W, STONE_H, STONE_D), doorGold(), poses, root);

  counts.n = poses.length;
  root.userData.gateswildCount = poses.length;
}
