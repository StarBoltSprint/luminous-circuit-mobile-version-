/** Rhoa OUTER HOWL stones — standing boxes around the ring den.
 * Civic gather that does not close. Not Hub fountain (fountain.ts).
 * Not terrace steps (steps.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growChorus(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

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
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
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

/** Standing howl-stone. Thin face toward the den so the gather stays a walk, not a wall. */
const STONE_W = 1.1;
const STONE_H = 2.4;
const STONE_D = 0.7;
/** Box center: height 2.4 sits on y=0. */
const STONE_Y = 1.2;
const RING_R = 22;
const HUB_R = 90;
const N_FINE = 8;
const N_COARSE = 5;

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Rhoa's Outer Howl stones at DISTRICTS kind==="ring" x,z. 8 BoxGeometry
 * 1.1×2.4×0.7 (coarse 5) in a circle r=22, y=1.2. MeshPhysical dark violet.
 * Gap faces Hub — civic gather that does not close. Hub skip (r<90).
 * Not the Hub breath basin. Not Mira's terrace steps.
 */
export function growChorus(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "chorus";
  group.add(root);

  const want = nStones(coarse);
  const counts = { n: 0, want, r: RING_R, y: STONE_Y };
  root.userData.stoneCounts = counts;
  root.userData.sizes = {
    w: STONE_W,
    h: STONE_H,
    d: STONE_D,
    y: STONE_Y,
    r: RING_R,
  };

  const ring = den("ring");
  if (!ring) return;
  if (Math.hypot(ring.x, ring.z) < HUB_R) return;

  const gap = (Math.PI * 2) / want;
  const toHub = Math.atan2(-ring.z, -ring.x);
  const a0 = toHub + gap * 0.5;

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const a = a0 + i * gap;
    const x = ring.x + Math.cos(a) * RING_R;
    const z = ring.z + Math.sin(a) * RING_R;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({
      x,
      y: STONE_Y,
      z,
      ry: Math.atan2(x - ring.x, z - ring.z),
    });
  }

  const geo = new THREE.BoxGeometry(STONE_W, STONE_H, STONE_D);
  stamp(geo, darkViolet(), poses, root);
  counts.n = poses.length;
}
