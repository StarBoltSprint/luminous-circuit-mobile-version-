/** ORREN CRYSTAL BODY WALKING TO WILD LANDINGS on empty ground BETWEEN
 * Outer Foundry (70,-680 r=130) and Wild Veins (860,-640 r=140).
 * Orren grows body Kesh can land. Not a second Spire.
 * Not quietvein.ts (grove↔wild). Not petal.ts (grove↔kiln).
 * Not landing.ts (wild↔bridge). Not joinwalk.ts (foundry↔join).
 * Not firelight.ts (foundry↔archive). Not veins.ts (IN the wild).
 * Not heat/smoke/anvil (AT kiln).
 * Parent hooks with:
 *   laterOn(() => { try { growKilnwild(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold crystal body — kiln that has not yet become a wild landing. */
function bodyGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.5,
    emissive: 0xe8c56a,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
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

/** Low kiln-body. Radius of a Charge-to-landing step, height of a street memory. */
const STONE_R = 0.75;
const STONE_H = 0.12;
/** Cylinder center: height 0.12 sits on y=0. */
const STONE_Y = 0.06;
/**
 * Empty middle of foundry→wild. t=0.28..0.72 sits between dens, not inside
 * either floor. Foundry (70,-680) r=130. Wild (860,-640) r=140.
 * Grove (320,-980) r=130 skip 140 so we do not sit on quietvein / petal.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const FOUNDRY_SKIP = 140;
const WILD_SKIP = 150;
const GROVE_SKIP = 140;
const GROVE_X = 320;
const GROVE_Z = -980;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const KILNWILD_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  foundrySkip: FOUNDRY_SKIP,
  wildSkip: WILD_SKIP,
  groveSkip: GROVE_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: STONE_R, h: STONE_H, y: STONE_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Orren crystal-body walk on empty ground between DISTRICTS foundry and wild.
 * 5 CylinderGeometry r=0.75 h=0.12 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xe8c56a intensity 0.14 roughness 0.24 metalness 0.5 iridescence
 * 0.44 clearcoat 0.4, evenly t=0.28..0.72 of foundry(70,-680) → wild(860,-640),
 * y=0.06. Skip hypot < 140 from foundry or < 150 from wild. Also skip hypot
 * < 140 from grove (320,-980). Orren grows body Kesh can land. Not a second
 * Spire. Not quietvein. Not petal. Not landing. Not joinwalk. Not firelight.
 * Not veins. Not heat/smoke/anvil. No tick.
 */
export function growKilnwild(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilnwild";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.kilnwildCounts = counts;
  root.userData.kilnwildCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    foundrySkip: FOUNDRY_SKIP,
    wildSkip: WILD_SKIP,
    groveSkip: GROVE_SKIP,
  };

  const foundry = den("foundry");
  const wild = den("wild");
  if (!foundry || !wild) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R || Math.hypot(wild.x, wild.z) < HUB_R) return;

  const dx = wild.x - foundry.x;
  const dz = wild.z - foundry.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = foundry.x + dx * t;
    const z = foundry.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - foundry.x, z - foundry.z) < FOUNDRY_SKIP) continue;
    if (Math.hypot(x - wild.x, z - wild.z) < WILD_SKIP) continue;
    if (Math.hypot(x - GROVE_X, z - GROVE_Z) < GROVE_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), bodyGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilnwildCount = poses.length;
}
