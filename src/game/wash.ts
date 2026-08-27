/** HORIZON WASH — parent gold on the west vault, not a sun.
 * Huge additive disc behind the limb. Not glow.ts mapped disc, not vault.ts
 * dusk (r=920), not atmos halo. Leftover First Howl on the horizon.
 * Parent hooks with:
 *   laterOn(() => { try { growWash(group, coarse); } catch { } });
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const LOOK_Y = 80;
const WASH_R = 2100;
const WASH_R_COARSE = 1400;
const OP = 0.09;
const HEX = 0xd4a050;

function addMat(hex: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

export const WASH_SIZES = { r: WASH_R, op: OP };

/**
 * Horizon gold wash at STAR_CORE, lookAt(0, 80, 0). CircleGeometry r=2100
 * opacity 0.09 renderOrder -17. coarse r=1400. No tick.
 */
export function growWash(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "wash";
  group.add(root);

  const r = coarse ? WASH_R_COARSE : WASH_R;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, coarse ? 28 : 40), addMat(HEX, OP));
  mesh.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  mesh.lookAt(0, LOOK_Y, 0);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = -17;
  root.add(mesh);
}
