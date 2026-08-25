/** Orren KILN ANVIL — Charge becomes body at the foundry den.
 * Work stone under the kiln, not kiln heat (heat.ts), not chimney wisps (smoke.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growAnvil(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0x5a4020,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function crystalBody() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.14,
    metalness: 0.42,
    emissive: 0xd4a050,
    emissiveIntensity: 0.22,
    iridescence: 0.62,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.56,
    clearcoatRoughness: 0.18,
    transparent: false,
  });
}

const ANVIL_W = 2.4;
const ANVIL_H = 0.7;
const ANVIL_D = 1.2;
const ANVIL_Y = 0.85;
const OCTA_R = 0.22;
const OCTA_Y = ANVIL_Y + ANVIL_H * 0.5 + OCTA_R;
const HUB_R = 90;

export const ANVIL_SIZES = {
  w: ANVIL_W,
  h: ANVIL_H,
  d: ANVIL_D,
  y: ANVIL_Y,
  octaR: OCTA_R,
  octaY: OCTA_Y,
};

const emptySizes = {
  w: ANVIL_W,
  h: ANVIL_H,
  d: ANVIL_D,
  y: 0,
  octaR: 0,
  octaY: 0,
  anvilCount: 0,
  octaCount: 0,
};

/**
 * One Orren kiln-anvil at DISTRICTS kind==="foundry" x,z. BoxGeometry
 * 2.4×0.7×1.2 at y=0.85, MeshPhysical dark gold. Small crystal octa on top
 * (Charge becomes body here). coarse: skip octa. Not heat, not smoke.
 */
export function growAnvil(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "anvil";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.anvilCount = 0;
  root.userData.octaCount = 0;

  const foundry = den("foundry");
  if (!foundry) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R) return;

  const cx = foundry.x;
  const cz = foundry.z;
  const yaw = Math.atan2(cx, cz);

  const body = new THREE.Mesh(new THREE.BoxGeometry(ANVIL_W, ANVIL_H, ANVIL_D), darkGold());
  body.position.set(cx, ANVIL_Y, cz);
  body.rotation.y = yaw;
  body.castShadow = false;
  body.receiveShadow = true;
  body.frustumCulled = true;
  root.add(body);

  sizes.y = ANVIL_Y;
  sizes.anvilCount = 1;
  root.userData.anvilCount = 1;

  if (!coarse) {
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(OCTA_R, 0), crystalBody());
    octa.position.set(cx, OCTA_Y, cz);
    octa.rotation.y = yaw;
    octa.castShadow = false;
    octa.receiveShadow = true;
    octa.frustumCulled = true;
    root.add(octa);

    sizes.octaR = OCTA_R;
    sizes.octaY = OCTA_Y;
    sizes.octaCount = 1;
    root.userData.octaCount = 1;
  }
}
