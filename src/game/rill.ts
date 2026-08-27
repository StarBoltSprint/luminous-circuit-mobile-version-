/** CHARGE RILL — leftover First Howl on empty ground Hub → canals.
 * A thin current that has not yet become a canal. Not rails (rails.ts).
 * Not sluice (sluice.ts). Not trough (trough.ts). Not canal water (water.ts).
 * Not wild veins (veins.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growRill(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";

function addCyan(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: false,
  });
}

function addGold(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: false,
  });
}

/** Thin current dash. Width across Hub→canal, short depth along the flow. */
const BOX_W = 6.2;
const BOX_H = 0.07;
const BOX_D = 0.55;
const BOX_Y = 0.05;
const BOX_OP = 0.22;
const BOX_HEX = 0x3aa8c0;
/** Parent-line kiss on the current. Skip on coarse. */
const GOLD_W = 2.2;
const GOLD_H = 0.05;
const GOLD_D = 0.18;
const GOLD_OP = 0.18;
const GOLD_HEX = 0xc4a060;
/**
 * Centered on empty ground Hub (0,0) → canal den (−620, 96).
 * Starts just outside Hub r<90, stops before canal radius 130.
 */
const START_X = -90;
const START_Z = 14;
const END_X = -490;
const END_Z = 76;
const N_FINE = 8;
const N_COARSE = 4;

export const RILL_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  op: BOX_OP,
  hex: BOX_HEX,
  goldW: GOLD_W,
  goldH: GOLD_H,
  goldD: GOLD_D,
  goldOp: GOLD_OP,
  goldHex: GOLD_HEX,
  startX: START_X,
  startZ: START_Z,
  endX: END_X,
  endZ: END_Z,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: 0,
  op: BOX_OP,
  hex: BOX_HEX,
  goldW: GOLD_W,
  goldH: GOLD_H,
  goldD: GOLD_D,
  goldOp: 0,
  goldHex: GOLD_HEX,
  startX: START_X,
  startZ: START_Z,
  endX: END_X,
  endZ: END_Z,
  midX: 0,
  midZ: 0,
  yaw: 0,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  n: 0,
  want: 0,
  goldCount: 0,
  rillCount: 0,
};

function nBoxes(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Charge rill on empty ground Hub → canal. 8 BoxGeometry 6.2×0.07×0.55
 * (coarse 4) MeshBasic cyan 0x3aa8c0 opacity 0.22 additive, depthWrite false.
 * Evenly spaced from (−90, 14) to (−490, 76), y=0.05, rotation.y follows the
 * line. 1 gold Box 2.2×0.05×0.18 at midpoint, opacity 0.18 hex 0xc4a060 —
 * parent-line kiss on the current; skip gold on coarse. No tick.
 * Not canal rails. Not sluice. Not trough. Not canal water. Not wild veins.
 */
export function growRill(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "rill";
  group.add(root);

  const want = nBoxes(coarse);
  const dx = END_X - START_X;
  const dz = END_Z - START_Z;
  const yaw = Math.atan2(dx, dz);
  const midX = (START_X + END_X) * 0.5;
  const midZ = (START_Z + END_Z) * 0.5;
  const sizes = { ...emptySizes, want, yaw, midX, midZ };
  root.userData.sizes = sizes;
  root.userData.rillCount = 0;
  root.userData.goldCount = 0;
  root.userData.start = { x: START_X, z: START_Z };
  root.userData.end = { x: END_X, z: END_Z };

  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  const geo = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D);
  const mesh = new THREE.InstancedMesh(geo, addCyan(BOX_OP), want);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 1;

  const denom = Math.max(1, want - 1);
  for (let i = 0; i < want; i++) {
    const t = i / denom;
    dummy.position.set(START_X + dx * t, BOX_Y, START_Z + dz * t);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);

  sizes.y = BOX_Y;
  sizes.n = want;
  sizes.rillCount = want;
  root.userData.rillCount = want;

  if (coarse) return;

  const gold = new THREE.Mesh(new THREE.BoxGeometry(GOLD_W, GOLD_H, GOLD_D), addGold(GOLD_OP));
  gold.position.set(midX, BOX_Y, midZ);
  gold.rotation.y = yaw;
  gold.castShadow = false;
  gold.receiveShadow = false;
  gold.frustumCulled = true;
  gold.renderOrder = 1;
  root.add(gold);

  sizes.goldOp = GOLD_OP;
  sizes.goldCount = 1;
  root.userData.goldCount = 1;
}
