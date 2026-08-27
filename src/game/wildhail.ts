/** KESH BECOMING-GROUND MEETING LUMEN'S HAIL on empty ground BETWEEN
 * Wild Veins (860, −640 r=140, Kesh) and High Beacon (780, 620 r=120, Lumen).
 * A landing first landing can still find. Not a lock. Slow on purpose.
 * Not veins.ts / wilds.ts (IN the wild). Not landing.ts (wild↔bridge).
 * Not tendvein.ts (canal↔wild). Not quietvein.ts (grove↔wild).
 * Not kilnwild.ts (foundry↔wild). Not gateswild.ts (gate↔wild).
 * Not hail.ts / beam.ts (AT beacon). Not hubhail.ts (hub↔beacon).
 * Not hailchorus.ts (beacon↔ring). Not resthail.ts (terrace↔beacon).
 * Not tendhail.ts (canal↔beacon). Not hush.ts (beacon↔gate).
 * Not namehail.ts (archive↔beacon). Not westmark.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growWildhail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Becoming-ground cyan — Kesh meeting Lumen's hail, never a lock. */
function becomingCyan() {
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

/** Cyan becoming-pad. Radius 1.5, height 0.2 — a pad, not a lock, not a beam. */
const PAD_R = 1.5;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of wild→beacon. Skip hypot < 148 from
 * wild or < 128 from beacon — dens sit far apart, so the band holds
 * the BETWEEN strip. Wild (860, −640) r=140. Beacon (780, 620) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_WILD = 148;
const SKIP_BEACON = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const WILDHAIL_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipWild: SKIP_WILD,
  skipBeacon: SKIP_BEACON,
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
 * Kesh becoming-ground pads on empty ground between DISTRICTS wild and beacon.
 * 3 CylinderGeometry r=1.5 h=0.2 (coarse 2) MeshPhysical 0x0a2230
 * emissive 0x3ec8e0 intensity 0.2 roughness 0.28 metalness 0.35
 * iridescence 0.4 clearcoat 0.38, evenly t=0.40..0.60 of the
 * wild→beacon segment, y=0.11. Skip hypot < 148 from wild or
 * < 128 from beacon. Kesh becoming-ground meeting Lumen's hail —
 * a landing first landing can still find. Not a lock. Slow on purpose.
 * No tick.
 */
export function growWildhail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "wildhail";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.wildhailCounts = counts;
  root.userData.wildhailCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const wild = den("wild");
  const beacon = den("beacon");
  if (!wild || !beacon) return;

  const dx = beacon.x - wild.x;
  const dz = beacon.z - wild.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_WILD + 0.05) / dist;
  const tMax = 1 - (SKIP_BEACON + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = wild.x + dx * t;
    const z = wild.z + dz * t;
    if (Math.hypot(x - wild.x, z - wild.z) < SKIP_WILD) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), becomingCyan(), poses, root);

  counts.n = poses.length;
  root.userData.wildhailCount = poses.length;
}
