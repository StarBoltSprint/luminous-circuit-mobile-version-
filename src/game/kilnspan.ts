/** ORREN CRYSTAL BODY WALKING TO THE SPAN on empty ground BETWEEN
 * Outer Foundry (70,-680 r=130) and Light-Bridge (640,90 r=130).
 * Orren grows body so Tal's civic promise has a near bank.
 * Not kilnwild.ts (foundry↔wild). Not landing.ts (wild↔bridge).
 * Not joinwalk.ts (foundry↔join). Not spans/pylons (AT bridge).
 * Not heat/smoke/anvil (AT kiln). Not firelight.ts (foundry↔archive).
 * Parent hooks with:
 *   laterOn(() => { try { growKilnspan(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold crystal body — kiln walking so Tal's span has a near bank. */
function bodyGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.14,
    iridescence: 0.42,
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

/** Low kiln-body. Thin height of a walk-stone; long face along the span path. */
const BOX_W = 0.85;
const BOX_H = 0.12;
const BOX_D = 1.05;
/** Asked y=0.07 (box center; height 0.12 sits just above y=0). */
const BOX_Y = 0.07;
/**
 * Empty middle of foundry→bridge. t=0.28..0.72 sits between dens, not inside
 * either floor. Foundry (70,-680) r=130 skip 140. Bridge (640,90) r=130 skip 140.
 * Wild (860,-640) skip 150 so we do not sit on kilnwild / landing.
 * Join/market (−300,-340) skip 120 so we do not sit on Voss's Charge-walk.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const FOUNDRY_SKIP = 140;
const BRIDGE_SKIP = 140;
const WILD_SKIP = 150;
const JOIN_SKIP = 120;
const WILD_X = 860;
const WILD_Z = -640;
const JOIN_X = -300;
const JOIN_Z = -340;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const KILNSPAN_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  tLo: T_LO,
  tHi: T_HI,
  foundrySkip: FOUNDRY_SKIP,
  bridgeSkip: BRIDGE_SKIP,
  wildSkip: WILD_SKIP,
  joinSkip: JOIN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nBodies(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, w: BOX_W, h: BOX_H, d: BOX_D, y: BOX_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Orren crystal-body walk on empty ground between DISTRICTS foundry and bridge.
 * 5 BoxGeometry 0.85×0.12×1.05 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.14 roughness 0.24 metalness 0.5 iridescence
 * 0.42 clearcoat 0.4, evenly t=0.28..0.72 of foundry(70,-680) → bridge(640,90),
 * y=0.07. Yaw faces the path. Skip hypot < 140 from foundry or < 140 from
 * bridge. Also skip hypot < 150 from wild (860,-640) and < 120 from join
 * (-300,-340). Orren grows body so Tal's civic promise has a near bank.
 * Not kilnwild. Not landing. Not joinwalk. Not spans/pylons. Not heat/smoke/
 * anvil. Not firelight. No tick.
 */
export function growKilnspan(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilnspan";
  group.add(root);

  const want = nBodies(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.kilnspanCounts = counts;
  root.userData.kilnspanCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    tLo: T_LO,
    tHi: T_HI,
    foundrySkip: FOUNDRY_SKIP,
    bridgeSkip: BRIDGE_SKIP,
    wildSkip: WILD_SKIP,
    joinSkip: JOIN_SKIP,
  };

  const foundry = den("foundry");
  const bridge = den("bridge");
  if (!foundry || !bridge) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R || Math.hypot(bridge.x, bridge.z) < HUB_R) return;

  const dx = bridge.x - foundry.x;
  const dz = bridge.z - foundry.z;
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
    if (Math.hypot(x - bridge.x, z - bridge.z) < BRIDGE_SKIP) continue;
    if (Math.hypot(x - WILD_X, z - WILD_Z) < WILD_SKIP) continue;
    if (Math.hypot(x - JOIN_X, z - JOIN_Z) < JOIN_SKIP) continue;
    poses.push({ x, y: BOX_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), bodyGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilnspanCount = poses.length;
}
