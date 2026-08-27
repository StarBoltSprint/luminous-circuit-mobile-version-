/** HAIL WALKING TO THE CHORUS on empty ground BETWEEN High Beacon and Outer Howl.
 * Lumen hails those still landing; Rhoa gathers without closing.
 * Not hush.ts (beacon↔gate). Not choir.ts (terrace↔ring). Not beam.ts (AT beacon).
 * Not dais/pads/chorus (AT ring). Not hail.ts (AT beacon bowl).
 * Parent hooks with:
 *   laterOn(() => { try { growHailchorus(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold hail-walk — Lumen's cyan kiss walking to Rhoa, never a lock, never a close. */
function hailGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.46,
    emissive: 0x3aa8c0,
    emissiveIntensity: 0.14,
    iridescence: 0.42,
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

/** Low hail-walk stone. Width across the walk, depth along it. */
const STONE_W = 1.2;
const STONE_H = 0.16;
const STONE_D = 0.5;
/** Box center: height 0.16 sits on y=0. */
const STONE_Y = 0.08;
/**
 * Empty middle of beacon→ring. t=0.32..0.68 sits between dens, not inside
 * either floor. Beacon (780, 620) r=120. Outer Howl (40, 920) r=130.
 * Soft Gates (520, 480) r=130 sits west of the line — skip it too.
 */
const T_LO = 0.32;
const T_HI = 0.68;
const BEACON_SKIP = 128;
const RING_SKIP = 140;
const GATE_SKIP = 140;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

export const HAILCHORUS_SIZES = {
  w: STONE_W,
  h: STONE_H,
  d: STONE_D,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  beaconSkip: BEACON_SKIP,
  ringSkip: RING_SKIP,
  gateSkip: GATE_SKIP,
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
 * Hail walking to the chorus on empty ground between DISTRICTS beacon and ring.
 * 4 BoxGeometry 1.2×0.16×0.5 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.14 roughness 0.26 metalness 0.46 iridescence
 * 0.42 clearcoat 0.38, evenly t=0.32..0.68 of beacon(780,620) → ring(40,920),
 * y=0.08. Yaw faces the path. Skip hypot < 128 from beacon or < 140 from ring.
 * Also skip hypot < 140 from gate (520,480). Lumen hails those still landing;
 * Rhoa gathers without closing. Not hush. Not choir. Not beam. Not dais/pads/
 * chorus. Not hail bowl. No tick.
 */
export function growHailchorus(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hailchorus";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.hailchorusCounts = counts;
  root.userData.hailchorusCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: STONE_W,
    h: STONE_H,
    d: STONE_D,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    beaconSkip: BEACON_SKIP,
    ringSkip: RING_SKIP,
    gateSkip: GATE_SKIP,
  };

  const beacon = den("beacon");
  const ring = den("ring");
  const gate = den("gate");
  if (!beacon || !ring) return;
  if (Math.hypot(beacon.x, beacon.z) < HUB_R || Math.hypot(ring.x, ring.z) < HUB_R) return;

  const dx = ring.x - beacon.x;
  const dz = ring.z - beacon.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = beacon.x + dx * t;
    const z = beacon.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < BEACON_SKIP) continue;
    if (Math.hypot(x - ring.x, z - ring.z) < RING_SKIP) continue;
    if (gate && Math.hypot(x - gate.x, z - gate.z) < GATE_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(STONE_W, STONE_H, STONE_D), hailGold(), poses, root);

  counts.n = poses.length;
  root.userData.hailchorusCount = poses.length;
}
