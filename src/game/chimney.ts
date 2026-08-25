/** Orren KILN CHIMNEY at foundry den — the stack the kiln breathes through.
 * Not heat shimmer (heat.ts). Not smoke wisps (smoke.ts). One chimney.
 * Parent hooks with:
 *   laterOn(() => { try { chimney = growChimney(group, coarse); } catch { } });
 *   // in world.tick(t): try { chimney?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
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

function goldRing(opacity: number) {
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

/** Walkable kiln stack — not the ward-scale flue in world.ts. */
const STACK_H = 7.2;
const STACK_R = 0.38;
const STACK_Y = STACK_H * 0.5;
/** Torus crown sits on the rim, slightly proud of the stack wall. */
const RING_R = 0.44;
const RING_TUBE = 0.08;
const RING_Y = STACK_H;
const RING_OP = 0.2;
const RING_OP_MIN = 0.12;
const RING_OP_MAX = 0.28;
/** Kiln-mouth glow — slower than the beacon column, not Hub breath. */
const GLOW = 0.78;
const HUB_R = 90;

export const CHIMNEY_SIZES = {
  h: STACK_H,
  r: STACK_R,
  y: STACK_Y,
  ringR: RING_R,
  ringTube: RING_TUBE,
  ringY: RING_Y,
  ringOp: RING_OP,
  ringOpMin: RING_OP_MIN,
  ringOpMax: RING_OP_MAX,
  glow: GLOW,
};

const emptySizes = {
  h: STACK_H,
  r: STACK_R,
  y: 0,
  ringR: 0,
  ringTube: 0,
  ringY: 0,
  ringOp: 0,
  ringOpMin: 0,
  ringOpMax: 0,
  glow: 0,
  x: 0,
  z: 0,
  stackCount: 0,
  ringCount: 0,
  segs: 0,
};

/**
 * One Orren kiln-chimney at DISTRICTS kind==="foundry" x,z. CylinderGeometry
 * h=7.2 r=0.38 MeshPhysical dark gold. MeshBasic additive gold torus ring
 * at the top, opacity 0.2. tick: ring opacity 0.12–0.28. Not heat, not smoke.
 * coarse: stack only, skip ring. One chimney.
 */
export function growChimney(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "chimney";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.stackCount = 0;
  root.userData.ringCount = 0;
  root.userData.chimneyCount = 0;

  const foundry = den("foundry");
  if (!foundry) return { tick() {} };
  if (Math.hypot(foundry.x, foundry.z) < HUB_R) return { tick() {} };

  const x = foundry.x;
  const z = foundry.z;
  const segs = coarse ? 8 : 12;

  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(STACK_R, STACK_R, STACK_H, segs),
    darkGold(),
  );
  stack.position.set(x, STACK_Y, z);
  stack.castShadow = false;
  stack.receiveShadow = true;
  stack.frustumCulled = true;
  stack.renderOrder = 2;
  root.add(stack);

  sizes.x = x;
  sizes.y = STACK_Y;
  sizes.z = z;
  sizes.stackCount = 1;
  sizes.segs = segs;
  root.userData.stackCount = 1;
  root.userData.chimneyCount = 1;

  if (coarse) return { tick() {} };

  const tubeSeg = 6;
  const ringGeo = new THREE.TorusGeometry(RING_R, RING_TUBE, tubeSeg, segs);
  const ringMat = goldRing(RING_OP);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, RING_Y, z);
  ring.castShadow = false;
  ring.receiveShadow = false;
  ring.frustumCulled = true;
  ring.renderOrder = 3;
  root.add(ring);

  sizes.ringR = RING_R;
  sizes.ringTube = RING_TUBE;
  sizes.ringY = RING_Y;
  sizes.ringOp = RING_OP;
  sizes.ringOpMin = RING_OP_MIN;
  sizes.ringOpMax = RING_OP_MAX;
  sizes.glow = GLOW;
  sizes.ringCount = 1;
  root.userData.ringCount = 1;
  root.userData.breathing = true;

  const span = RING_OP_MAX - RING_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * GLOW) + 1) * 0.5;
      ringMat.opacity = RING_OP_MIN + u * span;
    },
  };
}
