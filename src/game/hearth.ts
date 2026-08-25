/** Orren KILN HEARTH PLATE at foundry den — Charge rests here before it becomes body.
 * One low cylinder, offset from the forge torus (forge.ts r=2.4). Not the forge
 * ring. Not anvil (anvil.ts). Not chimney (chimney.ts). Not heat (heat.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growHearth(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No vibrate. No photos.
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

/** Low rest plate — Charge sits here, then walks the forge ring to become body. */
const PLATE_R = 2.8;
const PLATE_H = 0.18;
/** Cylinder center: height 0.18 sits on y=0. */
const PLATE_Y = PLATE_H * 0.5;
/**
 * forge.ts torus r=2.4 tube=0.16 → outer 2.56. Plate r=2.8. Gap 1.04 so the
 * rest plate never reads as the forge ring, never under the anvil or stack.
 */
const FORGE_R = 2.4;
const FORGE_TUBE = 0.16;
const OFFSET = FORGE_R + FORGE_TUBE + PLATE_R + 1.04;
/** Thin rim on the plate — not a forge torus (r=2.4 tube=0.16). */
const LIP_R = PLATE_R - 0.08;
const LIP_TUBE = 0.06;
const LIP_Y = PLATE_H;
const HUB_R = 90;

export const HEARTH_SIZES = {
  r: PLATE_R,
  h: PLATE_H,
  y: PLATE_Y,
  offset: OFFSET,
  forgeR: FORGE_R,
  lipR: LIP_R,
  lipTube: LIP_TUBE,
  lipY: LIP_Y,
};

const emptySizes = {
  r: PLATE_R,
  h: PLATE_H,
  y: 0,
  offset: 0,
  forgeR: FORGE_R,
  lipR: 0,
  lipTube: 0,
  lipY: 0,
  x: 0,
  z: 0,
  plateCount: 0,
  lipCount: 0,
  segs: 0,
};

/**
 * One Orren kiln-hearth plate at DISTRICTS kind==="foundry" x,z, offset from
 * the forge torus (forge.ts r=2.4). CylinderGeometry r=2.8 h=0.18 MeshPhysical
 * dark gold. Charge rests here before it becomes body. coarse: same one plate,
 * skip extra lip. One plate. Not forge ring, not anvil, not chimney, not heat.
 */
export function growHearth(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hearth";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.plateCount = 0;
  root.userData.lipCount = 0;
  root.userData.hearthCount = 0;

  const foundry = den("foundry");
  if (!foundry) return;
  if (Math.hypot(foundry.x, foundry.z) < HUB_R) return;

  const join = den("market");
  const aimX = (join?.x ?? 0) - foundry.x;
  const aimZ = (join?.z ?? 0) - foundry.z;
  const len = Math.hypot(aimX, aimZ) || 1;
  const x = foundry.x + (aimX / len) * OFFSET;
  const z = foundry.z + (aimZ / len) * OFFSET;
  if (Math.hypot(x, z) < HUB_R) return;

  const segs = coarse ? 10 : 16;
  const gold = darkGold();

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(PLATE_R, PLATE_R, PLATE_H, segs),
    gold,
  );
  plate.position.set(x, PLATE_Y, z);
  plate.castShadow = false;
  plate.receiveShadow = true;
  plate.frustumCulled = true;
  plate.renderOrder = 2;
  root.add(plate);

  sizes.x = x;
  sizes.y = PLATE_Y;
  sizes.z = z;
  sizes.offset = OFFSET;
  sizes.segs = segs;
  sizes.plateCount = 1;
  root.userData.plateCount = 1;
  root.userData.hearthCount = 1;

  if (coarse) return;

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(LIP_R, LIP_TUBE, 6, segs),
    gold,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.set(x, LIP_Y, z);
  lip.castShadow = false;
  lip.receiveShadow = true;
  lip.frustumCulled = true;
  lip.renderOrder = 2;
  root.add(lip);

  sizes.lipR = LIP_R;
  sizes.lipTube = LIP_TUBE;
  sizes.lipY = LIP_Y;
  sizes.lipCount = 1;
  root.userData.lipCount = 1;
}
