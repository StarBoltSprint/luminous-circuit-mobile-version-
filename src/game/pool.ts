/** Seln HOWL CRADLE INNER POOL at the canal cradle — leftover First Howl rests here.
 * One Cylinder r=2.2 h=0.06 MeshBasic additive cyan opacity 0.18, inside cradle.ts
 * bowl (not the bowl itself). Not cisterns. Not hail bowl. Not fountain.
 * Parent hooks with:
 *   laterOn(() => { try { pool = growPool(group, coarse); } catch { } });
 *   // in world.tick(t): try { pool?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function howlPool(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
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

/** Thin Howl disc — sits inside cradle.ts lathe bowl (r=3.4), not the bowl. */
const POOL_R = 2.2;
const POOL_H = 0.06;
/** Below cradle disc y=0.5, above inner floor — leftover Howl rest. */
const POOL_Y = 0.47;
const POOL_OP = 0.18;
const POOL_OP_MIN = 0.1;
const POOL_OP_MAX = 0.26;
/** Slow rest pulse — not Hub breath (0.68), not hail (0.84). */
const REST = 0.56;
/** Matches cradle.ts pose — up-canal of Howl-fall, off the current. */
const ALONG = -16;
const SIDE = 20;
const HUB_R = 90;

const SIZES = {
  r: POOL_R,
  h: POOL_H,
  y: POOL_Y,
  op: POOL_OP,
  opMin: POOL_OP_MIN,
  opMax: POOL_OP_MAX,
  rest: REST,
  along: ALONG,
  side: SIDE,
};

const emptySizes = {
  r: POOL_R,
  h: POOL_H,
  y: 0,
  op: 0,
  opMin: 0,
  opMax: 0,
  rest: 0,
  along: ALONG,
  side: SIDE,
  x: 0,
  z: 0,
  poolCount: 0,
  discCount: 0,
  segs: 0,
};

/**
 * One Seln Howl-cradle inner pool at the canal cradle pose (cradle.ts ALONG/SIDE).
 * CylinderGeometry r=2.2 h=0.06 MeshBasic additive cyan opacity 0.18 at y=0.47.
 * Inside the lathe bowl — not the bowl, not cistern wells, not hail, not fountain.
 * tick: opacity 0.10–0.26. coarse: skip tick, still one disc. One pool.
 */
export function growPool(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "pool";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.poolCount = 0;
  root.userData.discCount = 0;
  root.userData.breathing = false;

  const canal = den("canal");
  if (!canal) return { tick() {} };
  if (Math.hypot(canal.x, canal.z) < HUB_R) return { tick() {} };

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const s1 = Math.hypot(canal.x + px * SIDE, canal.z + pz * SIDE);
  const s2 = Math.hypot(canal.x - px * SIDE, canal.z - pz * SIDE);
  const side = s1 >= s2 ? 1 : -1;
  const x = canal.x + ux * ALONG + px * SIDE * side;
  const z = canal.z + uz * ALONG + pz * SIDE * side;
  if (Math.hypot(x, z) < HUB_R) return { tick() {} };

  const segs = coarse ? 10 : 20;
  const discMat = howlPool(POOL_OP);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(POOL_R, POOL_R, POOL_H, segs),
    discMat,
  );
  disc.position.set(x, POOL_Y, z);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  root.add(disc);

  sizes.x = x;
  sizes.y = POOL_Y;
  sizes.z = z;
  sizes.op = POOL_OP;
  sizes.opMin = coarse ? POOL_OP : POOL_OP_MIN;
  sizes.opMax = coarse ? POOL_OP : POOL_OP_MAX;
  sizes.rest = coarse ? 0 : REST;
  sizes.poolCount = 1;
  sizes.discCount = 1;
  sizes.segs = segs;
  root.userData.poolCount = 1;
  root.userData.discCount = 1;
  root.userData.breathing = !coarse;

  if (coarse) return { tick() {} };

  const span = POOL_OP_MAX - POOL_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * REST) + 1) * 0.5;
      discMat.opacity = POOL_OP_MIN + u * span;
    },
  };
}

export { SIZES as POOL_SIZES };
