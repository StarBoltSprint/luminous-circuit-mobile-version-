/** LEFTOVER FIRST HOWL RESTS on empty ground BETWEEN Charge Canals
 * (−620, 96 r=130) and High Beacon (780, 620 r=120).
 * Seln's leftover Howl taking a pad-rest on the walk to Lumen's hail.
 * Not a dam, not a lock, not a beacon beam.
 * Not westmark.ts (overlook↔canal). Not tendrest.ts (canal↔terrace).
 * Not residual.ts (archive↔canal). Not joinflow.ts (canal↔join).
 * Not rill.ts (Hub→canal). Not resthail.ts (terrace↔beacon).
 * Not hubhail.ts (hub↔beacon). Not hailchorus.ts (beacon↔ring).
 * Not hush.ts (beacon↔gate). Not beam/hail (AT beacon).
 * Not grate.ts / sluice.ts / weir.ts (AT canal).
 * Parent hooks with:
 *   laterOn(() => { try { growTendhail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover-Howl cyan — Charge taking a pad-rest, never bottled, never a lock. */
function howlCyan() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a2230,
    roughness: 0.28,
    metalness: 0.35,
    emissive: 0x3ec8e0,
    emissiveIntensity: 0.22,
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

/** Cyan rest-pad. Radius 1.6, height 0.22 — a pad, not a box stick, not a dam. */
const PAD_R = 1.6;
const PAD_H = 0.22;
/** Cylinder center: height 0.22 sits on y=0. */
const PAD_Y = 0.12;
/**
 * Asked band t=0.40..0.60 of canal→beacon. Skip hypot < 138 from
 * canal or < 128 from beacon — dens sit far apart, so the band holds
 * the BETWEEN strip. Canal (−620, 96) r=130. Beacon (780, 620) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_CANAL = 138;
const SKIP_BEACON = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const TENDHAIL_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipCanal: SKIP_CANAL,
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
 * Leftover First Howl rest-pads on empty ground between DISTRICTS canal and beacon.
 * 3 CylinderGeometry r=1.6 h=0.22 (coarse 2) MeshPhysical 0x0a2230
 * emissive 0x3ec8e0 intensity 0.22 roughness 0.28 metalness 0.35
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * canal→beacon segment, y=0.12. Skip hypot < 138 from canal or
 * < 128 from beacon. Leftover First Howl rests here — not a dam,
 * not a lock, not a beacon beam. No tick.
 */
export function growTendhail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "tendhail";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.tendhailCounts = counts;
  root.userData.tendhailCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const canal = den("canal");
  const beacon = den("beacon");
  if (!canal || !beacon) return;

  const dx = beacon.x - canal.x;
  const dz = beacon.z - canal.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_CANAL + 0.05) / dist;
  const tMax = 1 - (SKIP_BEACON + 0.05) / dist;
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
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), howlCyan(), poses, root);

  counts.n = poses.length;
  root.userData.tendhailCount = poses.length;
}
