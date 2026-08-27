/** CHARGE WALKING TO THE JOIN on empty ground BETWEEN Charge Canals and Charge-crystal Join.
 * Seln tends, Voss matches. Not rill.ts (Hub→canal). Not residual.ts (archive↔canal).
 * Not westmark.ts (overlook↔canal). Not joinwalk.ts (foundry↔join).
 * Not pier.ts / stall.ts / scales.ts (AT join). Not grate.ts / sluice.ts (AT canal).
 * Parent hooks with:
 *   laterOn(() => { try { growJoinflow(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold walk-stone — Charge Seln tended, walking to Voss's join. Cyan kiss, never bottled. */
function flowGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.48,
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

/** Low walk-stone. Radius of a Charge step toward the join. */
const STONE_R = 0.7;
const STONE_H = 0.1;
/** Cylinder center: height 0.1 sits on y=0. */
const STONE_Y = 0.05;
/**
 * Empty middle of canal→join. t=0.30..0.70 sits between dens, not inside
 * either floor. Canal (−620, 96) r=130. Join/market (−300,−340) r=110.
 */
const T_LO = 0.3;
const T_HI = 0.7;
const CANAL_SKIP = 140;
const JOIN_SKIP = 120;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

export const JOINFLOW_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  canalSkip: CANAL_SKIP,
  joinSkip: JOIN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: STONE_R, h: STONE_H, y: STONE_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Charge walking to the Join on empty ground between DISTRICTS canal and market.
 * 4 CylinderGeometry r=0.7 h=0.1 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.14 roughness 0.26 metalness 0.48 iridescence
 * 0.42 clearcoat 0.38, evenly t=0.30..0.70 of canal(-620,96) → join(-300,-340),
 * y=0.05. Skip hypot < 140 from canal or < 120 from join.
 * Seln tends, Voss matches. Not rill. Not residual. Not westmark. Not joinwalk.
 * Not pier/stall/scales. Not grate/sluice. No tick.
 */
export function growJoinflow(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "joinflow";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.joinflowCounts = counts;
  root.userData.joinflowCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const canal = den("canal");
  const join = den("market");
  if (!canal || !join) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R || Math.hypot(join.x, join.z) < HUB_R) return;

  const dx = join.x - canal.x;
  const dz = join.z - canal.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = canal.x + dx * t;
    const z = canal.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < CANAL_SKIP) continue;
    if (Math.hypot(x - join.x, z - join.z) < JOIN_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), flowGold(), poses, root);

  counts.n = poses.length;
  root.userData.joinflowCount = poses.length;
}
