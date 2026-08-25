/** Mira TERRACE steps — wide dark-violet boxes climbing toward the rest den.
 * Not canal-bank rails (rails.ts). Not Hub floors (grounds.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growSteps(group, coarse); } catch { } });
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

function darkViolet() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x141022,
    roughness: 0.24,
    metalness: 0.32,
    emissive: 0x322456,
    emissiveIntensity: 0.14,
    iridescence: 0.48,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
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
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
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

/** Wide sit-step. Width across the approach, depth along it. */
const STEP_W = 10;
const STEP_H = 0.4;
const STEP_D = 2.2;
/** Centers: 0.2, 0.6, 1.0… so bottoms sit on the prior tread. */
const Y0 = 0.2;
const RISE = 0.4;
/** Hub-side distance of the lowest tread from the terrace den. */
const OUTER = 52;
const HUB_R = 90;

function nSteps(coarse: boolean): number {
  if (coarse) return 3;
  return 4 + Math.min(2, Math.floor(hash(7, 21) * 3));
}

/**
 * Mira's rest steps at DISTRICTS kind==="terrace" x,z. 4–6 BoxGeometry
 * 10×0.4×2.2 (coarse 3) stepping up toward the den. MeshPhysical dark violet.
 * y 0.2, 0.6, 1.0…. Hub skip (r<90). Not canal rails. Not Hub floors.
 */
export function growSteps(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "steps";
  group.add(root);

  const want = nSteps(coarse);
  const counts = { n: 0, want, y0: Y0, rise: RISE };
  root.userData.stepCounts = counts;
  root.userData.sizes = {
    w: STEP_W,
    h: STEP_H,
    d: STEP_D,
    y0: Y0,
    rise: RISE,
    outer: OUTER,
  };

  const terrace = den("terrace");
  if (!terrace) return;
  if (Math.hypot(terrace.x, terrace.z) < HUB_R) return;

  const span = Math.hypot(terrace.x, terrace.z) || 1;
  const ux = terrace.x / span;
  const uz = terrace.z / span;
  const yaw = Math.atan2(ux, uz);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const dist = OUTER - i * STEP_D;
    const x = terrace.x - ux * dist;
    const z = terrace.z - uz * dist;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({
      x,
      y: Y0 + i * RISE,
      z,
      sx: 1,
      sy: 1,
      sz: 1,
      ry: yaw,
    });
  }

  const geo = new THREE.BoxGeometry(STEP_W, STEP_H, STEP_D);
  stamp(geo, darkViolet(), poses, root);
  counts.n = poses.length;
}
