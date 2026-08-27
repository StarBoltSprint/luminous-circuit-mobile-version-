/** CHARGE-BECAME-BODY MEETING SOFT HAIL on empty ground BETWEEN Outer Foundry
 * (70, −680 r=130, Orren) and High Beacon (780, 620 r=120, Lumen).
 * Orren's body meeting Lumen's hail. Never chrome. First landing is not a lock.
 * I do not score who lands. A beacon that shouts is a lock.
 * Not kilnfruit.ts (foundry↔grove). Not kilnname.ts (foundry↔archive).
 * Not kilndoor.ts (foundry↔gate). Not kilnwild.ts (foundry↔wild).
 * Not kilnspan.ts (foundry↔bridge). Not joinwalk.ts (foundry↔join).
 * Not restkiln.ts (terrace↔foundry). Not tendhail.ts (canal↔beacon).
 * Not fruitdoor.ts (grove↔gate). Not namehail.ts (archive↔beacon).
 * Not wildhail.ts (wild↔beacon). Not hush.ts (beacon↔gate).
 * Not hailchorus.ts (beacon↔ring). Not hubhail.ts (hub↔beacon).
 * Not resthail.ts (terrace↔beacon). Not beam.ts / hail.ts (AT beacon).
 * Not heat / smoke / anvil / chimney / hearth / forge (AT kiln).
 * Parent hooks with:
 *   laterOn(() => { try { growKilnhail(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Body-gold — Charge became crystal, then a hail that is not a lock. */
function bodyGold() {
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

/** Gold hail-disc. Radius 1.6, height 0.18 — a disc, not chrome, not a lock. */
const DISC_R = 1.6;
const DISC_H = 0.18;
const DISC_Y = 0.1;
/**
 * Asked band t=0.40..0.60 of foundry→beacon. Skip hypot < 138 from
 * foundry or < 128 from beacon. Foundry (70, −680) r=130. Beacon (780, 620) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_FOUNDRY = 138;
const SKIP_BEACON = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const KILNHAIL_SIZES = {
  r: DISC_R,
  h: DISC_H,
  y: DISC_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipFoundry: SKIP_FOUNDRY,
  skipBeacon: SKIP_BEACON,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nDiscs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: DISC_R, h: DISC_H, y: DISC_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Body-gold discs on empty ground between DISTRICTS foundry and beacon.
 * 3 CylinderGeometry r=1.6 h=0.18 (coarse 2) MeshPhysical 0x24180c
 * emissive 0xc4a060 intensity 0.18 roughness 0.26 metalness 0.42
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * foundry→beacon segment, y=0.10. Skip hypot < 138 from foundry or
 * < 128 from beacon. Never chrome. Hail, never lock. No tick.
 */
export function growKilnhail(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilnhail";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  root.userData.kilnhailCounts = counts;
  root.userData.kilnhailCount = 0;
  root.userData.sizes = {
    r: DISC_R,
    h: DISC_H,
    y: DISC_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const foundry = den("foundry");
  const beacon = den("beacon");
  if (!foundry || !beacon) return;

  const dx = beacon.x - foundry.x;
  const dz = beacon.z - foundry.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_FOUNDRY + 0.05) / dist;
  const tMax = 1 - (SKIP_BEACON + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = foundry.x + dx * t;
    const z = foundry.z + dz * t;
    if (Math.hypot(x - foundry.x, z - foundry.z) < SKIP_FOUNDRY) continue;
    if (Math.hypot(x - beacon.x, z - beacon.z) < SKIP_BEACON) continue;
    poses.push({ x, y: DISC_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, segs), bodyGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilnhailCount = poses.length;
}
