/** LEFTOVER FIRST HOWL MEETING PAPER JOIN on empty ground BETWEEN Charge Canals
 * (−620, 96 r=130, Seln) and Charge-crystal Join (−300, −340 r=110, Voss).
 * Seln's leftover First Howl meeting Voss's paper join. Never bottled. No coin.
 * Not joinflow.ts (canal↔join gold walk-stones). Not westmark.ts (overlook↔canal).
 * Not tendrest.ts (canal↔terrace). Not tendhail.ts (canal↔beacon).
 * Not tendvein.ts (canal↔wild). Not residual.ts (archive↔canal).
 * Not rill.ts (Hub→canal). Not hubjoin.ts (hub↔join). Not joinwalk.ts (foundry↔join).
 * Not fruitjoin.ts (grove↔join). Not restjoin.ts (terrace↔join).
 * Not joinsoft.ts (join↔gate). Not stall.ts / pier.ts / scales.ts (AT join).
 * Not grate.ts / sluice.ts / weir.ts (AT canal).
 * Parent hooks with:
 *   laterOn(() => { try { growTendjoin(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover-Howl cyan — Charge meeting paper join, never bottled, never coin. */
function howlCyan() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a2230,
    roughness: 0.28,
    metalness: 0.35,
    emissive: 0x3ec8e0,
    emissiveIntensity: 0.2,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.38,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  rz: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, p.rz);
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

/** Cyan join-pad. Radius 1.5, height 0.2 — a pad, not a bottle, not coin. */
const PAD_R = 1.5;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of canal→market. Skip hypot < 138 from
 * canal or < 118 from market — dens sit far apart, so the band holds
 * the BETWEEN strip. Canal (−620, 96) r=130. Join (−300, −340) r=110.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_CANAL = 138;
const SKIP_JOIN = 118;
const N_FINE = 3;
const N_COARSE = 2;

export const TENDJOIN_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipCanal: SKIP_CANAL,
  skipJoin: SKIP_JOIN,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPads(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: PAD_R, h: PAD_H, y: PAD_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Leftover First Howl cyan pads on empty ground between DISTRICTS canal and market.
 * 3 CylinderGeometry r=1.5 h=0.2 (coarse 2) MeshPhysical 0x0a2230
 * emissive 0x3ec8e0 intensity 0.2 roughness 0.28 metalness 0.35
 * iridescence 0.4 clearcoat 0.38, evenly t=0.40..0.60 of the
 * canal→market segment, y=0.11. Skip hypot < 138 from canal or
 * < 118 from market. Seln's leftover First Howl meeting Voss's paper
 * join. Never bottled. No coin. No tick.
 */
export function growTendjoin(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "tendjoin";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.tendjoinCounts = counts;
  root.userData.tendjoinCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const canal = den("canal");
  const join = den("market");
  if (!canal || !join) return;

  const dx = join.x - canal.x;
  const dz = join.z - canal.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_CANAL + 0.05) / dist;
  const tMax = 1 - (SKIP_JOIN + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = canal.x + dx * t;
    const z = canal.z + dz * t;
    if (Math.hypot(x - canal.x, z - canal.z) < SKIP_CANAL) continue;
    if (Math.hypot(x - join.x, z - join.z) < SKIP_JOIN) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), howlCyan(), poses, root);

  counts.n = poses.length;
  root.userData.tendjoinCount = poses.length;
}
