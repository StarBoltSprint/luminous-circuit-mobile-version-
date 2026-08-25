/** Living ground between dens. Instanced. Lore-true. Not more identical houses. */
import * as THREE from "three";
import { DISTRICTS, type District } from "./lore";

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function inDen(x: number, z: number, pad = 0) {
  if (Math.hypot(x, z) < 88) return true;
  return DISTRICTS.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius * 0.78 + pad);
}

function nearest(x: number, z: number): District {
  let best = DISTRICTS[0]!;
  let d0 = Infinity;
  for (const d of DISTRICTS) {
    const n = Math.hypot(x - d.x, z - d.z);
    if (n < d0) {
      d0 = n;
      best = d;
    }
  }
  return best;
}

type Kind = "canal" | "vein" | "span" | "aim" | "grove";

const ROUTES: [string, string, Kind][] = [
  ["zone-canal", "zone-market", "canal"],
  ["zone-market", "zone-foundry", "canal"],
  ["zone-foundry", "zone-grove", "grove"],
  ["zone-wild", "zone-bridge", "span"],
  ["zone-bridge", "zone-gate", "span"],
  ["zone-gate", "zone-beacon", "span"],
  ["zone-gate", "zone-terrace", "vein"],
  ["zone-terrace", "zone-ring", "vein"],
  ["zone-archive", "zone-market", "vein"],
  ["zone-archive", "zone-overlook", "aim"],
  ["zone-canal", "zone-overlook", "aim"],
  ["zone-wild", "zone-grove", "grove"],
];

function mat(hex: number, emit: number, eInt: number, rough = 0.22) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: rough,
    metalness: 0.18,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.7,
    iridescenceIOR: 1.4,
    clearcoat: 0.55,
    transparent: false,
  });
}

type Pose = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number };

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

function along(ax: number, az: number, bx: number, bz: number, steps: number, bulge: number, denPad: number) {
  const out: { x: number; z: number; t: number; ang: number; px: number; pz: number }[] = [];
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const w = Math.sin(t * Math.PI) * bulge;
    const x = ax + dx * t + px * w;
    const z = az + dz * t + pz * w;
    if (inDen(x, z, denPad)) continue;
    out.push({ x, z, t, ang: Math.atan2(dx, dz), px, pz });
  }
  return out;
}

