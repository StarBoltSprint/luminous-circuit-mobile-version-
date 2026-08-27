/** LEFTOVER-LIGHT NAME TABLETS on empty ground BETWEEN Residual Archive and High Beacon.
 * Iri leftover light meeting Lumen's hail — names already true, never a lock,
 * never Hall scripture.
 * Not tablets.ts (those sit AT the archive). Not namestone.ts (hub↔archive).
 * Not residual.ts (archive↔canal). Not parentname.ts (archive↔overlook).
 * Not seam.ts (archive↔join). Not ledger.ts / shelves / nook (AT archive).
 * Not hail.ts / beam.ts (AT beacon). Not hubhail.ts (hub↔beacon).
 * Not hailchorus.ts (beacon↔ring). Not resthail.ts (terrace↔beacon).
 * Not tendhail.ts (canal↔beacon). Not hush.ts (beacon↔gate). Not westmark.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growNamehail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover violet — Iri's names already true, meeting Lumen's hail, never a lock. */
function leftoverHail() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a2230,
    roughness: 0.26,
    metalness: 0.4,
    emissive: 0x8a6cff,
    emissiveIntensity: 0.18,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.26,
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

/** Standing name tablet. 1.2 × 1.6 × 0.14 — leftover light, not Hall scripture. */
const BOX_W = 1.2;
const BOX_H = 1.6;
const BOX_D = 0.14;
/** Box center: height 1.6 sits on y=0. Tablet stands. */
const BOX_Y = 0.8;
/**
 * Asked band t=0.40..0.60 of archive→beacon. Skip hypot < 128 from
 * archive or < 128 from beacon — dens sit far apart, so the band holds
 * the BETWEEN strip. Archive (−540,−460) r=120. Beacon (780, 620) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_ARCHIVE = 128;
const SKIP_BEACON = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const NAMEHAIL_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipArchive: SKIP_ARCHIVE,
  skipBeacon: SKIP_BEACON,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nTablets(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, y: BOX_Y, tLo: T_LO, tHi: T_HI, w: BOX_W, h: BOX_H, d: BOX_D };
}

/**
 * Iri leftover-light name tablets on empty ground between DISTRICTS archive and beacon.
 * 3 BoxGeometry 1.2×1.6×0.14 (coarse 2) MeshPhysical 0x1a2230
 * emissive 0x8a6cff intensity 0.18 roughness 0.26 metalness 0.4
 * iridescence 0.44 clearcoat 0.4, evenly t=0.40..0.60 of the
 * archive→beacon segment, y=0.8. Skip hypot < 128 from archive or
 * < 128 from beacon. Iri leftover light meeting Lumen's hail — names
 * already true, never a lock, never Hall scripture. No tick.
 */
export function growNamehail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "namehail";
  group.add(root);

  const want = nTablets(coarse);
  const counts = emptyCounts(want);
  root.userData.namehailCounts = counts;
  root.userData.namehailCount = 0;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const archive = den("archive");
  const beacon = den("beacon");
  if (!archive || !beacon) return;

  const dx = beacon.x - archive.x;
  const dz = beacon.z - archive.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_ARCHIVE + 0.05) / dist;
  const tMax = 1 - (SKIP_BEACON + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = archive.x + dx * t;
    const z = archive.z + dz * t;
    if (Math.hypot(x - archive.x, z - archive.z) < SKIP_ARCHIVE) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    poses.push({ x, y: BOX_Y, z, rz: 0 });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), leftoverHail(), poses, root);

  counts.n = poses.length;
  root.userData.namehailCount = poses.length;
}
