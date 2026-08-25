/** Hub plaza MOSAIC — thin gold/cyan inlay tiles in a ring around the Core Spire.
 * Not grounds.ts den floor plates. Not the Hub breath basin (fountain.ts).
 * Not Nesh witness lens (lens.ts). Not world.ts shader mosaic disc.
 * Parent hooks with:
 *   laterOn(() => { try { growMosaic(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";

function goldTile() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.18,
    metalness: 0.48,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.16,
    iridescence: 0.46,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.44,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

function cyanTile() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0c3340,
    roughness: 0.16,
    metalness: 0.4,
    emissive: 0x1a6578,
    emissiveIntensity: 0.16,
    iridescence: 0.5,
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

/** Thin inlay tile. Square face, height of a street memory, not a floor plate. */
const TILE_W = 2.4;
const TILE_H = 0.06;
const TILE_D = 2.4;
/** plazaHeart top in world.ts is 3.4 + 1.2/2 = 4.0. Center sits half-height above. */
const HEART_TOP = 4.0;
const TILE_Y = HEART_TOP + TILE_H * 0.5;
/** Outside Hub breath basin (r=6), inside first plaza inlay torus (r=22). */
const RING_R = 14;
const N_FINE = 8;
const N_COARSE = 4;

export const MOSAIC_SIZES = {
  w: TILE_W,
  h: TILE_H,
  d: TILE_D,
  y: TILE_Y,
  r: RING_R,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nTiles(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Hub plaza mosaic at 0,0. 8 BoxGeometry 2.4×0.06×2.4 (coarse 4) instanced
 * in a ring r=14. MeshPhysical gold/cyan alternate. Sit on plazaHeart top.
 * Not den floor plates. Not the breath basin. Not the witness lens.
 */
export function growMosaic(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "mosaic";
  group.add(root);

  const want = nTiles(coarse);
  const counts = { n: 0, gold: 0, cyan: 0, want, r: RING_R, y: TILE_Y };
  root.userData.tileCounts = counts;
  root.userData.sizes = {
    w: TILE_W,
    h: TILE_H,
    d: TILE_D,
    y: TILE_Y,
    r: RING_R,
  };

  const gold: Pose[] = [];
  const cyan: Pose[] = [];
  const gap = (Math.PI * 2) / want;

  for (let i = 0; i < want; i++) {
    const a = i * gap;
    const pose: Pose = {
      x: Math.cos(a) * RING_R,
      y: TILE_Y,
      z: Math.sin(a) * RING_R,
      ry: a,
    };
    if (i % 2 === 0) gold.push(pose);
    else cyan.push(pose);
  }

  const geo = new THREE.BoxGeometry(TILE_W, TILE_H, TILE_D);
  stamp(geo, goldTile(), gold, root);
  stamp(geo, cyanTile(), cyan, root);

  counts.gold = gold.length;
  counts.cyan = cyan.length;
  counts.n = gold.length + cyan.length;
  root.userData.tileCount = counts.n;
}
