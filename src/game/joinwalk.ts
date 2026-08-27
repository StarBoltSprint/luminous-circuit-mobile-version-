/** VOSS CHARGE-WALK on empty ground BETWEEN Outer Foundry and Charge-crystal Join.
 * Seln tends, Voss walks Charge to Orren's kiln. Not petal.ts (grove↔kiln fallen fruit).
 * Not seam.ts (archive↔join). Not cairn.ts. Not scales.ts (AT the join). Not forge.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growJoinwalk(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold walk-stone — Charge that has not yet become kiln body. */
function walkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

/** Leftover First Howl being walked, never bottled. Skip on coarse. */
function howlCyan() {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
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

/** Low walk-stone. Radius of a Charge step, height of a street memory. */
const STONE_R = 0.85;
const STONE_H = 0.12;
/** Cylinder center: height 0.12 sits on y=0. */
const STONE_Y = 0.06;
/** Leftover Howl disc on the center stone. Skip on coarse. */
const HOWL_R = 0.55;
const HOWL_OP = 0.18;
const HOWL_Y = STONE_Y + STONE_H * 0.5 + 0.01;
/**
 * Empty middle of foundry→join. t=0.32..0.68 sits between dens, not inside
 * either floor. Foundry (70,-680) r=130. Join/market (-300,-340) r=110.
 */
const T_LO = 0.32;
const T_HI = 0.68;
const FOUNDRY_SKIP = 140;
const JOIN_SKIP = 120;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const JOINWALK_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  howlR: HOWL_R,
  howlOp: HOWL_OP,
  howlY: HOWL_Y,
  tLo: T_LO,
  tHi: T_HI,
  foundrySkip: FOUNDRY_SKIP,
  joinSkip: JOIN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: STONE_R, h: STONE_H, y: STONE_Y, tLo: T_LO, tHi: T_HI, howl: 0 };
}

/**
 * Voss Charge-walk on empty ground between DISTRICTS foundry and market.
 * 5 CylinderGeometry r=0.85 h=0.12 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.14 roughness 0.26 metalness 0.5 iridescence
 * 0.44 clearcoat 0.4, evenly t=0.32..0.68 of foundry(70,-680) → join(-300,-340),
 * y=0.06. Skip hypot < 140 from foundry or < 120 from join.
 * Fine: 1 cyan MeshBasic CircleGeometry r=0.55 opacity 0.18 rotation.x=-PI/2
 * on the center stone — leftover First Howl being walked, never bottled.
 * Skip disc on coarse. Not petal. Not seam. Not cairn. Not scales. Not forge.
 */
export function growJoinwalk(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "joinwalk";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.joinwalkCounts = counts;
  root.userData.joinwalkCount = 0;
  root.userData.positions = positions;
  root.userData.howlCount = 0;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    howlR: HOWL_R,
    howlOp: HOWL_OP,
    howlY: HOWL_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const foundry = den("foundry");
  const join = den("market");
  if (!foundry || !join) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R || Math.hypot(join.x, join.z) < HUB_R) return;

  const dx = join.x - foundry.x;
  const dz = join.z - foundry.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const midT = (T_LO + T_HI) * 0.5;

  const poses: Pose[] = [];
  let center: { x: number; z: number } | null = null;
  let centerDist = Infinity;

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = foundry.x + dx * t;
    const z = foundry.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - foundry.x, z - foundry.z) < FOUNDRY_SKIP) continue;
    if (Math.hypot(x - join.x, z - join.z) < JOIN_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
    const dMid = Math.abs(t - midT);
    if (dMid < centerDist) {
      centerDist = dMid;
      center = { x, z };
    }
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), walkGold(), poses, root);

  counts.n = poses.length;
  root.userData.joinwalkCount = poses.length;

  if (coarse || !center) return;

  const discGeo = new THREE.CircleGeometry(HOWL_R, segs);
  const disc = new THREE.Mesh(discGeo, howlCyan());
  disc.position.set(center.x, HOWL_Y, center.z);
  disc.rotation.x = -Math.PI / 2;
  disc.castShadow = false;
  disc.receiveShadow = true;
  disc.frustumCulled = true;
  disc.renderOrder = 3;
  root.add(disc);

  counts.howl = 1;
  root.userData.howlCount = 1;
  root.userData.howl = center;
}
