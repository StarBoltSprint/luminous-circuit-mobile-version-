/** Nearer SKY VAULT dusk glow toward the parent Star Core.
 * Horizon gold — the parent dusk, not a sun. Not atmos.ts sky sphere, not
 * atmos rivers, not corona rays. Circuit-answer river closer than atmos bands.
 * Parent hooks with:
 *   laterOn(() => { try { growVault(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No vibrate. No photos.
 */
import * as THREE from "three";

/** atmos.ts does not export STAR_CORE — same west-horizon seat. */
const STAR_CORE = { x: -4050, y: 540, z: 195 };
const LOOK_AT = { x: 0, y: 80, z: 0 };

const DUSK_R = 920;
const DUSK_R_COARSE = 640;
const DUSK_HEX = 0xd4a050;
const DUSK_OP = 0.055;
const DUSK_ORDER = -14;

const HALO_R = 1480;
const HALO_HEX = 0xc08040;
const HALO_OP = 0.028;
const HALO_ORDER = -15;

const RIVER_R = 2680;
const RIVER_TUBE = 42;
const RIVER_HEX = 0x3aa8c0;
const RIVER_OP = 0.035;
const RIVER_RX = 1.18;
const RIVER_Y = 720;
const RIVER_ORDER = -13;

function addMat(hex: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

const SIZES = {
  duskR: DUSK_R,
  duskRCoarse: DUSK_R_COARSE,
  duskHex: DUSK_HEX,
  duskOp: DUSK_OP,
  duskOrder: DUSK_ORDER,
  haloR: HALO_R,
  haloHex: HALO_HEX,
  haloOp: HALO_OP,
  haloOrder: HALO_ORDER,
  riverR: RIVER_R,
  riverTube: RIVER_TUBE,
  riverHex: RIVER_HEX,
  riverOp: RIVER_OP,
  riverRx: RIVER_RX,
  riverY: RIVER_Y,
  riverOrder: RIVER_ORDER,
  lookAtY: LOOK_AT.y,
  coreX: STAR_CORE.x,
  coreY: STAR_CORE.y,
  coreZ: STAR_CORE.z,
};

/**
 * One nearer dusk disc at STAR_CORE looking at (0, 80, 0). CircleGeometry
 * r=920 (coarse r=640) MeshBasic additive 0xd4a050 opacity 0.055, fog false,
 * depthWrite false, renderOrder -14. Fine also: outer CircleGeometry r=1480
 * 0xc08040 opacity 0.028 renderOrder -15, and TorusGeometry r=2680 tube=42
 * cyan 0x3aa8c0 opacity 0.035 rotation.x=1.18 y=720 renderOrder -13.
 * Parent dusk, not a sun. Not atmos sky / rivers / corona.
 */
export function growVault(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "vault";
  group.add(root);

  const duskR = coarse ? DUSK_R_COARSE : DUSK_R;
  const segs = coarse ? 20 : 32;

  const pose = new THREE.Group();
  pose.name = "dusk";
  pose.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  pose.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
  pose.frustumCulled = false;
  root.add(pose);

  const dusk = new THREE.Mesh(new THREE.CircleGeometry(duskR, segs), addMat(DUSK_HEX, DUSK_OP));
  dusk.renderOrder = DUSK_ORDER;
  dusk.castShadow = false;
  dusk.receiveShadow = false;
  dusk.frustumCulled = false;
  pose.add(dusk);

  if (!coarse) {
    const halo = new THREE.Mesh(new THREE.CircleGeometry(HALO_R, segs), addMat(HALO_HEX, HALO_OP));
    halo.renderOrder = HALO_ORDER;
    halo.castShadow = false;
    halo.receiveShadow = false;
    halo.frustumCulled = false;
    pose.add(halo);

    const river = new THREE.Mesh(
      new THREE.TorusGeometry(RIVER_R, RIVER_TUBE, 6, 64),
      addMat(RIVER_HEX, RIVER_OP),
    );
    river.rotation.x = RIVER_RX;
    river.position.y = RIVER_Y;
    river.renderOrder = RIVER_ORDER;
    river.castShadow = false;
    river.receiveShadow = false;
    river.frustumCulled = false;
    root.add(river);
  }

  root.userData.duskCount = 1;
  root.userData.haloCount = coarse ? 0 : 1;
  root.userData.riverCount = coarse ? 0 : 1;
  root.userData.sizes = {
    duskR,
    duskRFine: DUSK_R,
    duskRCoarse: DUSK_R_COARSE,
    duskHex: DUSK_HEX,
    duskOp: DUSK_OP,
    duskOrder: DUSK_ORDER,
    haloR: coarse ? 0 : HALO_R,
    haloHex: HALO_HEX,
    haloOp: HALO_OP,
    haloOrder: HALO_ORDER,
    riverR: coarse ? 0 : RIVER_R,
    riverTube: coarse ? 0 : RIVER_TUBE,
    riverHex: RIVER_HEX,
    riverOp: RIVER_OP,
    riverRx: RIVER_RX,
    riverY: RIVER_Y,
    riverOrder: RIVER_ORDER,
    lookAtY: LOOK_AT.y,
    coreX: STAR_CORE.x,
    coreY: STAR_CORE.y,
    coreZ: STAR_CORE.z,
    segs,
  };
}

export { SIZES as VAULT_SIZES };
