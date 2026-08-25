/** Charge that MOVES. Canal current, span sparks, kiln heat that breathes.
 * Parent hooks with:
 *   laterOn(() => { try { pulse = growPulse(group, coarse); } catch { } });
 *   // in world.tick(t): try { pulse?.tick(t); } catch { }
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

function bulgeSeg(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  y0: number,
  y1: number,
  bulge: number,
  yLift: number,
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
    acc.push(
      ax + dx * t + px * w * bulge,
      y0 + (y1 - y0) * t + w * yLift,
      az + dz * t + pz * w * bulge,
    );
  }
}

function resample(xyz: number[], n: number): Float32Array {
  const pts = (xyz.length / 3) | 0;
  const out = new Float32Array(n * 3);
  if (pts < 2) return out;
  const seg = new Float32Array(pts);
  let total = 0;
  for (let i = 1; i < pts; i++) {
    const a = (i - 1) * 3;
    const b = i * 3;
    total += Math.hypot(xyz[b]! - xyz[a]!, xyz[b + 1]! - xyz[a + 1]!, xyz[b + 2]! - xyz[a + 2]!);
    seg[i] = total;
  }
  if (total <= 0) return out;
  out[0] = xyz[0]!;
  out[1] = xyz[1]!;
  out[2] = xyz[2]!;
  let s = 1;
  for (let i = 1; i < n; i++) {
    const d = (i / (n - 1)) * total;
    while (s < pts - 1 && seg[s]! < d) s += 1;
    const d0 = seg[s - 1]!;
    const f = (d - d0) / ((seg[s]! - d0) || 1);
    const a = (s - 1) * 3;
    const b = s * 3;
    out[i * 3] = xyz[a]! + (xyz[b]! - xyz[a]!) * f;
    out[i * 3 + 1] = xyz[a + 1]! + (xyz[b + 1]! - xyz[a + 1]!) * f;
    out[i * 3 + 2] = xyz[a + 2]! + (xyz[b + 2]! - xyz[a + 2]!) * f;
  }
  return out;
}

type Lane = {
  mesh: THREE.InstancedMesh;
  path: Float32Array;
  samples: number;
  n: number;
  phase: Float32Array;
  lat: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  speed: Float32Array;
};

function stampLane(
  root: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  path: Float32Array,
  n: number,
  seed: number,
  speed0: number,
  speed1: number,
  latMax: number,
  sx0: number,
  sy0: number,
  sz0: number,
): Lane {
  const samples = (path.length / 3) | 0;
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 2;
  const phase = new Float32Array(n);
  const lat = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const speed = new Float32Array(n);
  const dummy = new THREE.Object3D();
  const last = Math.max(1, samples - 1);
  for (let i = 0; i < n; i++) {
    phase[i] = hash(i, seed);
    lat[i] = (hash(i, seed + 3) * 2 - 1) * latMax;
    const k = 0.72 + hash(i, seed + 7) * 0.55;
    sx[i] = sx0 * k;
    sy[i] = sy0 * k;
    sz[i] = sz0 * (0.85 + hash(i, seed + 11) * 0.45);
    speed[i] = speed0 + hash(i, seed + 13) * (speed1 - speed0);
    const u = phase[i]!;
    const f = u * last;
    const i0 = Math.min(last - 1, f | 0);
    const tt = f - i0;
    const a = i0 * 3;
    const b = (i0 + 1) * 3;
    dummy.position.set(
      path[a]! + (path[b]! - path[a]!) * tt,
      path[a + 1]! + (path[b + 1]! - path[a + 1]!) * tt,
      path[a + 2]! + (path[b + 2]! - path[a + 2]!) * tt,
    );
    dummy.scale.set(sx[i]!, sy[i]!, sz[i]!);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
  return { mesh, path, samples, n, phase, lat, sx, sy, sz, speed };
}

function tickLane(lane: Lane, t: number, dummy: THREE.Object3D) {
  const last = lane.samples - 1;
  if (last < 1) return;
  const path = lane.path;
  const n = lane.n;
  const mesh = lane.mesh;
  for (let i = 0; i < n; i++) {
    let u = lane.phase[i]! + t * lane.speed[i]!;
    u -= Math.floor(u);
    const f = u * last;
    const i0 = Math.min(last - 1, f | 0);
    const tt = f - i0;
    const a = i0 * 3;
    const b = (i0 + 1) * 3;
    const x0 = path[a]!;
    const y0 = path[a + 1]!;
    const z0 = path[a + 2]!;
    const dx = path[b]! - x0;
    const dy = path[b + 1]! - y0;
    const dz = path[b + 2]! - z0;
    const len = Math.hypot(dx, dz) || 1;
    dummy.position.set(
      x0 + dx * tt + (-dz / len) * lane.lat[i]!,
      y0 + dy * tt + Math.sin(t * 2.1 + i * 0.73) * 0.12,
      z0 + dz * tt + (dx / len) * lane.lat[i]!,
    );
    dummy.rotation.set(0, Math.atan2(dx, dz), 0);
    dummy.scale.set(lane.sx[i]!, lane.sy[i]!, lane.sz[i]!);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Living Charge on the civic canals and spans. Kiln pads breathe.
 * Coarse = phone (fewer motes). Opacity ~0.55, not blinding.
 */
