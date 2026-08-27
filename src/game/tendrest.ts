/** LEFTOVER HOWL WALKING TO REST on empty ground BETWEEN Charge Canals
 * (−620, 96 r=130) and Crystal Terraces (48, 660 r=130).
 * Seln tends so Mira's rest is not a dry post.
 * Not rill.ts (Hub→canal). Not westmark.ts (overlook↔canal).
 * Not residual.ts (archive↔canal). Not joinflow.ts (canal↔join).
 * Not breathrest.ts (hub↔terrace). Not restgate.ts (terrace↔gate).
 * Not rest.ts / steps.ts (AT terrace). Not grate.ts / sluice.ts (AT canal).
 * Parent hooks with:
 *   laterOn(() => { try { growTendrest(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold leftover-howl — Seln tended Charge walking so Mira's rest is not a dry post. Cyan kiss, never bottled. */
function howlGold() {
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

/** Low leftover-howl walk-stone. Radius of a Charge step toward Mira's rest. */
const STONE_R = 0.68;
const STONE_H = 0.1;
/** Cylinder center: height 0.1 sits on y=0. */
const STONE_Y = 0.05;
/**
 * Empty middle of canal→terrace. t=0.28..0.72 sits between dens, not inside
 * either floor. Canal (−620, 96) r=130 skip 140. Terrace (48, 660) r=130 skip 140.
 * Hub (0,0) skip 90. Overlook (−880, 220) skip 148 so we do not sit on Aure.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const CANAL_SKIP = 140;
const TERRACE_SKIP = 140;
const HUB_R = 90;
const OVERLOOK_SKIP = 148;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const TENDREST_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  canalSkip: CANAL_SKIP,
  terraceSkip: TERRACE_SKIP,
  skipHub: HUB_R,
  skipOverlook: OVERLOOK_SKIP,
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
 * Leftover Howl walking to rest on empty ground between DISTRICTS canal and terrace.
 * 4 CylinderGeometry r=0.68 h=0.1 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.14 roughness 0.26 metalness 0.48 iridescence
 * 0.42 clearcoat 0.38, evenly t=0.28..0.72 of canal(-620,96) → terrace(48,660),
 * y=0.05. Skip hypot < 140 from canal or < 140 from terrace. Also skip hypot
 * < 90 from hub (0,0) and < 148 from overlook (-880,220).
 * Seln tends so Mira's rest is not a dry post. Not rill. Not westmark.
 * Not residual. Not joinflow. Not breathrest. Not restgate. Not rest/steps.
 * Not grate/sluice. No tick.
 */
export function growTendrest(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "tendrest";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.tendrestCounts = counts;
  root.userData.tendrestCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    canalSkip: CANAL_SKIP,
    terraceSkip: TERRACE_SKIP,
    skipHub: HUB_R,
    skipOverlook: OVERLOOK_SKIP,
  };

  const canal = den("canal") ?? { x: -620, z: 96 };
  const terrace = den("terrace") ?? { x: 48, z: 660 };
  const overlook = den("overlook") ?? { x: -880, z: 220 };

  const dx = terrace.x - canal.x;
  const dz = terrace.z - canal.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = canal.x + dx * t;
    const z = canal.z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < HUB_R) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < CANAL_SKIP) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < TERRACE_SKIP) continue;
    if (Math.hypot(x - overlook.x, z - overlook.z) < OVERLOOK_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), howlGold(), poses, root);

  counts.n = poses.length;
  root.userData.tendrestCount = poses.length;
}
