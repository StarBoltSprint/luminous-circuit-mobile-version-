/** Tal SPAN PYLONS at the light-bridge den — paired landings the light-span can mean.
 * Cylinders, not decks (spans.ts), not path arches (arches.ts), not lamps (lamps.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growPylons(group, coarse); } catch { } });
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

/** Landing post. Height 5.4, radius 0.22 — a pair the span can mean, not a deck. */
const PYLON_H = 5.4;
const PYLON_R = 0.22;
const PYLON_Y = PYLON_H * 0.5;
/** Half-gap of a pair, just outside dual span decks (±0.92, half-width 0.31). */
const SIDE = 1.8;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

/**
 * Same civic links as spans.ts that touch the light-bridge den.
 * `s` is the spans LINKS index so coarse skip agrees (odd spans drop).
 */
const LANDINGS: [(typeof DISTRICTS)[number]["kind"], (typeof DISTRICTS)[number]["kind"], number][] = [
  ["wild", "bridge", 3],
  ["bridge", "gate", 4],
];

export const PYLON_SIZES = {
  h: PYLON_H,
  r: PYLON_R,
  y: PYLON_Y,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPylons(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, pairs: 0, want, h: PYLON_H, r: PYLON_R };
}

/**
 * Tal span pylons at DISTRICTS kind==="bridge" x,z. 4 CylinderGeometry
 * h=5.4 r=0.22 (coarse 2) paired as landings for the light-span. MeshPhysical
 * cyan. Hub skip (r<90). Not light-bridge decks (spans.ts). Not path arches
 * (arches.ts). Not street lamps (lamps.ts).
 */
export function growPylons(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "pylons";
  group.add(root);

  const want = nPylons(coarse);
  const counts = emptyCounts(want);
  root.userData.pylonCounts = counts;
  root.userData.pylonCount = 0;
  root.userData.sizes = {
    h: PYLON_H,
    r: PYLON_R,
    y: PYLON_Y,
    side: SIDE,
  };

  const bridge = den("bridge");
  if (!bridge) return;
  if (Math.hypot(bridge.x, bridge.z) < HUB_R) return;

  const poses: Pose[] = [];

  for (let i = 0; i < LANDINGS.length; i++) {
    const link = LANDINGS[i]!;
    const s = link[2];
    if (coarse && s % 2 === 1) continue;
    const a = den(link[0]);
    const b = den(link[1]);
    if (!a || !b) continue;
    if (Math.hypot(a.x, a.z) < HUB_R || Math.hypot(b.x, b.z) < HUB_R) continue;

    const dx0 = b.x - a.x;
    const dz0 = b.z - a.z;
    const dist0 = Math.hypot(dx0, dz0) || 1;
    const ta = Math.min(0.22, (a.radius * 0.72) / dist0);
    const tb = Math.min(0.22, (b.radius * 0.72) / dist0);
    const ax = a.x + dx0 * ta;
    const az = a.z + dz0 * ta;
    const bx = b.x - dx0 * tb;
    const bz = b.z - dz0 * tb;
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz) || 1;
    const px = -dz / dist;
    const pz = dx / dist;
    const yaw = Math.atan2(dx, dz);

    const onA = link[0] === "bridge";
    const lx = onA ? ax : bx;
    const lz = onA ? az : bz;

    for (const side of [1, -1]) {
      const x = lx + px * SIDE * side;
      const z = lz + pz * SIDE * side;
      if (Math.hypot(x, z) < HUB_R) continue;
      poses.push({ x, y: PYLON_Y, z, ry: yaw });
    }
  }

  const segs = coarse ? 6 : 8;
  const geo = new THREE.CylinderGeometry(PYLON_R, PYLON_R, PYLON_H, segs);
  stamp(geo, cyanCrystal(), poses, root);

  counts.n = poses.length;
  counts.pairs = poses.length >> 1;
  root.userData.pylonCount = poses.length;
}
