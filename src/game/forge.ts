/** Orren KILN FORGE at foundry den — Charge becomes body on this hearth.
 * Low gold torus ring + inner additive gold disc. Not anvil (anvil.ts).
 * Not chimney (chimney.ts). Not heat shimmer (heat.ts). Not smoke (smoke.ts).
 * Parent hooks with:
 *   laterOn(() => { try { forge = growForge(group, coarse); } catch { } });
 *   // in world.tick(t): try { forge?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function goldRing() {
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

function chargeDisc(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0xd4a050,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Low hearth ring — sits on foundry stone, not the ward-scale kiln in world.ts. */
const RING_R = 2.4;
const RING_TUBE = 0.16;
/** Torus center sits one tube-radius up so the rim rests on the hearth. */
const RING_Y = RING_TUBE;
/** Inner Charge disc — nestled inside the ring, below the rim center. */
const DISC_R = RING_R - RING_TUBE - 0.16;
const DISC_Y = 0.08;
const DISC_OP = 0.14;
const DISC_OP_MIN = 0.08;
const DISC_OP_MAX = 0.22;
/** Hearth pulse — slower than chimney glow, not Hub breath. */
const GLOW = 0.72;
const HUB_R = 90;

export const FORGE_SIZES = {
  r: RING_R,
  tube: RING_TUBE,
  y: RING_Y,
  ringR: RING_R,
  ringTube: RING_TUBE,
  ringY: RING_Y,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  discOpMin: DISC_OP_MIN,
  discOpMax: DISC_OP_MAX,
  glow: GLOW,
};

const emptySizes = {
  r: RING_R,
  tube: RING_TUBE,
  y: 0,
  ringR: 0,
  ringTube: 0,
  ringY: 0,
  discR: 0,
  discY: 0,
  discOp: 0,
  discOpMin: 0,
  discOpMax: 0,
  glow: 0,
  x: 0,
  z: 0,
  ringCount: 0,
  discCount: 0,
  segs: 0,
};

/**
 * One Orren kiln-forge at DISTRICTS kind==="foundry" x,z. TorusGeometry
 * r=2.4 tube=0.16 MeshPhysical gold. Inner MeshBasic additive gold disc
 * opacity 0.14. tick: disc opacity 0.08–0.22. Charge becomes body here.
 * coarse: ring only, skip disc. One forge. Not anvil, not chimney.
 */
export function growForge(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "forge";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.ringCount = 0;
  root.userData.discCount = 0;
  root.userData.forgeCount = 0;

  const foundry = den("foundry");
  if (!foundry) return { tick() {} };
  if (Math.hypot(foundry.x, foundry.z) < HUB_R) return { tick() {} };

  const x = foundry.x;
  const z = foundry.z;
  const segs = coarse ? 10 : 16;
  const tubeSeg = coarse ? 5 : 8;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R, RING_TUBE, tubeSeg, segs),
    goldRing(),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, RING_Y, z);
  ring.castShadow = false;
  ring.receiveShadow = true;
  ring.frustumCulled = true;
  ring.renderOrder = 2;
  root.add(ring);

  sizes.x = x;
  sizes.y = RING_Y;
  sizes.z = z;
  sizes.ringR = RING_R;
  sizes.ringTube = RING_TUBE;
  sizes.ringY = RING_Y;
  sizes.segs = segs;
  sizes.ringCount = 1;
  root.userData.ringCount = 1;
  root.userData.forgeCount = 1;

  if (coarse) return { tick() {} };

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = chargeDisc(DISC_OP);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.set(x, DISC_Y, z);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  root.add(disc);

  sizes.discR = DISC_R;
  sizes.discY = DISC_Y;
  sizes.discOp = DISC_OP;
  sizes.discOpMin = DISC_OP_MIN;
  sizes.discOpMax = DISC_OP_MAX;
  sizes.glow = GLOW;
  sizes.discCount = 1;
  root.userData.discCount = 1;
  root.userData.breathing = true;

  const span = DISC_OP_MAX - DISC_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * GLOW) + 1) * 0.5;
      discMat.opacity = DISC_OP_MIN + u * span;
    },
  };
}
