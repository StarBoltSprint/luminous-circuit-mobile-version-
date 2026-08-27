/** REST-WARD GOLD PADS on empty ground BETWEEN Crystal Terraces
 * (48, 660 r=130, Mira) and Charge-crystal Join (−300, −340 r=110, Voss).
 * Mira's rest meeting Voss's paper join — labor can return, then Charge for crystal.
 * Rest is not a test. No coin.
 * Not restkiln.ts (terrace↔foundry). Not rest.ts / steps.ts / posts.ts (AT terrace).
 * Not breathrest.ts (hub↔terrace). Not tendrest.ts (canal↔terrace).
 * Not choir.ts (terrace↔ring). Not restgate.ts (terrace↔gate).
 * Not spanrest.ts (bridge↔terrace). Not resthail.ts (terrace↔beacon).
 * Not hubjoin.ts (hub↔join). Not joinflow.ts (canal↔join).
 * Not joinwalk.ts (foundry↔join). Not fruitjoin.ts (grove↔join).
 * Not joinsoft.ts (join↔gate). Not stall.ts / pier.ts / scales.ts (AT join).
 * Parent hooks with:
 *   laterOn(() => { try { growRestjoin(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Rest-ward gold — Mira's rest meeting Voss's paper join, never a test, never coin. */
function wardGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x24180c,
    roughness: 0.26,
    metalness: 0.42,
    emissive: 0xc4a060,
    emissiveIntensity: 0.18,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
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

/** Rest-ward gold pad. Radius 1.6, height 0.2 — a pad, not a sit, not coin. */
const PAD_R = 1.6;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of terrace→market. Skip hypot < 138 from
 * terrace or < 118 from market — dens sit far apart, so the band holds
 * the BETWEEN strip. Terrace (48, 660) r=130. Join (−300, −340) r=110.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_TERRACE = 138;
const SKIP_JOIN = 118;
const N_FINE = 3;
const N_COARSE = 2;

export const RESTJOIN_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipTerrace: SKIP_TERRACE,
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
 * Rest-ward gold pads on empty ground between DISTRICTS terrace and market.
 * 3 CylinderGeometry r=1.6 h=0.2 (coarse 2) MeshPhysical 0x24180c
 * emissive 0xc4a060 intensity 0.18 roughness 0.26 metalness 0.42
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * terrace→market segment, y=0.11. Skip hypot < 138 from terrace or
 * < 118 from market. Mira's rest meeting Voss's paper join — labor can
 * return, then Charge for crystal. Rest is not a test. No coin. No tick.
 */
export function growRestjoin(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "restjoin";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.restjoinCounts = counts;
  root.userData.restjoinCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const terrace = den("terrace");
  const join = den("market");
  if (!terrace || !join) return;

  const dx = join.x - terrace.x;
  const dz = join.z - terrace.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_TERRACE + 0.05) / dist;
  const tMax = 1 - (SKIP_JOIN + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = terrace.x + dx * t;
    const z = terrace.z + dz * t;
    if (Math.hypot(x - terrace.x, z - terrace.z) < SKIP_TERRACE) continue;
    if (Math.hypot(x - join.x, z - join.z) < SKIP_JOIN) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), wardGold(), poses, root);

  counts.n = poses.length;
  root.userData.restjoinCount = poses.length;
}
