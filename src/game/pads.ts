/** Rhoa HOWL RING PADS — thin sit discs around the Outer Howl den.
 * Sit without closing. Not chorus stones (chorus.ts). Not terrace benches
 * (rest.ts). Not mosaic tiles (mosaic.ts). Not light-disc travel (discs.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growPads(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

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

/** Thin sit-disc. Radius of a howl rest, height of a street memory. */
const PAD_R = 1.1;
const PAD_H = 0.08;
/** Cylinder center: height 0.08 sits on y=0. */
const PAD_Y = PAD_H * 0.5;
/**
 * Inside chorus stones (chorus.ts RING_R=22) and the ring den's inner hoop
 * (grounds.ts r=28). A sit, not a standing stone.
 */
const RING_R = 12;
/** Open horseshoe — ~243° of sit, gap faces Hub so the gather never closes. */
const ARC = Math.PI * 1.35;
const HUB_R = 90;
const N_FINE = 6;
const N_COARSE = 3;

export const PAD_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  ring: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPads(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Rhoa's Howl Ring sit pads at DISTRICTS kind==="ring" x,z. 6 CylinderGeometry
 * r=1.1 h=0.08 (coarse 3) in an open horseshoe r=12, y=0.04. MeshPhysical
 * dark gold. Gap faces Hub — sit without closing. Hub skip (r<90).
 * Not chorus stones. Not Mira's terrace benches. Not Hub mosaic tiles.
 */
export function growPads(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "pads";
  group.add(root);

  const want = nPads(coarse);
  const counts = { n: 0, want, r: RING_R, y: PAD_Y };
  root.userData.padCounts = counts;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
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
      y: PAD_Y,
      z,
      ry: Math.atan2(cx - x, cz - z),
    });
  }

  const segs = coarse ? 8 : 12;
  const geo = new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs);
  stamp(geo, darkGold(), poses, root);
  counts.n = poses.length;
}
