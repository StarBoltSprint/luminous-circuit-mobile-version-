/** Civic floors at each den. Distinct by kind so dens do not sit on empty dirt. Instanced. Dark. No photos. */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

/**
 * Parent hooks with:
 *   laterOn(() => { try { growGrounds(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function mat(hex: number, emit: number, eInt: number, rough = 0.22, metal = 0.32) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: rough,
    metalness: metal,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.42,
    iridescenceIOR: 1.32,
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
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
  ry: number;
  rx?: number;
  rz?: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx ?? 0, p.ry, p.rz ?? 0);
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

function hoop(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius: number,
  tube: number,
  segs: number,
) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segs), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  group.add(mesh);
}

export function growGrounds(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "grounds";
  group.add(root);

  const cyan = mat(0x0c3340, 0x1a6578, 0.16, 0.14, 0.4);
  const gold = mat(0x3a2c16, 0x6a4c22, 0.15, 0.2, 0.48);
  const violet = mat(0x161228, 0x3a2c64, 0.13, 0.24, 0.3);
  const wet = mat(0x071e28, 0x1a7a8a, 0.14, 0.06, 0.62);
  const dark = mat(0x14141c, 0x3a3020, 0.1, 0.34, 0.22);
  const warm = mat(0x2a2214, 0x584028, 0.12, 0.26, 0.36);

  const ringMatCyan = cyan.clone();
  ringMatCyan.side = THREE.DoubleSide;
  const ringMatGold = gold.clone();
  ringMatGold.side = THREE.DoubleSide;
  const ringMatViolet = violet.clone();
  ringMatViolet.side = THREE.DoubleSide;
  const ringMatWarm = warm.clone();
  ringMatWarm.side = THREE.DoubleSide;
  const aimMat = gold.clone();
  aimMat.side = THREE.DoubleSide;

  const apronCyan: Pose[] = [];
  const apronGold: Pose[] = [];
  const apronViolet: Pose[] = [];
  const apronWarm: Pose[] = [];
  const cylCyan: Pose[] = [];
  const cylGold: Pose[] = [];
  const cylViolet: Pose[] = [];
  const octaGold: Pose[] = [];
  const boxGold: Pose[] = [];
  const boxCyan: Pose[] = [];
  const boxDark: Pose[] = [];

  const ringSeg = coarse ? 16 : 28;
  const tubeSeg = coarse ? 12 : 22;
  const FLAT = -Math.PI / 2;
  const PAD_Y = 5.48;

  for (const d of DISTRICTS) {
    if (Math.hypot(d.x, d.z) < 90) continue;
    const { x, z, kind, radius } = d;
    const R = radius * 0.94;
    const apron: Pose = { x, y: 0.66, z, sx: R, sy: R, sz: 1, ry: 0, rx: FLAT };
    const face = Math.atan2(x, z);

    switch (kind) {
      case "canal": {
        apronCyan.push(apron);
        cylCyan.push({ x, y: PAD_Y, z, sx: 36, sy: 0.18, sz: 36, ry: 0 });
        hoop(root, wet, x, PAD_Y + 0.08, z, 56, 3.6, tubeSeg);
        if (!coarse) hoop(root, cyan, x, 0.82, z, 108, 2.4, tubeSeg);
        break;
      }
      case "foundry": {
        apronGold.push(apron);
        cylGold.push({ x, y: PAD_Y, z, sx: 30, sy: 0.38, sz: 30, ry: 0.2 });
        octaGold.push({ x: x + 18, y: 6.15, z: z - 10, sx: 4.2, sy: 5.4, sz: 4.2, ry: 0.4 });
        if (!coarse) octaGold.push({ x: x - 16, y: 6.05, z: z + 12, sx: 3.6, sy: 4.8, sz: 3.6, ry: 1.1 });
        break;
      }
      case "terrace": {
        apronViolet.push(apron);
        const n = coarse ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const r = 46 - i * 8.2;
          cylViolet.push({
            x: x + i * 2.2,
            y: PAD_Y + i * 0.26,
            z: z + i * 1.4,
            sx: r,
            sy: 0.2,
            sz: r,
            ry: face * 0.05,
          });
        }
        break;
      }
      case "gate": {
        apronViolet.push(apron);
        boxCyan.push({ x, y: PAD_Y, z, sx: 46, sy: 0.26, sz: 16, ry: face });
        const px = Math.cos(face);
        const pz = -Math.sin(face);
        cylViolet.push({ x: x + px * 20, y: PAD_Y + 0.06, z: z + pz * 20, sx: 7.4, sy: 0.34, sz: 7.4, ry: face });
        cylViolet.push({ x: x - px * 20, y: PAD_Y + 0.06, z: z - pz * 20, sx: 7.4, sy: 0.34, sz: 7.4, ry: face });
        hoop(root, violet, x, PAD_Y + 0.12, z, 34, 6.8, tubeSeg);
        break;
      }
      case "archive": {
        apronGold.push(apron);
        boxGold.push({ x, y: PAD_Y, z, sx: 42, sy: 0.2, sz: 26, ry: 0.12 });
        const n = coarse ? 3 : 5;
        for (let i = 0; i < n; i++) {
          boxGold.push({
            x,
            y: PAD_Y + 0.14,
            z: z - 9 + i * 4.6,
            sx: 30 - i * 2.4,
            sy: 0.07,
            sz: 0.62,
            ry: 0.12,
          });
        }
        break;
      }
      case "market": {
        apronGold.push(apron);
        boxGold.push({ x, y: PAD_Y + 0.12, z, sx: 34, sy: 0.18, sz: 2.6, ry: 0.4 });
        boxGold.push({ x: x + 13.4, y: PAD_Y, z: z + 5.6, sx: 10.4, sy: 0.3, sz: 10.4, ry: 0.4 });
        boxGold.push({ x: x - 13.4, y: PAD_Y, z: z - 5.6, sx: 10.4, sy: 0.3, sz: 10.4, ry: 0.4 });
        if (!coarse) cylGold.push({ x, y: PAD_Y + 0.28, z, sx: 2.2, sy: 0.7, sz: 2.2, ry: 0 });
        break;
      }
      case "wild": {
        apronWarm.push(apron);
        const n = coarse ? 5 : 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + hash(i, 3) * 0.4;
          const len = 16 + hash(i, 5) * 26;
          boxDark.push({
            x: x + Math.cos(a) * len * 0.42,
            y: PAD_Y,
            z: z + Math.sin(a) * len * 0.42,
            sx: 0.34 + hash(i, 7) * 0.22,
            sy: 0.14,
            sz: len,
            ry: a,
          });
        }
        if (!coarse) {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.3;
            const len = 22 + hash(i, 9) * 18;
            boxDark.push({
              x: x + Math.cos(a) * (58 + len * 0.2),
              y: 0.72,
              z: z + Math.sin(a) * (58 + len * 0.2),
              sx: 0.28,
              sy: 0.12,
              sz: len,
              ry: a,
            });
          }
        }
        break;
      }
      case "beacon": {
        apronViolet.push(apron);
        hoop(root, violet, x, PAD_Y + 0.06, z, 40, 1.6, tubeSeg);
        if (!coarse) hoop(root, violet, x, PAD_Y, z, 68, 1.1, tubeSeg);
        break;
      }
      case "ring": {
        apronViolet.push(apron);
        hoop(root, violet, x, PAD_Y + 0.08, z, 64, 2.4, tubeSeg);
        if (!coarse) hoop(root, violet, x, PAD_Y + 0.04, z, 28, 1.35, tubeSeg);
        break;
      }
      case "grove": {
        apronGold.push(apron);
        const n = coarse ? 5 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.18;
          const r = 22 + (i % 3) * 13;
          const s = 3.8 + hash(i, 4) * 2.2;
          cylGold.push({
            x: x + Math.cos(a) * r,
            y: PAD_Y + 0.04,
            z: z + Math.sin(a) * r,
            sx: s,
            sy: 0.24,
            sz: s,
            ry: a,
          });
        }
        break;
      }
      case "bridge": {
        apronCyan.push(apron);
        const n = coarse ? 2 : 4;
        for (let i = 0; i < n; i++) {
          const along = (i - (n - 1) / 2) * 17;
          boxCyan.push({
            x: x + Math.cos(face) * along,
            y: PAD_Y,
            z: z - Math.sin(face) * along,
            sx: 14,
            sy: 0.22,
            sz: 8.4,
            ry: face + (i % 2 ? 0.12 : -0.12),
          });
        }
        break;
      }
      case "overlook": {
        apronWarm.push(apron);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(32, coarse ? 14 : 22), aimMat);
        disc.position.set(x, PAD_Y + 0.08, z);
        disc.lookAt(-4050, 540, 195);
        disc.castShadow = false;
        disc.receiveShadow = true;
        disc.frustumCulled = true;
        root.add(disc);
        if (!coarse) {
          boxGold.push({ x: x - 14, y: PAD_Y + 0.18, z, sx: 22, sy: 0.12, sz: 1.3, ry: 0 });
        }
        break;
      }
      default:
        break;
    }
  }

  const cyl = new THREE.CylinderGeometry(1, 1, 1, coarse ? 8 : 14);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const octa = new THREE.OctahedronGeometry(1, 0);
  const ring = new THREE.RingGeometry(0.76, 1, ringSeg);

  stamp(ring, ringMatCyan, apronCyan, root);
  stamp(ring, ringMatGold, apronGold, root);
  stamp(ring, ringMatViolet, apronViolet, root);
  stamp(ring, ringMatWarm, apronWarm, root);
  stamp(cyl, wet, cylCyan, root);
  stamp(cyl, gold, cylGold, root);
  stamp(cyl, violet, cylViolet, root);
  stamp(octa, gold, octaGold, root);
  stamp(box, gold, boxGold, root);
  stamp(box, cyan, boxCyan, root);
  stamp(box, dark, boxDark, root);
}
