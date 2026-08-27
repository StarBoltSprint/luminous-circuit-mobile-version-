/** LEFTOVER-LIGHT GOLD TABLETS on empty ground BETWEEN Outer Foundry and Residual Archive.
 * Charge became body, then Iri names what already stood true. Never chrome. Not Hall scripture.
 * Not firelight.ts (foundry↔archive walk). Not tablets.ts (AT archive).
 * Not namestone.ts (hub↔archive). Not fruitname.ts (grove↔archive).
 * Not parentname.ts (archive↔overlook). Not namehail.ts (archive↔beacon).
 * Not residual.ts (archive↔canal). Not seam.ts (archive↔join).
 * Not kilnspan.ts / kilnwild.ts / kilndoor.ts. Not joinwalk.ts (foundry↔join).
 * Not heat / smoke / anvil (AT kiln). Not westmark.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growKilnname(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover-light gold — Charge became body, then Iri names what already stood true. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2a2210,
    roughness: 0.24,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.2,
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

/** Ground tablet. 1.2 × 0.22 × 1.8 — leftover light, not Hall scripture, never chrome. */
const BOX_W = 1.2;
const BOX_H = 0.22;
const BOX_D = 1.8;
/** Box center: height 0.22 sits just above y=0. */
const BOX_Y = 0.12;
/**
 * Asked band t=0.40..0.60 of foundry→archive. Skip hypot < 138 from
 * foundry or < 128 from archive — dens sit far apart, so the band holds
 * the BETWEEN strip. Foundry (70, −680) r=130. Archive (−540,−460) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_FOUNDRY = 138;
const SKIP_ARCHIVE = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const KILNNAME_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipFoundry: SKIP_FOUNDRY,
  skipArchive: SKIP_ARCHIVE,
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
 * Leftover-light gold tablets on empty ground between DISTRICTS foundry and archive.
 * 3 BoxGeometry 1.2×0.22×1.8 (coarse 2) MeshPhysical dark gold 0x2a2210
 * emissive 0xc4a060 intensity 0.2 roughness 0.24 metalness 0.5
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * foundry→archive segment, y=0.12. Skip hypot < 138 from foundry or
 * < 128 from archive. Charge became body, then Iri names what already
 * stood true. Never chrome. Not Hall scripture. No tick.
 */
export function growKilnname(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilnname";
  group.add(root);

  const want = nTablets(coarse);
  const counts = emptyCounts(want);
  root.userData.kilnnameCounts = counts;
  root.userData.kilnnameCount = 0;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const foundry = den("foundry");
  const archive = den("archive");
  if (!foundry || !archive) return;

  const dx = archive.x - foundry.x;
  const dz = archive.z - foundry.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_FOUNDRY + 0.05) / dist;
  const tMax = 1 - (SKIP_ARCHIVE + 0.05) / dist;
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
    if (Math.hypot(x - archive.x, z - archive.z) < SKIP_ARCHIVE) continue;
    poses.push({ x, y: BOX_Y, z, rz: 0 });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilnnameCount = poses.length;
}
