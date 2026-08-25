/** Small crystal octa/tetra shards clustered at each DISTRICTS den. Not Hub. Instanced. Dark. No photos. */
import * as THREE from "three";
import { DISTRICTS, type District } from "./lore";

/**
 * Parent hooks with:
 *   laterOn(() => { try { growFacets(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function crystal(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.2,
    metalness: 0.36,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.64,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 380],
    clearcoat: 0.48,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function hueOf(kind: District["kind"]): "cyan" | "gold" | "violet" {
  switch (kind) {
    case "bridge":
    case "canal":
    case "market":
      return "cyan";
    case "foundry":
    case "archive":
    case "overlook":
    case "grove":
    case "wild":
      return "gold";
    default:
      return "violet";
  }
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

function nShards(i: number, coarse: boolean): number {
  if (coarse) return 3;
  return 4 + Math.min(4, Math.floor(hash(i, 21) * 5));
}

/**
 * Living-crystal chips around each den. Hub skip (r<90). 4–8 per den (coarse 3).
 * Scale 0.6–1.8. y 0.4–3. Instanced per cyan/gold/violet by kind.
 */
export function growFacets(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "facets";
  group.add(root);

  const cyan = crystal(0x0a2c38, 0x185868, 0.14);
  const gold = crystal(0x2c2212, 0x5a4020, 0.13);
  const violet = crystal(0x141022, 0x322456, 0.12);

  const cyanOcta: Pose[] = [];
  const cyanTetra: Pose[] = [];
  const goldOcta: Pose[] = [];
  const goldTetra: Pose[] = [];
  const violetOcta: Pose[] = [];
  const violetTetra: Pose[] = [];

  for (let d = 0; d < DISTRICTS.length; d++) {
    const den = DISTRICTS[d]!;
    if (Math.hypot(den.x, den.z) < 90) continue;
    const n = nShards(d, coarse);
    const hue = hueOf(den.kind);
    const octa = hue === "cyan" ? cyanOcta : hue === "gold" ? goldOcta : violetOcta;
    const tetra = hue === "cyan" ? cyanTetra : hue === "gold" ? goldTetra : violetTetra;

    for (let k = 0; k < n; k++) {
      const seed = d * 17 + k * 3;
      const a = (k / n) * Math.PI * 2 + hash(seed, 2) * 0.7;
      const rad = 14 + hash(seed, 4) * 24;
      const x = den.x + Math.cos(a) * rad;
      const z = den.z + Math.sin(a) * rad;
      if (Math.hypot(x, z) < 90) continue;
      const sx = 0.6 + hash(seed, 6) * 1.2;
      const sy = 0.6 + hash(seed, 8) * 1.2;
      const sz = 0.6 + hash(seed, 10) * 1.2;
      const pose: Pose = {
        x,
        y: 0.4 + hash(seed, 12) * 2.6,
        z,
        sx,
        sy,
        sz,
        rx: (hash(seed, 14) - 0.5) * 0.9,
        ry: hash(seed, 16) * Math.PI * 2,
        rz: (hash(seed, 18) - 0.5) * 0.7,
      };
      if (hash(seed, 20) > 0.46) tetra.push(pose);
      else octa.push(pose);
    }
  }

  const octaGeo = new THREE.OctahedronGeometry(1, 0);
  const tetraGeo = new THREE.TetrahedronGeometry(1, 0);

  stamp(octaGeo, cyan, cyanOcta, root);
  stamp(tetraGeo, cyan, cyanTetra, root);
  stamp(octaGeo, gold, goldOcta, root);
  stamp(tetraGeo, gold, goldTetra, root);
  stamp(octaGeo, violet, violetOcta, root);
  stamp(tetraGeo, violet, violetTetra, root);
}
