/** Foundry kiln chimney wisps — dark gold/violet additive spheres that rise and wrap.
 * Not heat shimmer (heat.ts). Not fire. Dark puff, not a blaze.
 * Parent hooks with:
 *   laterOn(() => { try { smoke = growSmoke(group, coarse); } catch { } });
 *   // in world.tick(t): try { smoke?.tick(t); } catch { }
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

/** Ring-kiln flue height. Heat occupies y 1.5–8; wisps sit on the chimney. */
const Y0 = 8;
const Y1 = 22;
const SPAN = Y1 - Y0;
const FLUE_R = 52;
const OP = 0.12;

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

/** Eight ring kilns around the foundry den. Wisps sit on a subset of those flues. */
function flue(foundry: { x: number; z: number }, slot: number) {
  const a = (slot / 8) * Math.PI * 2;
  return {
    x: foundry.x + Math.cos(a) * FLUE_R,
    z: foundry.z + Math.sin(a) * FLUE_R,
    a,
  };
}

function stampWisps(
  root: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  foundry: { x: number; z: number },
  slots: number[],
  seed: number,
  dummy: THREE.Object3D,
): Column {
  const n = slots.length;
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
    const at = flue(foundry, slots[i]!);
    x[i] = at.x;
    z[i] = at.z;
    const k = 0.72 + hash(i, seed + 6) * 0.58;
    sx[i] = k;
    sy[i] = k * (0.82 + hash(i, seed + 8) * 0.36);
    sz[i] = k;
    phase[i] = hash(i, seed + 11);
    speed[i] = 0.026 + hash(i, seed + 13) * 0.028;
    wob[i] = 0.55 + hash(i, seed + 17) * 0.85;
    const u = phase[i]!;
    dummy.position.set(x[i]!, Y0 + u * SPAN, z[i]!);
    dummy.rotation.set(0, at.a, 0);
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
      col.x[i]! + Math.sin(t * 0.38 + i * 1.31) * w,
      Y0 + u * SPAN,
      col.z[i]! + Math.cos(t * 0.31 + i * 0.77) * w,
    );
    dummy.rotation.set(0, t * 0.08 + i * 0.7, 0);
    const puff = 0.72 + u * 0.55;
    dummy.scale.set(col.sx[i]! * puff, col.sy[i]! * (0.9 + u * 0.22), col.sz[i]! * puff);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Orren's kiln chimney wisps. 4–6 gold/violet spheres (coarse 2) at DISTRICTS foundry flues.
 * MeshBasic additive, opacity 0.12. y 8–22 then wrap. Dark, not fire. Dummy matrix only.
 */
export function growSmoke(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "smoke";
  group.add(root);

  const foundry = den("foundry");
  const counts = { gold: 0, violet: 0, total: 0 };
  root.userData.wispCounts = counts;
  if (!foundry) return { tick() {} };

  const goldSlots = coarse ? [0] : [0, 2, 4, 6];
  const violetSlots = coarse ? [4] : [1, 5];
  counts.gold = goldSlots.length;
  counts.violet = violetSlots.length;
  counts.total = counts.gold + counts.violet;

  const segs = coarse ? 6 : 10;
  const geo = new THREE.SphereGeometry(1, segs, segs);
  const dummy = new THREE.Object3D();

  const gold = stampWisps(root, geo, addMat(0xb08a48, OP), foundry, goldSlots, 5, dummy);
  const violet = stampWisps(root, geo, addMat(0x5a4878, OP), foundry, violetSlots, 19, dummy);

  return {
    tick(t: number) {
      tickCol(gold, t, dummy);
      tickCol(violet, t, dummy);
    },
  };
}
