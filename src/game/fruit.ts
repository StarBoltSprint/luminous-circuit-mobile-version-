/** Hanging orchard fruit — small gold/violet octas in Syl's grove. Not houses, not kiln heat.
 * Parent hooks with:
 *   laterOn(() => { try { growFruit(group, coarse); } catch { } });
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

function crystal(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.18,
    metalness: 0.4,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.58,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 360],
    clearcoat: 0.5,
    clearcoatRoughness: 0.24,
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
  rx: number;
  ry: number;
  rz: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
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

function hang(
  grove: { x: number; z: number },
  n: number,
  seed: number,
): Pose[] {
  const poses: Pose[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + seed * 0.13) / n) * Math.PI * 2 + hash(i, seed + 2) * 0.55;
    const r = 16 + hash(i, seed + 4) * 32;
    const k = 0.32 + hash(i, seed + 8) * 0.42;
    poses.push({
      x: grove.x + Math.cos(a) * r,
      y: 3 + hash(i, seed + 6) * 4,
      z: grove.z + Math.sin(a) * r,
      sx: k,
      sy: k * (1.12 + hash(i, seed + 10) * 0.38),
      sz: k,
      rx: 0.12 + hash(i, seed + 12) * 0.38,
      ry: a + hash(i, seed + 14) * 0.8,
      rz: (hash(i, seed + 16) - 0.5) * 0.4,
    });
  }
  return poses;
}

/**
 * Syl's hanging grove fruit. 8–14 gold/violet octas (coarse 5) at DISTRICTS grove x,z.
 * y 3–7. Small. Instanced. Dark. Dummy matrix only. Not more houses.
 */
export function growFruit(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "fruit";
  group.add(root);

  const grove = den("grove");
  if (!grove) return;

  const goldN = coarse ? 3 : 8;
  const violetN = coarse ? 2 : 6;

  const gold = crystal(0x2c2212, 0x5a4020, 0.14);
  const violet = crystal(0x141022, 0x322456, 0.12);
  const geo = new THREE.OctahedronGeometry(1, 0);

  stamp(geo, gold, hang(grove, goldN, 5), root);
  stamp(geo, violet, hang(grove, violetN, 19), root);
}
