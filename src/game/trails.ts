/** Walkable ground streets between dens. Thin dark-cyan plates on y=0.08.
 * Not Tal's light-bridge arcs — those already exist. These are STREET plates you walk on.
 * Parent hooks with:
 *   laterOn(() => { try { growTrails(group, coarse); } catch { } });
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

/** canal–join–foundry, wild–bridge–gate, terrace–ring. Join is the market den. */
const LINKS: [(typeof DISTRICTS)[number]["kind"], (typeof DISTRICTS)[number]["kind"]][] = [
  ["canal", "market"],
  ["market", "foundry"],
  ["wild", "bridge"],
  ["bridge", "gate"],
  ["terrace", "ring"],
];

const Y = 0.08;
const TALL = 0.12;
const STEP = 14;

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

/**
 * Ground-path plates dens can walk. Hub skip (r<90). Instanced box 4–6 wide, 0.12 tall.
 * MeshPhysical dark, emissive faint cyan. coarse: skip every other segment.
 */
export function growTrails(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "trails";
  group.add(root);

  const plates: Pose[] = [];
  const perLink: number[] = [];

  for (let s = 0; s < LINKS.length; s++) {
    const a = den(LINKS[s]![0]);
    const b = den(LINKS[s]![1]);
    if (!a || !b) {
      perLink.push(0);
      continue;
    }
    if (Math.hypot(a.x, a.z) < 90 || Math.hypot(b.x, b.z) < 90) {
      perLink.push(0);
      continue;
    }

    const dx0 = b.x - a.x;
    const dz0 = b.z - a.z;
    const dist0 = Math.hypot(dx0, dz0) || 1;
    const ta = Math.min(0.28, (a.radius * 0.62) / dist0);
    const tb = Math.min(0.28, (b.radius * 0.62) / dist0);
    const ax = a.x + dx0 * ta;
    const az = a.z + dz0 * ta;
    const bx = b.x - dx0 * tb;
    const bz = b.z - dz0 * tb;
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(dx, dz);
    const steps = Math.max(2, Math.round(dist / STEP));
    const along = dist / steps;
    let n = 0;

    for (let i = 0; i < steps; i++) {
      if (coarse && i % 2 === 1) continue;
      const t = (i + 0.5) / steps;
      const x = ax + dx * t;
      const z = az + dz * t;
      if (Math.hypot(x, z) < 90) continue;
      const w = 4 + hash(i + s * 17, 5) * 2;
      plates.push({
        x,
        y: Y,
        z,
        sx: w,
        sy: TALL,
        sz: along * 0.94,
        ry: yaw,
      });
      n += 1;
    }
    perLink.push(n);
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x071e28,
    roughness: 0.38,
    metalness: 0.28,
    emissive: 0x1a6578,
    emissiveIntensity: 0.14,
    iridescence: 0.28,
    iridescenceIOR: 1.3,
    clearcoat: 0.22,
    clearcoatRoughness: 0.42,
    transparent: false,
  });
  stamp(geo, material, plates, root);
  root.userData.segmentCounts = {
    "canal-join": perLink[0] ?? 0,
    "join-foundry": perLink[1] ?? 0,
    "wild-bridge": perLink[2] ?? 0,
    "bridge-gate": perLink[3] ?? 0,
    "terrace-ring": perLink[4] ?? 0,
    total: plates.length,
  };
}