export function growPulse(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "pulse";
  group.add(root);

  const chargeN = coarse ? 32 : 64;
  const spanN = coarse ? 24 : 48;
  const kilnN = coarse ? 6 : 10;
  const lutN = coarse ? 48 : 80;
  const geo = new THREE.OctahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();

  const canal = den("canal");
  const join = den("market");
  const foundry = den("foundry");
  const wild = den("wild");
  const bridge = den("bridge");
  const gates = den("gate");

  let charge: Lane | null = null;
  let sparks: Lane | null = null;

  if (canal && join && foundry) {
    const raw: number[] = [];
    const segs = coarse ? 12 : 18;
    bulgeSeg(canal.x, canal.z, join.x, join.z, 2.05, 1.92, 70, 0.18, segs, raw);
    bulgeSeg(join.x, join.z, foundry.x, foundry.z, 1.92, 2.12, 70, 0.16, segs, raw);
    charge = stampLane(
      root,
      geo,
      addMat(0x3aa8c0, 0.55),
      resample(raw, lutN),
      chargeN,
      5,
      0.038,
      0.056,
      coarse ? 2.4 : 3.6,
      0.38,
      0.42,
      1.15,
    );
  }

  if (wild && bridge && gates) {
    const raw: number[] = [];
    const segs = coarse ? 10 : 16;
    bulgeSeg(wild.x, wild.z, bridge.x, bridge.z, 4.8, 5.15, 48, 1.15, segs, raw);
    bulgeSeg(bridge.x, bridge.z, gates.x, gates.z, 5.15, 4.9, 48, 1.05, segs, raw);
    sparks = stampLane(
      root,
      geo,
      addMat(0x6a48a8, 0.52),
      resample(raw, lutN),
      spanN,
      17,
      0.046,
      0.068,
      coarse ? 1.8 : 2.8,
      0.46,
      0.7,
      0.46,
    );
  }

  const kilnPos = new Float32Array(kilnN * 3);
  const kilnPhase = new Float32Array(kilnN);
  const kilnScale = new Float32Array(kilnN);
  const kiln = new THREE.InstancedMesh(geo, addMat(0xc4a060, 0.5), kilnN);
  kiln.castShadow = false;
  kiln.receiveShadow = false;
  kiln.frustumCulled = true;
  kiln.renderOrder = 2;
  if (foundry) {
    for (let i = 0; i < kilnN; i++) {
      const a = (i / kilnN) * Math.PI * 2 + 0.22;
      const r = 16 + hash(i, 2) * 12;
      kilnPos[i * 3] = foundry.x + Math.cos(a) * r;
      kilnPos[i * 3 + 1] = 6.15 + hash(i, 4) * 0.35;
      kilnPos[i * 3 + 2] = foundry.z + Math.sin(a) * r;
      kilnPhase[i] = hash(i, 8) * Math.PI * 2;
      kilnScale[i] = 1.05 + hash(i, 11) * 0.7;
      dummy.position.set(kilnPos[i * 3]!, kilnPos[i * 3 + 1]!, kilnPos[i * 3 + 2]!);
      dummy.rotation.set(0.2, a, 0.12);
      dummy.scale.setScalar(kilnScale[i]!);
      dummy.updateMatrix();
      kiln.setMatrixAt(i, dummy.matrix);
    }
  }
  kiln.instanceMatrix.needsUpdate = true;
  root.add(kiln);

  return {
    tick(t: number) {
      if (charge) tickLane(charge, t, dummy);
      if (sparks) tickLane(sparks, t, dummy);
      for (let i = 0; i < kilnN; i++) {
        const ph = kilnPhase[i]!;
        const breathe = Math.sin(t * 1.85 + ph);
        const s = kilnScale[i]! * (1 + breathe * 0.14);
        dummy.position.set(
          kilnPos[i * 3]!,
          kilnPos[i * 3 + 1]! + breathe * 0.48,
          kilnPos[i * 3 + 2]!,
        );
        dummy.rotation.set(0.18, t * 0.35 + ph, 0.1);
        dummy.scale.set(s * 0.82, s * 1.15, s * 0.82);
        dummy.updateMatrix();
        kiln.setMatrixAt(i, dummy.matrix);
      }
      kiln.instanceMatrix.needsUpdate = true;
    },
  };
}
