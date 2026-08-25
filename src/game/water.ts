/** Canal SURFACE — thin cyan sheets Seln tends. Charge motes live in pulse.ts.
 * Parent hooks with:
 *   laterOn(() => { try { water = growWater(group, coarse); } catch { } });
 *   // in world.tick(t): try { water?.tick(t); } catch { }
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

function sheetMat(coarse: boolean) {
  if (coarse) {
    return new THREE.MeshBasicMaterial({
      color: 0x3ec8e0,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: 0x3aa8c0,
    roughness: 0.12,
    metalness: 0.04,
    transmission: 0.58,
    thickness: 0.38,
    ior: 1.33,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    emissive: 0x163844,
    emissiveIntensity: 0.1,
    fog: true,
  });
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

type Strip = {
  mesh: THREE.InstancedMesh;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  sx: Float32Array;
  sz: Float32Array;
  ry: Float32Array;
  phase: Float32Array;
  n: number;
};

/**
 * Thin transparent cyan plane strips along canal → Join → foundry.
 * coarse: 1 strip. Fine: 2 parallel sheets. Opacity ~0.28, not blinding.
 * tick: uv-less y-bob + scale.x pulse via dummy matrix.
 */
export function growWater(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "water";
  group.add(root);

  const canal = den("canal");
  const join = den("market");
  const foundry = den("foundry");
  const dummy = new THREE.Object3D();
  const strips: Strip[] = [];
  const nStrips = coarse ? 1 : 2;

  if (!canal || !join || !foundry) {
    return { tick() {} };
  }

  const segs = coarse ? 10 : 16;
  const raw: number[] = [];
  bulgePts(canal.x, canal.z, join.x, join.z, 70, segs, raw);
  bulgePts(join.x, join.z, foundry.x, foundry.z, 70, segs, raw);
  const pts = raw.length / 2;
  if (pts < 2) return { tick() {} };

  const Y0 = 0.78;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = sheetMat(coarse);
  const offsets = nStrips === 1 ? [0] : [-4.4, 4.4];
  const width = coarse ? 12.4 : 7.2;

  for (let s = 0; s < nStrips; s++) {
    const off = offsets[s]!;
    const n = pts - 1;
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const z = new Float32Array(n);
    const sx = new Float32Array(n);
    const sz = new Float32Array(n);
    const ry = new Float32Array(n);
    const phase = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const ax = raw[i * 2]!;
      const az = raw[i * 2 + 1]!;
      const bx = raw[(i + 1) * 2]!;
      const bz = raw[(i + 1) * 2 + 1]!;
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      x[i] = (ax + bx) * 0.5 + px * off;
      y[i] = Y0;
      z[i] = (az + bz) * 0.5 + pz * off;
      sx[i] = width * (0.92 + hash(i + s, 3) * 0.16);
      sz[i] = len * 1.08;
      ry[i] = Math.atan2(dx, dz);
      phase[i] = hash(i + s * 17, 9) * Math.PI * 2;
      dummy.position.set(x[i]!, y[i]!, z[i]!);
      dummy.rotation.set(0, ry[i]!, 0);
      dummy.scale.set(sx[i]!, 1, sz[i]!);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
    strips.push({ mesh, x, y, z, sx, sz, ry, phase, n });
  }

  return {
    tick(t: number) {
      for (let s = 0; s < strips.length; s++) {
        const strip = strips[s]!;
        const mesh = strip.mesh;
        for (let i = 0; i < strip.n; i++) {
          const ph = strip.phase[i]!;
          const bob = Math.sin(t * 0.48 + ph) * 0.055;
          const pulse = 1 + Math.sin(t * 0.36 + ph * 0.7) * 0.038;
          dummy.position.set(strip.x[i]!, strip.y[i]! + bob, strip.z[i]!);
          dummy.rotation.set(0, strip.ry[i]!, 0);
          dummy.scale.set(strip.sx[i]! * pulse, 1, strip.sz[i]!);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
