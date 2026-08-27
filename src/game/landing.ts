/** KESH LANDING STONES on empty ground BETWEEN Wild Veins (860,-640 r=140)
 * and Light-Bridge (640,90 r=130). A far bank Tal's span can trust.
 * Not wilds.ts vein crystals. Not spans.ts bridges. Not pylons.ts.
 * Not cairn.ts way-cairns (those are stacked octa at other mids).
 * Parent hooks with:
 *   laterOn(() => { try { growLanding(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold bank, leftover First Howl in the emissive — a landing both dens believe. */
function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.28,
    metalness: 0.48,
    emissive: 0x3aa8c0,
    emissiveIntensity: 0.12,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.38,
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
    dummy.scale.set(SCALE_X, SCALE_Y, SCALE_Z);
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

/** Low oval landing. Radius of a far-bank stand, height of a street memory. */
const STONE_R = 1.15;
const STONE_H = 0.16;
/** Cylinder center: height 0.16 sits on y=0. */
const STONE_Y = 0.08;
/** Slightly oval — wider across the span, shorter along the walk. */
const SCALE_X = 1.4;
const SCALE_Y = 1;
const SCALE_Z = 0.85;
/**
 * Empty middle of wild→bridge. t=0.38..0.62 is the short line around the
 * world midpoint (~750, -275). Stops outside both den floors.
 * Wild (860,-640) r=140. Bridge (640,90) r=130.
 */
const T_LO = 0.38;
const T_HI = 0.62;
const WILD_SKIP = 150;
const BRIDGE_SKIP = 140;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const LANDING_SIZES = {
  r: STONE_R,
  h: STONE_H,
  y: STONE_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  wildSkip: WILD_SKIP,
  bridgeSkip: BRIDGE_SKIP,
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
 * Kesh landing stones on empty ground between DISTRICTS wild and bridge.
 * 5 CylinderGeometry r=1.15 h=0.16 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0x3aa8c0 intensity 0.12, evenly t=0.38..0.62 of wild(860,-640) →
 * bridge(640,90), y=0.08, scale 1.4×1×0.85. Skip hypot < 150 from wild or
 * < 140 from bridge. A far bank Tal's span can trust.
 * Not vein crystals. Not span decks. Not pylons. Not stacked-octa way-cairns.
 */
export function growLanding(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "landing";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.landingCounts = counts;
  root.userData.landingCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: STONE_R,
    h: STONE_H,
    y: STONE_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
  };

  const wild = den("wild");
  const bridge = den("bridge");
  if (!wild || !bridge) return;
  if (Math.hypot(wild.x, wild.z) < HUB_R || Math.hypot(bridge.x, bridge.z) < HUB_R) return;

  const dx = bridge.x - wild.x;
  const dz = bridge.z - wild.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = wild.x + dx * t;
    const z = wild.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - wild.x, z - wild.z) < WILD_SKIP) continue;
    if (Math.hypot(x - bridge.x, z - bridge.z) < BRIDGE_SKIP) continue;
    poses.push({ x, y: STONE_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(STONE_R, STONE_R, STONE_H, segs), darkGold(), poses, root);

  counts.n = poses.length;
  root.userData.landingCount = poses.length;
}
