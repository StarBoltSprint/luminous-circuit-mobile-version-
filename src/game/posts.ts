/** Mira TERRACE WARD POSTS — slim cylinders along the Crystal Terraces den rim.
 * Soft ward, not a wall. Gap faces Hub / arriving steps.
 * Not rest benches (rest.ts). Not terrace steps (steps.ts). Not gate posts (gates.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growPosts(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function wardViolet() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x141022,
    roughness: 0.2,
    metalness: 0.38,
    emissive: 0x322456,
    emissiveIntensity: 0.16,
    iridescence: 0.52,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.46,
    clearcoatRoughness: 0.24,
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

/** Slim ward post. Height 2.2, radius 0.12 — a mark, not a gate (1.2×14) or a bench. */
const POST_H = 2.2;
const POST_R = 0.12;
const POST_Y = POST_H * 0.5;
/**
 * Outside rest.ts RING_R=8 (bench half-width 1.4 → outer ~9.4).
 * Inside steps.ts OUTER=52 (innermost tread ~41). Rim of the rest den, not a wall.
 */
const RING_R = 14;
/** Open horseshoe — ~243° of ward, gap faces Hub so the rest stays a walk. */
const ARC = Math.PI * 1.35;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

export const POST_SIZES = {
  h: POST_H,
  r: POST_R,
  y: POST_Y,
  ring: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPosts(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, h: POST_H, r: POST_R, y: POST_Y, ring: RING_R };
}

/**
 * Mira's terrace ward posts at DISTRICTS kind==="terrace" x,z. 4 CylinderGeometry
 * h=2.2 r=0.12 (coarse 2) along the den rim. MeshPhysical violet. Open toward
 * Hub so the ward is not a wall. Hub skip (r<90). Not rest benches. Not terrace
 * steps. Not Kael gate posts.
 */
export function growPosts(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "posts";
  group.add(root);

  const want = nPosts(coarse);
  const counts = emptyCounts(want);
  root.userData.postCounts = counts;
  root.userData.postCount = 0;
  root.userData.sizes = {
    h: POST_H,
    r: POST_R,
    y: POST_Y,
    ring: RING_R,
  };

  const terrace = den("terrace");
  if (!terrace) return;
  if (Math.hypot(terrace.x, terrace.z) < HUB_R) return;

  const cx = terrace.x;
  const cz = terrace.z;
  const toHub = Math.atan2(-cz, -cx);
  const aMid = toHub + Math.PI;
  const step = want <= 1 ? 0 : ARC / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const a = aMid + (i - (want - 1) * 0.5) * step;
    const x = cx + Math.cos(a) * RING_R;
    const z = cz + Math.sin(a) * RING_R;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({
      x,
      y: POST_Y,
      z,
      ry: Math.atan2(cx - x, cz - z),
    });
  }

  const segs = coarse ? 6 : 8;
  const geo = new THREE.CylinderGeometry(POST_R, POST_R, POST_H, segs);
  stamp(geo, wardViolet(), poses, root);

  counts.n = poses.length;
  root.userData.postCount = poses.length;
}
