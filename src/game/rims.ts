/** Plaza LENS RIM at Hub — gold torus around the plaza lens. Charge is seen here, not stored.
 * Not the lens disc (lens.ts). Not mosaic tiles (mosaic.ts). Not the Hub breath basin (fountain.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growRims(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { CITIZENS, HUB } from "./lore";

function neshAim() {
  const nesh = CITIZENS.find((c) => c.id === "nesh");
  const nx = nesh?.x ?? -24;
  const nz = nesh?.z ?? 128;
  const len = Math.hypot(nx, nz) || 1;
  return { nx: nx / len, nz: nz / len };
}

function goldRim() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.22,
    metalness: 0.48,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.16,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

/** Inner gold seeing-rim. Inside the plaza lens disc (r=3.6), below it (disc y=0.22). */
const RIM_R = 2.9;
const TUBE = 0.08;
const RIM_Y = 0.12;
/** Same Hub apron as lens.ts — outside the heart, toward Nesh. */
const APRON_R = Math.min(84, Math.max(78, HUB.radius + 30));

export const RIMS_SIZES = {
  r: RIM_R,
  tube: TUBE,
  y: RIM_Y,
  apronR: APRON_R,
};

/**
 * One plaza lens rim at the Hub apron toward Nesh — same x,z as lens.ts.
 * TorusGeometry r=2.9 tube=0.08 MeshPhysical gold at y=0.12.
 * Charge is seen here, not stored. One rim. coarse: still one, fewer segs.
 * Not lens disc. Not mosaic. Not fountain basin.
 */
export function growRims(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "rims";
  group.add(root);

  const aim = neshAim();
  const x = aim.nx * APRON_R;
  const z = aim.nz * APRON_R;
  const segs = coarse ? 12 : 22;
  const tubeSeg = coarse ? 5 : 8;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, TUBE, tubeSeg, segs), goldRim());
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, RIM_Y, z);
  rim.castShadow = false;
  rim.receiveShadow = true;
  rim.frustumCulled = true;
  rim.renderOrder = 2;
  root.add(rim);

  root.userData.rimCount = 1;
  root.userData.sizes = {
    x,
    y: RIM_Y,
    z,
    r: RIM_R,
    tube: TUBE,
    rimY: RIM_Y,
    apronR: APRON_R,
    segs,
    tubeSeg,
  };
}