export function growWilds(group: THREE.Group, coarse: boolean) {
  const byId = new Map(DISTRICTS.map((d) => [d.id, d]));
  const canal: Pose[] = [];
  const street: Pose[] = [];
  const rail: Pose[] = [];
  const facet: Pose[] = [];
  const disc: Pose[] = [];
  const goldOct: Pose[] = [];
  const bough: Pose[] = [];
  const lamp: Pose[] = [];
  const pad: Pose[] = [];
  const weir: Pose[] = [];

  for (const [aId, bId, kind] of ROUTES) {
    const segs =
      kind === "canal" ? (coarse ? 10 : 16)
      : kind === "span" ? (coarse ? 8 : 14)
      : kind === "aim" ? (coarse ? 8 : 12)
      : (coarse ? 7 : 11);
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b) continue;
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const bulge = (kind === "canal" ? 70 : kind === "span" ? 48 : 36) * (0.7 + hash(dist, 3) * 0.5);
    const pts = along(a.x, a.z, b.x, b.z, segs, bulge, kind === "canal" ? -26 : -12);
    const span = dist / segs;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const wave = Math.sin(p.t * Math.PI);

      if (kind === "canal") {
        canal.push({
          x: p.x,
          y: 0.36 + Math.sin(p.t * Math.PI * 4) * 0.07,
          z: p.z,
          sx: (coarse ? 11.2 : 15.4) + wave * 3.2,
          sy: 0.28,
          sz: span * 1.38 + 5,
          ry: p.ang,
        });
        if (!coarse || i % 2 === 0) {
          rail.push({
            x: p.x,
            y: 0.58,
            z: p.z,
            sx: 1.7,
            sy: 0.1,
            sz: span * 1.2 + 3,
            ry: p.ang,
          });
        }
        if (!coarse || i % 2 === 0) {
          const bank = (i % 2 ? 1 : -1) * (6.4 + hash(i, 4) * 2.8);
          facet.push({
            x: p.x + p.px * bank,
            y: 0.78 + hash(i, 6) * 0.55,
            z: p.z + p.pz * bank,
            sx: 0.55 + hash(i, 2) * 0.4,
            sy: 0.7 + hash(i, 3) * 0.55,
            sz: 0.55,
            ry: p.ang + hash(i, 7),
          });
          if (!coarse) {
            facet.push({
              x: p.x - p.px * bank,
              y: 0.7 + hash(i, 1) * 0.4,
              z: p.z - p.pz * bank,
              sx: 0.45,
              sy: 0.6,
              sz: 0.45,
              ry: p.ang + 1.1,
            });
          }
        }
        if (i % (coarse ? 3 : 2) === 1) {
          weir.push({ x: p.x, y: 0.92, z: p.z, sx: 6.4, sy: 0.62, sz: 3.4, ry: p.ang });
        }
      } else if (kind === "span") {
        const lift = 3.7 + wave * (coarse ? 4.4 : 7.1);
        rail.push({
          x: p.x,
          y: lift,
          z: p.z,
          sx: coarse ? 1.45 : 1.18,
          sy: 0.24,
          sz: span + 2.2,
          ry: p.ang,
        });
        if (!coarse) {
          rail.push({
            x: p.x + p.px * 1.85,
            y: lift,
            z: p.z + p.pz * 1.85,
            sx: 1.18,
            sy: 0.22,
            sz: span + 2.2,
            ry: p.ang,
          });
        }
        if (!coarse || i % 2 === 0) {
          disc.push({
            x: p.x + p.px * (coarse ? 0 : 0.9),
            y: lift + 0.38,
            z: p.z + p.pz * (coarse ? 0 : 0.9),
            sx: 2.15,
            sy: 0.11,
            sz: 2.15,
            ry: p.ang,
          });
        }
        if (i % 2 === 0) {
          lamp.push({
            x: p.x + p.px * 3.4,
            y: lift + 1.7,
            z: p.z + p.pz * 3.4,
            sx: 0.62,
            sy: 1.9,
            sz: 0.62,
            ry: p.ang,
          });
        }
      } else if (kind === "grove") {
        street.push({
          x: p.x,
          y: 0.88,
          z: p.z,
          sx: 3.1,
          sy: 0.2,
          sz: span + 3.2,
          ry: p.ang,
        });
        if (!coarse || i % 2 === 0) {
          bough.push({
            x: p.x + p.px * (7 + hash(i, 5) * 4),
            y: 5.1 + hash(i, 3) * 1.6,
            z: p.z + p.pz * (7 + hash(i, 8) * 4),
            sx: 3.1 + hash(i, 2) * 1.1,
            sy: 3.8 + hash(i, 6) * 1.4,
            sz: 3.1,
            ry: p.ang + hash(i, 4),
          });
        }
        if (!coarse || i % 2 === 0) {
          goldOct.push({
            x: p.x + p.px * (5.5 + hash(i, 9) * 3),
            y: 4.4 + hash(i, 3) * 2.1,
            z: p.z + p.pz * (5.5 + hash(i, 1) * 3),
            sx: 0.95,
            sy: 1.25,
            sz: 0.95,
            ry: p.ang + hash(i, 7),
          });
        }
      } else if (kind === "aim") {
        const toCore = Math.atan2(-p.x, -p.z);
        const orbitR = 7 + Math.sin(p.t * Math.PI * 3) * 6;
        goldOct.push({
          x: p.x + Math.cos(toCore + Math.PI / 2) * orbitR,
          y: 2.8 + wave * 4.2,
          z: p.z + Math.sin(toCore + Math.PI / 2) * orbitR,
          sx: 1.05,
          sy: 2.6 + hash(i, 4) * 1.4,
          sz: 1.05,
          ry: toCore,
        });
        if (!coarse) {
          goldOct.push({
            x: p.x - Math.cos(toCore + Math.PI / 2) * (orbitR * 0.55),
            y: 2.2 + wave * 3.4,
            z: p.z - Math.sin(toCore + Math.PI / 2) * (orbitR * 0.55),
            sx: 0.8,
            sy: 2.1,
            sz: 0.8,
            ry: toCore,
          });
        }
      } else {
        const wander = (hash(i + dist, 8) - 0.5) * 6;
        street.push({
          x: p.x + p.px * wander * 0.18,
          y: 1.02,
          z: p.z + p.pz * wander * 0.18,
          sx: 5.4,
          sy: 0.34,
          sz: span + 4.5,
          ry: p.ang + wander * 0.02,
        });
        if (!coarse && i % 2 === 0) {
          rail.push({
            x: p.x,
            y: 1.28,
            z: p.z,
            sx: 0.7,
            sy: 0.12,
            sz: span * 0.8,
            ry: p.ang,
          });
        }
      }

      if (i === Math.floor(pts.length / 2)) {
        pad.push({
          x: p.x,
          y: kind === "span" ? 3.7 + wave * (coarse ? 4.4 : 7.1) : 1.12,
          z: p.z,
          sx: kind === "canal" ? 13 : 9,
          sy: 0.28,
          sz: kind === "canal" ? 13 : 9,
          ry: p.ang,
        });
      }
    }
  }

  const fieldN = coarse ? 36 : 64;
  for (let i = 0; i < fieldN; i++) {
    const ang = hash(i, 11) * Math.PI * 2;
    const r = 170 + hash(i, 19) * 1180;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    if (inDen(x, z, 14)) continue;
    const d = nearest(x, z);
    const k = d.kind;
    const ry = ang + hash(i, 5);
    if (k === "canal" || k === "foundry" || k === "market") {
      facet.push({ x, y: 0.9 + hash(i, 2) * 0.7, z, sx: 0.7, sy: 1.1 + hash(i, 8) * 0.8, sz: 0.7, ry });
    } else if (k === "grove" || k === "wild") {
      bough.push({ x, y: 4.2 + hash(i, 3) * 1.8, z, sx: 2.4, sy: 3.2 + hash(i, 6) * 1.6, sz: 2.4, ry });
      if (hash(i, 9) > 0.5) goldOct.push({ x: x + 5, y: 3.6, z: z + 4, sx: 0.9, sy: 1.2, sz: 0.9, ry });
    } else if (k === "gate" || k === "beacon") {
      lamp.push({ x, y: 5.4, z, sx: 0.7, sy: 2.2, sz: 0.7, ry });
    } else if (k === "archive" || k === "overlook") {
      goldOct.push({ x, y: 2.6, z, sx: 0.9, sy: 2.4 + hash(i, 4) * 1.6, sz: 0.9, ry });
    } else if (k === "terrace" || k === "ring") {
      pad.push({ x, y: 1.12, z, sx: 5 + hash(i, 7) * 3, sy: 0.24, sz: 5, ry });
    } else {
      facet.push({ x, y: 1.05, z, sx: 0.8, sy: 1.2, sz: 0.8, ry });
    }
  }

  const box = new THREE.BoxGeometry(1, 1, 1);
  const octa = new THREE.OctahedronGeometry(1, 0);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, coarse ? 6 : 10);

  stamp(box, mat(0x156a82, 0x2ee6ff, 0.95, 0.08), canal, group);
  stamp(box, mat(0x2a4454, 0x7ee8f2, 0.38, 0.3), street, group);
  stamp(box, mat(0xd4b46a, 0xffc85a, 0.78, 0.16), rail, group);
  stamp(octa, mat(0x7ee8f2, 0x2ee6ff, 0.72, 0.14), facet, group);
  stamp(cyl, mat(0xd4b46a, 0x7ee8f2, 0.88, 0.12), disc, group);
  stamp(octa, mat(0xe8c878, 0xffc85a, 0.74, 0.16), goldOct, group);
  stamp(new THREE.IcosahedronGeometry(1, 0), mat(0x6b4bb8, 0x9b70ff, 0.42, 0.32), bough, group);
  stamp(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({
    color: 0x7ee8f2,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), lamp, group);
  stamp(cyl, mat(0x2a3344, 0x7ee8f2, 0.28), pad, group);
  stamp(new THREE.TorusGeometry(1, 0.12, coarse ? 5 : 6, coarse ? 10 : 16), mat(0xd4b46a, 0x2ee6ff, 0.9, 0.14), weir, group);
}
