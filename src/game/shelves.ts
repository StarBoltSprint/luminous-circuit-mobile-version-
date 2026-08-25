/** Iri ARCHIVE shelves — leftover-light racks at the Residual Archive den.
 * Not Nesh's plaza stele (notice.ts). Not street plates (trails.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growShelves(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0x5a4020,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function tabletGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0xd4a050,
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
  dummy.rotation.order = "YXZ";
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

/** World from shelf-local X/Z after yaw (THREE rotation.y). */
function at(cx: number, cz: number, lx: number, lz: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

const SHELF_W = 8;
const SHELF_H = 0.2;
const SHELF_D = 1.4;
const SHELF_Y0 = 1.2;
const SHELF_GAP = 1.5;
const SHELF_N_FINE = 3;
const SHELF_N_COARSE = 1;

const TAB_W = 0.46;
const TAB_H = 0.62;
const TAB_D = 0.12;
const TAB_N_FINE = 6;
const TAB_N_COARSE = 4;

/** Local X along the 8-wide plank. Two per fine shelf; four on the coarse plank. */
const TAB_X_FINE = [-2.4, 2.2, -1.8, 1.6, -2.6, 2.4];
const TAB_X_COARSE = [-2.8, -1.0, 1.0, 2.8];
const TAB_Z = 0.16;

const emptySizes = {
  w: SHELF_W,
  h: SHELF_H,
  d: SHELF_D,
  y0: 0,
  gap: 0,
  tabletW: TAB_W,
  tabletH: TAB_H,
  tabletD: TAB_D,
  shelfCount: 0,
  tabletCount: 0,
};

/**
 * Iri's archive shelves at DISTRICTS kind==="archive" x,z. BoxGeometry 8×0.2×1.4
 * stacked (3, coarse 1) MeshPhysical dark-gold. Small tablet boxes sit on the
 * planks (6 fine / 4 coarse). Faces the Hub. Not a plaza stele, not a street plate.
 */
export function growShelves(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "shelves";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.shelfCount = 0;
  root.userData.tabletCount = 0;

  const archive = den("archive");
  if (!archive) return;
  if (Math.hypot(archive.x, archive.z) < 90) return;

  const yaw = Math.atan2(archive.x, archive.z);
  const cx = archive.x;
  const cz = archive.z;
  const nShelf = coarse ? SHELF_N_COARSE : SHELF_N_FINE;
  const nTab = coarse ? TAB_N_COARSE : TAB_N_FINE;
  const xs = coarse ? TAB_X_COARSE : TAB_X_FINE;

  const shelves: Pose[] = [];
  for (let i = 0; i < nShelf; i++) {
    shelves.push({ x: cx, y: SHELF_Y0 + i * SHELF_GAP, z: cz, ry: yaw });
  }
  stamp(new THREE.BoxGeometry(SHELF_W, SHELF_H, SHELF_D), darkGold(), shelves, root);

  const tablets: Pose[] = [];
  for (let i = 0; i < nTab; i++) {
    const shelfI = coarse ? 0 : Math.floor(i / 2);
    const shelfY = SHELF_Y0 + shelfI * SHELF_GAP;
    const lz = (i % 2 === 0 ? 1 : -1) * TAB_Z;
    const p = at(cx, cz, xs[i] ?? 0, lz, yaw);
    tablets.push({
      x: p.x,
      y: shelfY + SHELF_H * 0.5 + TAB_H * 0.5,
      z: p.z,
      ry: yaw,
    });
  }
  stamp(new THREE.BoxGeometry(TAB_W, TAB_H, TAB_D), tabletGold(), tablets, root);

  sizes.y0 = SHELF_Y0;
  sizes.gap = nShelf > 1 ? SHELF_GAP : 0;
  sizes.shelfCount = shelves.length;
  sizes.tabletCount = tablets.length;
  root.userData.shelfCount = shelves.length;
  root.userData.tabletCount = tablets.length;
}
