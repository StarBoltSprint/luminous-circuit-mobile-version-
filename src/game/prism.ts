/** Nesh LENSING PRISM at watch/plaza aim den — gold cone. Charge is seen through this, not stored.
 * Not the plaza lens (lens.ts). Not the gold rim (rims.ts). Not the hail bowl (hail.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growPrism(group, coarse); } catch { } });
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

function goldPrism() {
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
    side: THREE.DoubleSide,
  });
}

/** Standing seeing-cone. Inside the plaza lens disc (r=3.6) and gold rim (r=2.9). */
const PRISM_R = 0.55;
const PRISM_H = 1.6;
/** Cone center — default ConeGeometry points +Y, so the apex sits up. */
const PRISM_Y = 1.1;
/** Same Hub apron as lens.ts / rims.ts — outside the heart, toward Nesh. */
const APRON_R = Math.min(84, Math.max(78, HUB.radius + 30));

export const PRISM_SIZES = {
  r: PRISM_R,
  h: PRISM_H,
  y: PRISM_Y,
  apronR: APRON_R,
};

/**
 * One Nesh lensing prism at the Hub plaza apron toward Nesh — same x,z as lens.ts.
 * ConeGeometry r=0.55 h=1.6 MeshPhysical gold at y=1.1, point-up (apex +Y).
 * Charge is seen through this, not stored. One prism. coarse: still one, fewer segs.
 * Not plaza lens. Not gold rim. Not hail bowl.
 */
export function growPrism(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "prism";
  group.add(root);

  const aim = neshAim();
  const x = aim.nx * APRON_R;
  const z = aim.nz * APRON_R;
  const segs = coarse ? 8 : 16;

  const prism = new THREE.Mesh(new THREE.ConeGeometry(PRISM_R, PRISM_H, segs), goldPrism());
  prism.position.set(x, PRISM_Y, z);
  prism.castShadow = false;
  prism.receiveShadow = true;
  prism.frustumCulled = true;
  prism.renderOrder = 2;
  root.add(prism);

  root.userData.prismCount = 1;
  root.userData.sizes = {
    x,
    y: PRISM_Y,
    z,
    r: PRISM_R,
    h: PRISM_H,
    prismY: PRISM_Y,
    apronR: APRON_R,
    segs,
  };
}
