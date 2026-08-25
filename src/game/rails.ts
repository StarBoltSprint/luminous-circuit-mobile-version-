/** Canal BANK rails Seln tends — low dark-cyan box posts + thin rails.
 * Along the canal den only. Not street plates (trails exist). Not Tal's light-bridges.
 * y=0.7–1.1. Instanced boxes. coarse: half posts.
 * Parent hooks with:
 *   laterOn(() => { try { growRails(group, coarse); } catch { } });
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

function bulgePts(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  bulge: number,
  steps: number,
  acc: number[],
) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  const start = acc.length === 0 ? 0 : 1;
  for (let i = start; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(t * Math.PI);
    acc.push(ax + dx * t + px * w * bulge, az + dz * t + pz * w * bulge);
  }
}

type Pose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
};

type Peg = { x: number; z: number; ry: number };

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

function crystal(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.4,
    metalness: 0.3,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.26,
    iridescenceIOR: 1.3,
    clearcoat: 0.2,
    clearcoatRoughness: 0.46,
    transparent: false,
  });
}

const POST_Y = 0.9;
const POST_H = 0.4;
const POST_W = 0.28;
const POST_D = 0.22;
const RAIL_Y = [0.8, 1.06] as const;
const RAIL_W = 0.08;
const RAIL_H = 0.055;
const BANK = 11.2;
const PAD = 44;
const STEP = 7;
const SEGS = 72;

function keepHalf(list: Peg[], coarse: boolean) {
  if (!coarse) return list;
  return list.filter((_, i) => i % 2 === 0);
}

function dropPosts(list: Peg[], poses: Pose[]) {
  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    poses.push({
      x: p.x,
      y: POST_Y,
      z: p.z,
      sx: POST_W,
      sy: POST_H,
      sz: POST_D,
      ry: p.ry,
    });
  }
}

function dropRails(list: Peg[], poses: Pose[]) {
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i]!;
    const b = list[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.5 || len > STEP * 3.4) continue;
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const ry = Math.atan2(dx, dz);
    for (let r = 0; r < RAIL_Y.length; r++) {
      poses.push({
        x: mx,
        y: RAIL_Y[r]!,
        z: mz,
        sx: RAIL_W,
        sy: RAIL_H,
        sz: len * 0.98,
        ry,
      });
    }
  }
}

/**
 * Low canal-bank posts + thin rails at Seln's den. Dual banks along the Charge
 * water, plus a far-side basin arc. Hub skip (r<90). Instanced box only.
 * coarse: half posts. y stays 0.7–1.1.
 */
export function growRails(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "rails";
  group.add(root);

  const counts = { left: 0, right: 0, back: 0, total: 0, rails: 0 };
  root.userData.postCounts = counts;

  const canal = den("canal");
  if (!canal) return;
  const join = den("market");

  const posts: Pose[] = [];
  const rails: Pose[] = [];
  const left: Peg[] = [];
  const right: Peg[] = [];
  const back: Peg[] = [];
  const reach = canal.radius * 1.22;

  if (join) {
    const raw: number[] = [];
    bulgePts(canal.x, canal.z, join.x, join.z, 70, SEGS, raw);
    const nPts = raw.length / 2;
    let acc = 0;
    let last = -STEP;
    for (let i = 0; i < nPts; i++) {
      const x = raw[i * 2]!;
      const z = raw[i * 2 + 1]!;
      let dx: number;
      let dz: number;
      if (i + 1 < nPts) {
        dx = raw[(i + 1) * 2]! - x;
        dz = raw[(i + 1) * 2 + 1]! - z;
      } else {
        dx = x - raw[(i - 1) * 2]!;
        dz = z - raw[(i - 1) * 2 + 1]!;
      }
      const span = Math.hypot(dx, dz) || 1;
      if (i > 0) acc += span;
      const d = Math.hypot(x - canal.x, z - canal.z);
      if (d < PAD || d > reach) continue;
      if (Math.hypot(x, z) < 90) continue;
      if (acc - last < STEP) continue;
      last = acc;
      const px = -dz / span;
      const pz = dx / span;
      const yaw = Math.atan2(dx, dz);
      const k = left.length;
      const wob = (hash(k, 4) - 0.5) * 1.2;
      const bank = BANK + wob;
      left.push({ x: x + px * bank, z: z + pz * bank, ry: yaw });
      right.push({ x: x - px * bank, z: z - pz * bank, ry: yaw });
    }
  }

  const aimX = join?.x ?? 0;
  const aimZ = join?.z ?? 0;
  const face = Math.atan2(aimZ - canal.z, aimX - canal.x);
  const rArc = 96;
  const sweep = Math.PI * 1.62;
  const start = face + Math.PI - sweep * 0.5;
  const arcN = Math.max(5, Math.round((sweep * rArc) / STEP));
  for (let i = 0; i <= arcN; i++) {
    const a = start + (i / arcN) * sweep;
    back.push({
      x: canal.x + Math.cos(a) * rArc,
      z: canal.z + Math.sin(a) * rArc,
      ry: a + Math.PI * 0.5,
    });
  }

  const leftKeep = keepHalf(left, coarse);
  const rightKeep = keepHalf(right, coarse);
  const backKeep = keepHalf(back, coarse);

  dropPosts(leftKeep, posts);
  dropPosts(rightKeep, posts);
  dropPosts(backKeep, posts);
  const railStart = rails.length;
  dropRails(leftKeep, rails);
  dropRails(rightKeep, rails);
  dropRails(backKeep, rails);

  counts.left = leftKeep.length;
  counts.right = rightKeep.length;
  counts.back = backKeep.length;
  counts.total = posts.length;
  counts.rails = rails.length - railStart;

  const geo = new THREE.BoxGeometry(1, 1, 1);
  stamp(geo, crystal(0x071e28, 0x1a6578, 0.14), posts, root);
  stamp(geo, crystal(0x0c3340, 0x2a7a8c, 0.18), rails, root);
}
