/** Foundry kiln heat — gold/orange additive octas that rise and wrap. Not pulse pads.
 * Parent hooks with:
 *   laterOn(() => { try { heat = growHeat(group, coarse); } catch { } });
 *   // in world.tick(t): try { heat?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
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

function addMat(hex: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: false,
  });
}

const Y0 = 1.5;
const Y1 = 8;
const SPAN = Y1 - Y0;

type Column = {
  mesh: THREE.InstancedMesh;
  x: Float32Array;
  z: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  phase: Float32Array;
  speed: Float32Array;
  wob: Float32Array;
  n: number;
};

function stampHeat(
  root: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  foundry: { x: number; z: number },
  n: number,
  seed: number,
  dummy: THREE.Object3D,
): Column {
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 3;
  const x = new Float32Array(n);
  const z = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const phase = new Float32Array(n);
  const speed = new Float32Array(n);
  const wob = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = ((i + seed * 0.17) / 8) * Math.PI * 2 + hash(i, seed + 2) * 0.42;
    const r = 50 + hash(i, seed + 4) * 8;
    x[i] = foundry.x + Math.cos(a) * r;
    z[i] = foundry.z + Math.sin(a) * r;
    const k = 0.28 + hash(i, seed + 6) * 0.32;
    sx[i] = k;
    sy[i] = k * (1.35 + hash(i, seed + 8) * 0.55);
    sz[i] = k;
    phase[i] = hash(i, seed + 11);
    speed[i] = 0.042 + hash(i, seed + 13) * 0.038;
    wob[i] = 0.35 + hash(i, seed + 17) * 0.7;
    const u = phase[i]!;
    dummy.position.set(x[i]!, Y0 + u * SPAN, z[i]!);
    dummy.rotation.set(u * 0.5, a, 0.12);
    dummy.scale.set(sx[i]!, sy[i]!, sz[i]!);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
  return { mesh, x, z, sx, sy, sz, phase, speed, wob, n };
}

function tickCol(col: Column, t: number, dummy: THREE.Object3D) {
  const mesh = col.mesh;
  for (let i = 0; i < col.n; i++) {
    let u = col.phase[i]! + t * col.speed[i]!;
    u -= Math.floor(u);
    const w = col.wob[i]!;
    dummy.position.set(
      col.x[i]! + Math.sin(t * 0.62 + i * 1.17) * w,
      Y0 + u * SPAN,
      col.z[i]! + Math.cos(t * 0.48 + i * 0.91) * w,
    );
    dummy.rotation.set(u * 0.55, t * 0.22 + i * 0.4, 0.1);
    const fade = 1 - u * 0.28;
    dummy.scale.set(col.sx[i]! * fade, col.sy[i]! * (0.82 + u * 0.4), col.sz[i]! * fade);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Orren's kiln heat. 8–14 gold/orange octas (coarse 6) rising from DISTRICTS foundry x,z.
 * y 1.5–8. Dummy matrix only. Opacity 0.22, not blinding. tick: rise then wrap.
 */
export function growHeat(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "heat";
  group.add(root);

  const foundry = den("foundry");
  if (!foundry) return { tick() {} };

  const goldN = coarse ? 4 : 8;
  const orangeN = coarse ? 2 : 4;
  const geo = new THREE.OctahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();

  const gold = stampHeat(root, geo, addMat(0xd4a050, 0.22), foundry, goldN, 5, dummy);
  const orange = stampHeat(root, geo, addMat(0xe07028, 0.22), foundry, orangeN, 19, dummy);

  return {
    tick(t: number) {
      tickCol(gold, t, dummy);
      tickCol(orange, t, dummy);
    },
  };
}
