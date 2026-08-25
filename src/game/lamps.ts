/** Street LAMPS along the canal→join trail. Path posts, not Hub plaza lamps.
 * Parent hooks with:
 *   laterOn(() => { try { growLamps(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkPost() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a140c,
    roughness: 0.42,
    metalness: 0.34,
    emissive: 0x3a2c16,
    emissiveIntensity: 0.08,
    iridescence: 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    transparent: false,
  });
}

function goldBulb() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.22,
    metalness: 0.48,
    emissive: 0xd4a050,
    emissiveIntensity: 0.16,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
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
  group.add(mesh);
}

const POST_H = 4.2;
const POST_R = 0.12;
const BULB_R = 0.22;
const SIDE = 3.6;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

function nLamps(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, posts: 0, bulbs: 0, want };
}

/**
 * Street lamps on the canal→join trail only. 5 CylinderGeometry posts
 * h=4.2 r=0.12 + gold SphereGeometry bulbs r=0.22 (coarse 3). Instanced.
 * MeshPhysical dark gold — a path light, not a flare. Hub skip (r<90).
 * Not the Hub plaza lamp ring already stamped in world.ts.
 */
export function growLamps(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "lamps";
  group.add(root);

  const want = nLamps(coarse);
  const counts = emptyCounts(want);
  root.userData.lampCounts = counts;
  root.userData.sizes = {
    postH: POST_H,
    postR: POST_R,
    bulbR: BULB_R,
    side: SIDE,
    yPost: POST_H * 0.5,
    yBulb: POST_H + BULB_R * 0.55,
  };

  const canal = den("canal");
  const join = den("market");
  if (!canal || !join) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R || Math.hypot(join.x, join.z) < HUB_R) return;

  const dx0 = join.x - canal.x;
  const dz0 = join.z - canal.z;
  const dist0 = Math.hypot(dx0, dz0) || 1;
  const ta = Math.min(0.28, (canal.radius * 0.62) / dist0);
  const tb = Math.min(0.28, (join.radius * 0.62) / dist0);
  const ax = canal.x + dx0 * ta;
  const az = canal.z + dz0 * ta;
  const bx = join.x - dx0 * tb;
  const bz = join.z - dz0 * tb;
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz) || 1;
  const ux = dx / dist;
  const uz = dz / dist;
  const px = -uz;
  const pz = ux;
  const yaw = Math.atan2(dx, dz);

  const posts: Pose[] = [];
  const bulbs: Pose[] = [];
  const yPost = POST_H * 0.5;
  const yBulb = POST_H + BULB_R * 0.55;

  for (let i = 0; i < want; i++) {
    const t = (i + 0.5) / want;
    const side = i % 2 === 0 ? 1 : -1;
    const x = ax + dx * t + px * SIDE * side;
    const z = az + dz * t + pz * SIDE * side;
    if (Math.hypot(x, z) < HUB_R) continue;
    posts.push({ x, y: yPost, z, ry: yaw });
    bulbs.push({ x, y: yBulb, z, ry: yaw });
  }

  const segs = coarse ? 6 : 8;
  stamp(new THREE.CylinderGeometry(POST_R, POST_R, POST_H, segs), darkPost(), posts, root);
  stamp(new THREE.SphereGeometry(BULB_R, segs, segs), goldBulb(), bulbs, root);

  counts.n = posts.length;
  counts.posts = posts.length;
  counts.bulbs = bulbs.length;
}
