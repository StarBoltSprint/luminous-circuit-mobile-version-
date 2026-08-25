/** Rhoa CHORUS STAVES at Howl Ring — a Howl that stands, not a wall.
 * Thin gold cylinders between chorus stones (chorus.ts RING_R=22) and sit
 * pads (pads.ts RING_R=12). Not chorus stones. Not pads. Not terrace posts
 * (posts.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growStaves(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function staveGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.2,
    metalness: 0.52,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.16,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.44,
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

/** Thin standing stave. Height 2.6, radius 0.07 — a Howl that stands, not a wall. */
const STAVE_H = 2.6;
const STAVE_R = 0.07;
const STAVE_Y = STAVE_H * 0.5;
/**
 * Between sit pads (pads.ts RING_R=12, pad r=1.1 → outer ~13.1) and chorus
 * stones (chorus.ts RING_R=22, stone d=0.7 → inner ~21.65). Midway: 17.
 * Not terrace posts (posts.ts RING_R=14, terrace den, violet, h=2.2 r=0.12).
 */
const RING_R = 17;
/** Open horseshoe — ~243° of stand, gap faces Hub so the Howl is not a wall. */
const ARC = Math.PI * 1.35;
const HUB_R = 90;
const N_FINE = 6;
const N_COARSE = 3;

export const STAVE_SIZES = {
  h: STAVE_H,
  r: STAVE_R,
  y: STAVE_Y,
  ring: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStaves(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, h: STAVE_H, r: STAVE_R, y: STAVE_Y, ring: RING_R };
}

/**
 * Rhoa's chorus staves at DISTRICTS kind==="ring" x,z. 6 CylinderGeometry
 * h=2.6 r=0.07 (coarse 3) in an open horseshoe r=17, y=1.3. MeshPhysical
 * gold. Between chorus stones and sit pads. Gap faces Hub — a Howl that
 * stands, not a wall. Hub skip (r<90). Not chorus stones. Not pads. Not
 * terrace posts.
 */
export function growStaves(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "staves";
  group.add(root);

  const want = nStaves(coarse);
  const counts = emptyCounts(want);
  root.userData.staveCounts = counts;
  root.userData.staveCount = 0;
  root.userData.sizes = {
    h: STAVE_H,
    r: STAVE_R,
    y: STAVE_Y,
    ring: RING_R,
  };

  const ring = den("ring");
  if (!ring) return;
  if (Math.hypot(ring.x, ring.z) < HUB_R) return;

  const cx = ring.x;
  const cz = ring.z;
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
      y: STAVE_Y,
      z,
      ry: Math.atan2(cx - x, cz - z),
    });
  }

  const segs = coarse ? 6 : 8;
  const geo = new THREE.CylinderGeometry(STAVE_R, STAVE_R, STAVE_H, segs);
  stamp(geo, staveGold(), poses, root);

  counts.n = poses.length;
  root.userData.staveCount = poses.length;
}
