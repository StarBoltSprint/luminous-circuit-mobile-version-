/** QUIET-CRYSTAL GOLD PADS on empty ground BETWEEN Outer Foundry
 * (70, −680 r=130, Orren) and Gold Orchard (320, −980 r=130, Syl).
 * Charge became body, then fruit the kiln cannot sit in. Never chrome. Quiet crystal.
 * Not petal.ts (grove↔kiln fallen fruit). Not fruit.ts (hanging octas AT grove).
 * Not quietvein.ts (grove↔wild). Not fruitjoin.ts / fruitspan.ts / fruitdoor.ts /
 * fruitname.ts. Not kilnwild.ts / kilnspan.ts / kilndoor.ts / kilnname.ts.
 * Not restkiln.ts (terrace↔foundry). Not joinwalk.ts (foundry↔join).
 * Not heat / smoke / anvil / chimney / hearth / forge (AT kiln).
 * Not canopy.ts / boughs.ts / roots.ts (AT grove). Not westmark.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growKilnfruit(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Quiet-crystal gold — Charge became body, then fruit the kiln cannot sit in. */
function crystalGold() {
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

/** Quiet-crystal pad. Radius 1.5, height 0.2 — a pad, not chrome, not a seat. */
const PAD_R = 1.5;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of foundry→grove. Skip hypot < 138 from
 * foundry or < 138 from grove — dens sit far enough that the band holds
 * the BETWEEN strip. Foundry (70, −680) r=130. Grove (320, −980) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_FOUNDRY = 138;
const SKIP_GROVE = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const KILNFRUIT_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipFoundry: SKIP_FOUNDRY,
  skipGrove: SKIP_GROVE,
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
 * Quiet-crystal gold pads on empty ground between DISTRICTS foundry and grove.
 * 3 CylinderGeometry r=1.5 h=0.2 (coarse 2) MeshPhysical 0x24180c
 * emissive 0xc4a060 intensity 0.18 roughness 0.26 metalness 0.42
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * foundry→grove segment, y=0.11. Skip hypot < 138 from foundry or
 * < 138 from grove. Charge became body, then fruit the kiln cannot sit in.
 * Never chrome. Quiet crystal. No tick.
 */
export function growKilnfruit(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilnfruit";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.kilnfruitCounts = counts;
  root.userData.kilnfruitCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const foundry = den("foundry");
  const grove = den("grove");
  if (!foundry || !grove) return;

  const dx = grove.x - foundry.x;
  const dz = grove.z - foundry.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_FOUNDRY + 0.05) / dist;
  const tMax = 1 - (SKIP_GROVE + 0.05) / dist;
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
    if (Math.hypot(x - grove.x, z - grove.z) < SKIP_GROVE) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), crystalGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilnfruitCount = poses.length;
}
