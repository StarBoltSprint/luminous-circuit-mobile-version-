/** ORREN CRYSTAL BODY WALKING TO THE SOFT GATE on empty ground BETWEEN
 * Outer Foundry (70,-680 r=130) and Soft Gates (520,480 r=130).
 * Orren grows body that may leave and return. No score.
 * Not kilnwild.ts (foundry↔wild). Not kilnspan.ts (foundry↔bridge).
 * Not joinwalk.ts (foundry↔join). Not firelight.ts (foundry↔archive).
 * Not restgate.ts / hush.ts / joinsoft.ts / gateswild.ts (other gate walks).
 * Not heat/smoke/anvil (AT kiln). Not gates/veil (AT gate).
 * Parent hooks with:
 *   laterOn(() => { try { growKilndoor(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold crystal body — kiln walking so Kael's door may leave and return. */
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

/** Low kiln-body. Radius of a Charge-to-door step, height of a street memory. */
const STONE_R = 0.72;
const STONE_H = 0.11;
/** Cylinder center: height 0.11 sits just above y=0. */
const STONE_Y = 0.06;
/**
 * Empty middle of foundry→gate. t=0.28..0.72 sits between dens, not inside
 * either floor. Foundry (70,-680) r=130 skip 140. Gate (520,480) r=130 skip 140.
 * Hub (0,0) skip 90 so we do not sit on Veyra's breath.
 * Bridge (640,90) skip 140 so we do not sit on kilnspan.
 * Join/market (−300,-340) skip 120 so we do not sit on Voss's Charge-walk.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const FOUNDRY_SKIP = 140;
const GATE_SKIP = 140;
const HUB_R = 90;
const BRIDGE_SKIP = 140;
const JOIN_SKIP = 120;
const BRIDGE_X = 640;
const BRIDGE_Z = 90;
const JOIN_X = -300;
const JOIN_Z = -340;
const N_FINE = 5;
const N_COARSE = 3;

export const KILNDOOR_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  foundrySkip: FOUNDRY_SKIP,
  gateSkip: GATE_SKIP,
  hubR: HUB_R,
  bridgeSkip: BRIDGE_SKIP,
  joinSkip: JOIN_SKIP,
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
 * Orren crystal-body walk on empty ground between DISTRICTS foundry and gate.
 * 5 CylinderGeometry r=0.72 h=0.11 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.14 roughness 0.24 metalness 0.5 iridescence
 * 0.42 clearcoat 0.4, evenly t=0.28..0.72 of foundry(70,-680) → gate(520,480),
 * y=0.06. Skip hypot < 140 from foundry or < 140 from gate. Also skip hypot
 * < 90 from hub (0,0), < 140 from bridge (640,90), < 120 from join
 * (-300,-340). Orren grows body that may leave and return. No score.
 * Not kilnwild. Not kilnspan. Not joinwalk. Not firelight. Not restgate /
 * hush / joinsoft / gateswild. Not heat/smoke/anvil. Not gates/veil. No tick.
 */
export function growKilndoor(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "kilndoor";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.kilndoorCounts = counts;
  root.userData.kilndoorCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    foundrySkip: FOUNDRY_SKIP,
    gateSkip: GATE_SKIP,
    hubR: HUB_R,
    bridgeSkip: BRIDGE_SKIP,
    joinSkip: JOIN_SKIP,
  };

  const foundry = den("foundry");
  const gate = den("gate");
  if (!foundry || !gate) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R || Math.hypot(gate.x, gate.z) < HUB_R) return;

  const dx = gate.x - foundry.x;
  const dz = gate.z - foundry.z;
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
    if (Math.hypot(x - gate.x, z - gate.z) < GATE_SKIP) continue;
    if (Math.hypot(x - BRIDGE_X, z - BRIDGE_Z) < BRIDGE_SKIP) continue;
    if (Math.hypot(x - JOIN_X, z - JOIN_Z) < JOIN_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), bodyGold(), poses, root);

  counts.n = poses.length;
  root.userData.kilndoorCount = poses.length;
}
