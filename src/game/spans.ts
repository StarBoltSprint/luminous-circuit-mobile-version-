/** Tal's light-bridges between dens. Raised cyan/gold arcs you can see, not more houses.
 * Parent hooks with:
 *   laterOn(() => { try { growSpans(group, coarse); } catch { } });
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

const LINKS: [(typeof DISTRICTS)[number]["kind"], (typeof DISTRICTS)[number]["kind"], "cyan" | "gold"][] = [
  ["canal", "market", "cyan"],
  ["market", "foundry", "gold"],
  ["foundry", "grove", "gold"],
  ["wild", "bridge", "cyan"],
  ["bridge", "gate", "cyan"],
  ["gate", "beacon", "cyan"],
  ["terrace", "ring", "gold"],
];

function glow(hex: number, opacity: number) {
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

function crystal(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.16,
    metalness: 0.44,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.52,
    iridescenceIOR: 1.32,
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
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

function stamp(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  poses: Pose[],
  group: THREE.Group,
  order: number,
) {
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
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = order;
  group.add(mesh);
}

/**
 * Civic light-bridges Tal can mean. Hub skip (r<90). Arch height 8–14.
 * coarse: skip every other span. Instanced if same geo.
 */
export function growSpans(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "spans";
  group.add(root);

  const archGlow: Pose[] = [];
  const archGoldGlow: Pose[] = [];
  const deckCyan: Pose[] = [];
  const deckGold: Pose[] = [];
  const railCyan: Pose[] = [];
  const railGold: Pose[] = [];
  const hoopCyan: Pose[] = [];
  const hoopGold: Pose[] = [];

  const Y0 = 6.18;
  const tubeSeg = coarse ? 18 : 32;
  const hoopSeg = coarse ? 10 : 16;

  for (let s = 0; s < LINKS.length; s++) {
    if (coarse && s % 2 === 1) continue;
    const link = LINKS[s]!;
    const a = den(link[0]);
    const b = den(link[1]);
    if (!a || !b) continue;
    if (Math.hypot(a.x, a.z) < 90 || Math.hypot(b.x, b.z) < 90) continue;

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
    const yaw = Math.atan2(-dz, dx);
    const peak = 8 + hash(s, 2) * 6;
    const lift = peak - Y0;
    const hue = link[2];

    archGlow.push({
      x: (ax + bx) * 0.5,
      y: Y0,
      z: (az + bz) * 0.5,
      sx: dist * 0.5,
      sy: lift,
      sz: 1,
      rx: 0,
      ry: yaw,
      rz: 0,
    });
    if (hue === "gold") {
      archGoldGlow.push(archGlow.pop()!);
    }

    const steps = Math.max(coarse ? 8 : 14, Math.round(dist / (coarse ? 34 : 18)));
    const pts: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 2 * t - 1;
      pts.push({
        x: ax + dx * t,
        y: Y0 + lift * Math.sqrt(Math.max(0, 1 - u * u)),
        z: az + dz * t,
      });
    }

    const px = -dz / dist;
    const pz = dx / dist;
    const dual = !coarse;
    const off = dual ? 0.92 : 0;

    for (let i = 0; i < steps; i++) {
      const p0 = pts[i]!;
      const p1 = pts[i + 1]!;
      const sx = p1.x - p0.x;
      const sy = p1.y - p0.y;
      const sz = p1.z - p0.z;
      const len = Math.hypot(sx, sy, sz) || 1;
      const ry = Math.atan2(sx, sz);
      const rx = -Math.atan2(sy, Math.hypot(sx, sz));
      const mx = (p0.x + p1.x) * 0.5;
      const my = (p0.y + p1.y) * 0.5;
      const mz = (p0.z + p1.z) * 0.5;
      const deck: Pose = {
        x: mx + px * off,
        y: my,
        z: mz + pz * off,
        sx: 0.62,
        sy: 0.15,
        sz: len * 1.08,
        rx,
        ry,
        rz: 0,
      };
      const rail: Pose = {
        x: mx + px * off,
        y: my + 0.12,
        z: mz + pz * off,
        sx: 0.95,
        sy: 0.22,
        sz: len * 1.06,
        rx,
        ry,
        rz: 0,
      };
      if (hue === "gold") {
        deckGold.push(deck);
        railGold.push(rail);
      } else {
        deckCyan.push(deck);
        railCyan.push(rail);
      }
      if (dual) {
        const deck2: Pose = {
          ...deck,
          x: mx - px * off,
          z: mz - pz * off,
          sx: 0.5,
          sy: 0.12,
        };
        const rail2: Pose = {
          ...rail,
          x: mx - px * off,
          z: mz - pz * off,
          sx: 0.78,
          sy: 0.18,
        };
        if (hue === "gold") {
          deckCyan.push(deck2);
          railCyan.push(rail2);
        } else {
          deckGold.push(deck2);
          railGold.push(rail2);
        }
      }
    }

    const hoopEvery = coarse ? 4 : 3;
    for (let i = 1; i < steps; i++) {
      if (i % hoopEvery !== 0) continue;
      const p0 = pts[i - 1]!;
      const p1 = pts[i]!;
      const p = pts[i]!;
      const sx = p1.x - p0.x;
      const sy = p1.y - p0.y;
      const sz = p1.z - p0.z;
      const ry = Math.atan2(sx, sz);
      const rx = -Math.atan2(sy, Math.hypot(sx, sz));
      const k = 0.92 + hash(i + s, 7) * 0.28;
      const hoop: Pose = {
        x: p.x,
        y: p.y,
        z: p.z,
        sx: k,
        sy: k,
        sz: k,
        rx,
        ry,
        rz: 0,
      };
      if ((i + s) % 2 === 0) hoopCyan.push(hoop);
      else hoopGold.push(hoop);
    }
  }

  const archGeo = new THREE.TorusGeometry(1, 0.007, coarse ? 5 : 8, tubeSeg, Math.PI);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const hoopGeo = new THREE.TorusGeometry(1.28, 0.055, 6, hoopSeg);

  stamp(archGeo, glow(0x2ee6ff, 0.32), archGlow, root, 3);
  stamp(archGeo, glow(0xe8c56a, 0.28), archGoldGlow, root, 3);
  stamp(boxGeo, crystal(0x163844, 0x2ee6ff, 0.22), deckCyan, root, 2);
  stamp(boxGeo, crystal(0x3a2c16, 0xe8c56a, 0.2), deckGold, root, 2);
  stamp(boxGeo, glow(0x2ee6ff, 0.42), railCyan, root, 4);
  stamp(boxGeo, glow(0xe8c56a, 0.36), railGold, root, 4);
  stamp(hoopGeo, glow(0x7ee8f2, 0.38), hoopCyan, root, 4);
  stamp(hoopGeo, glow(0xffc85a, 0.34), hoopGold, root, 4);
}
