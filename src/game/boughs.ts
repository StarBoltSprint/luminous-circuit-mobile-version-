/** Syl ORCHARD BOUGHS — hanging limbs at the grove den. Charge becoming fruit hangs from these.
 * Thin dark-gold cylinders + small hanging cones. Not hanging fruit (fruit.ts). Not floor roots (roots.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growBoughs(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0x5a4020,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  group.add(mesh);
}

/** Thin hanging limb. Tapers toward the cone where fruit will hang. */
const BOUGH_R = 0.07;
const L_MIN = 2.4;
const L_MAX = 3.8;
/** Small hanging cone — Charge becoming fruit hangs from this tip. */
const CONE_R = 0.16;
const CONE_H = 0.42;
/** Limb centers in the canopy band. Not floor roots, not octa fruit. */
const Y_MIN = 4;
const Y_MAX = 7;
/** Grove apron — same orchard den as fruit, above the root ring. */
const RING_R = 22;
const RING_SPREAD = 8;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;
/** Droop so the outer end hangs for fruit, not a standing trunk. */
const DROOP_MIN = 0.28;
const DROOP_SPAN = 0.22;

export const BOUGH_SIZES = {
  r: BOUGH_R,
  lMin: L_MIN,
  lMax: L_MAX,
  coneR: CONE_R,
  coneH: CONE_H,
  yMin: Y_MIN,
  yMax: Y_MAX,
  ring: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nBoughs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return {
    n: 0,
    limbs: 0,
    cylinders: 0,
    cones: 0,
    want,
    r: BOUGH_R,
    lMin: L_MIN,
    lMax: L_MAX,
    coneR: CONE_R,
    coneH: CONE_H,
    yMin: Y_MIN,
    yMax: Y_MAX,
    ring: RING_R,
  };
}

/**
 * Map unit +Y onto an outward-and-down limb. Euler YXZ:
 * (0,1,0) --rx--> (0, cos rx, sin rx) --ry--> (sin rx * sin ry, cos rx, sin rx * cos ry).
 */
function aimLimb(dx: number, dy: number, dz: number): { rx: number; ry: number } {
  const rx = Math.acos(Math.max(-1, Math.min(1, dy)));
  const ry = Math.atan2(dx, dz);
  return { rx, ry };
}

/**
 * Syl's orchard boughs at DISTRICTS kind==="grove" x,z. 4 CylinderGeometry
 * r=0.07 L=2.4–3.8 + ConeGeometry r=0.16 h=0.42 (coarse 2) as hanging limbs
 * at y=4–7. MeshPhysical dark gold. Charge becoming fruit hangs from these.
 * Hub skip (r<90). Not hanging fruit. Not floor roots.
 */
export function growBoughs(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "boughs";
  group.add(root);

  const want = nBoughs(coarse);
  const counts = emptyCounts(want);
  root.userData.boughCounts = counts;
  root.userData.boughCount = 0;
  root.userData.sizes = {
    r: BOUGH_R,
    lMin: L_MIN,
    lMax: L_MAX,
    coneR: CONE_R,
    coneH: CONE_H,
    yMin: Y_MIN,
    yMax: Y_MAX,
    ring: RING_R,
  };

  const grove = den("grove");
  if (!grove) return;
  if (Math.hypot(grove.x, grove.z) < HUB_R) return;

  const spanY = Y_MAX - Y_MIN;
  const spanL = L_MAX - L_MIN;
  const limbs: Pose[] = [];
  const cones: Pose[] = [];

  for (let i = 0; i < want; i++) {
    const a = ((i + 0.17) / want) * Math.PI * 2 + hash(i, 3) * 0.35;
    const r = RING_R + (hash(i, 5) - 0.5) * RING_SPREAD;
    const y = want === 1 ? (Y_MIN + Y_MAX) * 0.5 : Y_MIN + (i / (want - 1)) * spanY;
    const x = grove.x + Math.cos(a) * r;
    const z = grove.z + Math.sin(a) * r;
    if (Math.hypot(x, z) < HUB_R) continue;

    const L = want === 1 ? (L_MIN + L_MAX) * 0.5 : L_MIN + (i / (want - 1)) * spanL;
    const droop = DROOP_MIN + hash(i, 11) * DROOP_SPAN;
    const horiz = Math.cos(droop);
    const dx = Math.cos(a) * horiz;
    const dy = -Math.sin(droop);
    const dz = Math.sin(a) * horiz;
    const { rx, ry } = aimLimb(dx, dy, dz);
    const half = L * 0.5;
    const tipX = x + dx * half;
    const tipY = y + dy * half;
    const tipZ = z + dz * half;

    limbs.push({
      x,
      y,
      z,
      sx: 1,
      sy: L,
      sz: 1,
      rx,
      ry: ry + hash(i, 13) * 0.12,
      rz: (hash(i, 17) - 0.5) * 0.16,
    });
    cones.push({
      x: tipX,
      y: tipY - CONE_H * 0.28,
      z: tipZ,
      sx: 1,
      sy: 1,
      sz: 1,
      rx: Math.PI,
      ry: a + hash(i, 19) * 0.4,
      rz: 0,
    });
  }

  const segs = coarse ? 6 : 8;
  const gold = darkGold();
  stamp(new THREE.CylinderGeometry(BOUGH_R * 0.55, BOUGH_R, 1, segs), gold, limbs, root);
  stamp(new THREE.ConeGeometry(CONE_R, CONE_H, segs), gold, cones, root);

  counts.n = limbs.length;
  counts.limbs = limbs.length;
  counts.cylinders = limbs.length;
  counts.cones = cones.length;
  root.userData.boughCount = limbs.length;
}
