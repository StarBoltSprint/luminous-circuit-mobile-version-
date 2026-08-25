/** Syl GROVE ROOTS — Charge becoming fruit starts here, on the orchard den floor.
 * Thin dark-gold cylinders. Not hanging fruit (fruit.ts). Not rest benches (rest.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growRoots(group, coarse); } catch { } });
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

/** Thin floor root. Height 0.22–0.9, radius 0.08. Charge becoming fruit starts here. */
const ROOT_R = 0.08;
const H_MIN = 0.22;
const H_MAX = 0.9;
/** Loose scatter on the grove apron — under hanging fruit, not a rest bench. */
const RING_R = 18;
const RING_SPREAD = 10;
const HUB_R = 90;
const N_FINE = 6;
const N_COARSE = 3;
/** Slight lean so Charge can find a street into fruit. */
const TILT = 0.38;

export const ROOT_SIZES = {
  r: ROOT_R,
  hMin: H_MIN,
  hMax: H_MAX,
  ring: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nRoots(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: ROOT_R, hMin: H_MIN, hMax: H_MAX, ring: RING_R };
}

/**
 * Syl's grove roots at DISTRICTS kind==="grove" x,z. 6 CylinderGeometry
 * r=0.08 h=0.22–0.9 (coarse 3) along the orchard den floor. MeshPhysical
 * dark gold. Slight rotation. Charge becoming fruit starts here.
 * Hub skip (r<90). Not hanging fruit. Not rest benches.
 */
export function growRoots(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "roots";
  group.add(root);

  const want = nRoots(coarse);
  const counts = emptyCounts(want);
  root.userData.rootCounts = counts;
  root.userData.rootCount = 0;
  root.userData.sizes = {
    r: ROOT_R,
    hMin: H_MIN,
    hMax: H_MAX,
    ring: RING_R,
    y: H_MIN * 0.5,
  };

  const grove = den("grove");
  if (!grove) return;
  if (Math.hypot(grove.x, grove.z) < HUB_R) return;

  const span = H_MAX - H_MIN;
  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const a = ((i + 0.13) / want) * Math.PI * 2 + hash(i, 3) * 0.4;
    const r = RING_R + (hash(i, 5) - 0.5) * RING_SPREAD;
    const h = want === 1 ? (H_MIN + H_MAX) * 0.5 : H_MIN + (i / (want - 1)) * span;
    const x = grove.x + Math.cos(a) * r;
    const z = grove.z + Math.sin(a) * r;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({
      x,
      y: h * 0.5,
      z,
      sx: 1,
      sy: h,
      sz: 1,
      rx: (hash(i, 11) - 0.5) * TILT,
      ry: a + hash(i, 13) * 0.7,
      rz: (hash(i, 17) - 0.5) * TILT,
    });
  }

  const segs = coarse ? 6 : 8;
  const geo = new THREE.CylinderGeometry(ROOT_R, ROOT_R, 1, segs);
  stamp(geo, darkGold(), poses, root);
  counts.n = poses.length;
  root.userData.rootCount = poses.length;
}
