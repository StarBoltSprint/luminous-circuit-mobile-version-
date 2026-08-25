/** Kesh WILD LANDINGS — dark-cyan pads at the wild den Charge can choose a street on.
 * Offset around the den. Not street plates (trails.ts). Not light-discs at Join (discs.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growVeins(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkCyan() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x071e28,
    roughness: 0.22,
    metalness: 0.36,
    emissive: 0x1a6578,
    emissiveIntensity: 0.16,
    iridescence: 0.36,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [90, 340],
    clearcoat: 0.32,
    clearcoatRoughness: 0.34,
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

/** Walkable landing disc. Charge chooses a street on this pad, not a Join light-disc. */
const PAD_R = 3.2;
const PAD_H = 0.16;
const PAD_Y = PAD_H * 0.5;
/** Offset ring around the wild den heart — not the den center, not a street plate. */
const RING_R = 38;
const HUB_R = 90;
const N_FINE = 3;
const N_COARSE = 1;

function nPads(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Kesh wild landings at DISTRICTS kind==="wild" x,z. 3 CylinderGeometry
 * r=3.2 h=0.16 (coarse 1) offset around the den. MeshPhysical dark cyan.
 * Pads Charge can choose a street on. Hub skip (r<90).
 * Not trails street plates. Not Join light-discs.
 */
export function growVeins(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "veins";
  group.add(root);

  const want = nPads(coarse);
  const counts = { n: 0, want, r: PAD_R, h: PAD_H, ring: RING_R, y: PAD_Y };
  root.userData.padCounts = counts;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    ring: RING_R,
  };

  const wild = den("wild");
  if (!wild) return;
  if (Math.hypot(wild.x, wild.z) < HUB_R) return;

  const bridge = den("bridge");
  const aimX = bridge ? bridge.x - wild.x : -wild.x;
  const aimZ = bridge ? bridge.z - wild.z : -wild.z;
  const a0 = Math.atan2(aimZ, aimX);
  const gap = (Math.PI * 2) / N_FINE;

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const a = a0 + i * gap;
    const x = wild.x + Math.cos(a) * RING_R;
    const z = wild.z + Math.sin(a) * RING_R;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({
      x,
      y: PAD_Y,
      z,
      ry: Math.atan2(x - wild.x, z - wild.z),
    });
  }

  const segs = coarse ? 10 : 16;
  const geo = new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs);
  stamp(geo, darkCyan(), poses, root);
  counts.n = poses.length;
}
