/** Tal PATH ARCHES along the canal→join trail. Walk-under torus halves, not light-bridges.
 * Parent hooks with:
 *   laterOn(() => { try { growArches(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function cyanCrystal() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x163844,
    roughness: 0.16,
    metalness: 0.44,
    emissive: 0x2ee6ff,
    emissiveIntensity: 0.22,
    iridescence: 0.52,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

function goldCrystal() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.18,
    metalness: 0.46,
    emissive: 0xe8c56a,
    emissiveIntensity: 0.2,
    iridescence: 0.48,
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
  dummy.rotation.order = "XYZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, Math.PI / 2);
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

const ARCH_R = 4.2;
const TUBE = 0.18;
const ARCH_Y = 2.1;
const HUB_R = 90;
const N_FINE = 3;
const N_COARSE = 1;

function nArches(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, cyan: 0, gold: 0, want };
}

/**
 * Tal path arches on the canal→join trail only. 3 TorusGeometry half-arches
 * r=4.2 tube=0.18 (coarse 1). MeshPhysical cyan/gold. y=2.1, rotation.z = PI/2
 * so they span the trail. Hub skip (r<90). Not light-bridge spans (spans.ts).
 * Not street lamps (lamps.ts). Not Kael gates (gates.ts).
 */
export function growArches(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "arches";
  group.add(root);

  const want = nArches(coarse);
  const counts = emptyCounts(want);
  root.userData.archCounts = counts;
  root.userData.sizes = {
    r: ARCH_R,
    tube: TUBE,
    y: ARCH_Y,
    rz: Math.PI / 2,
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
  const yaw = Math.atan2(dx, dz);

  const cyan: Pose[] = [];
  const gold: Pose[] = [];

  for (let i = 0; i < want; i++) {
    const t = (i + 0.5) / want;
    const x = ax + dx * t;
    const z = az + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    const pose: Pose = { x, y: ARCH_Y, z, ry: yaw };
    if (i % 2 === 0) cyan.push(pose);
    else gold.push(pose);
  }

  const radial = coarse ? 6 : 8;
  const tubular = coarse ? 12 : 20;
  const geo = new THREE.TorusGeometry(ARCH_R, TUBE, radial, tubular, Math.PI);
  stamp(geo, cyanCrystal(), cyan, root);
  stamp(geo, goldCrystal(), gold, root);

  counts.n = cyan.length + gold.length;
  counts.cyan = cyan.length;
  counts.gold = gold.length;
}
