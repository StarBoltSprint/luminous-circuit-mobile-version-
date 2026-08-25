/** Lumen HAIL BOWL at the beacon den — soft hail, not a lock.
 * Lathe bowl r=2.2 MeshPhysical dark gold. Inner additive cyan disc opacity 0.16.
 * Not the High Beacon column (beam.ts). One bowl.
 * Parent hooks with:
 *   laterOn(() => { try { hail = growHail(group, coarse); } catch { } });
 *   // in world.tick(t): try { hail?.tick(t); } catch { }
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
    side: THREE.DoubleSide,
  });
}

function hailDisc(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3ec8e0,
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

/** Outer radius of the lathe bowl — a hail, not a lock, not a beam. */
const BOWL_R = 2.2;
const BOWL_H = 0.86;
const WALL = 0.18;
const DISC_R = 1.62;
const DISC_Y = 0.38;
const DISC_OP = 0.16;
const DISC_OP_MIN = 0.1;
const DISC_OP_MAX = 0.22;
/** Soft hail pulse — slower than the beacon column, not Hub breath. */
const HAIL = 0.84;
const HUB_R = 90;

const SIZES = {
  r: BOWL_R,
  h: BOWL_H,
  wall: WALL,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  discOpMin: DISC_OP_MIN,
  discOpMax: DISC_OP_MAX,
  hail: HAIL,
};

function bowlPts(r: number, h: number, wall: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(r * 0.48, 0.04),
    new THREE.Vector2(r * 0.86, h * 0.38),
    new THREE.Vector2(r, h),
    new THREE.Vector2(r - wall, h),
    new THREE.Vector2(r * 0.72, h * 0.4),
    new THREE.Vector2(r * 0.32, wall),
    new THREE.Vector2(0.05, wall * 0.65),
  ];
}

const emptySizes = {
  r: BOWL_R,
  h: BOWL_H,
  wall: WALL,
  discR: 0,
  discY: 0,
  discOp: 0,
  discOpMin: 0,
  discOpMax: 0,
  hail: 0,
  x: 0,
  y: 0,
  z: 0,
  bowlCount: 0,
  discCount: 0,
  segs: 0,
};

/**
 * One Lumen hail-bowl at DISTRICTS kind==="beacon" x,z. LatheGeometry bowl
 * r=2.2 MeshPhysical dark gold. Inner CircleGeometry r=1.62 at y=0.38
 * MeshBasic additive cyan opacity 0.16. tick: disc opacity 0.10–0.22.
 * Not the beacon beam. coarse: bowl only, skip disc. One bowl.
 */
export function growHail(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "hail";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.bowlCount = 0;
  root.userData.discCount = 0;
  root.userData.hailCount = 0;

  const beacon = den("beacon");
  if (!beacon) return { tick() {} };
  if (Math.hypot(beacon.x, beacon.z) < HUB_R) return { tick() {} };

  const x = beacon.x;
  const z = beacon.z;
  const segs = coarse ? 10 : 20;
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlPts(BOWL_R, BOWL_H, WALL), segs),
    darkGold(),
  );
  bowl.position.set(x, 0, z);
  bowl.castShadow = false;
  bowl.receiveShadow = true;
  bowl.frustumCulled = true;
  bowl.renderOrder = 2;
  root.add(bowl);

  sizes.x = x;
  sizes.y = 0;
  sizes.z = z;
  sizes.bowlCount = 1;
  sizes.segs = segs;
  root.userData.bowlCount = 1;
  root.userData.hailCount = 1;

  if (coarse) return { tick() {} };

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = hailDisc(DISC_OP);
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
  sizes.hail = HAIL;
  sizes.discCount = 1;
  root.userData.discCount = 1;
  root.userData.breathing = true;

  const span = DISC_OP_MAX - DISC_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * HAIL) + 1) * 0.5;
      discMat.opacity = DISC_OP_MIN + u * span;
    },
  };
}

export { SIZES as HAIL_SIZES };
