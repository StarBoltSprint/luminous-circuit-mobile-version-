/** Star Core CORONA RAYS at the parent Star Core — charge is seen, not stored.
 * Not atmos.ts discs. Not Lumen beacon (beam.ts). Not plaza lens (lens.ts).
 * Parent hooks with:
 *   laterOn(() => { try { corona = growCorona(group, coarse); } catch { } });
 *   // in world.tick(t): try { corona?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";

/** Same parent Star Core as atmos.ts CORE_X/Y/Z. STAR_CORE is not exported from atmos. */
const STAR_CORE = { x: -4050, y: 540, z: 195 };
/** atmos lookAt uses CORE_Y * 0.35 = 189; task pins 190. */
const LOOK_Y = 190;

const RAY_W = 8;
const RAY_H = 420;
const RAY_N = 6;
const RAY_N_COARSE = 3;
const RAY_OP = 0.07;
const RAY_HEX = 0xe8c070;
const RAY_SPIN = 0.04;
const RAY_ORDER = -6;

const INNER_R = 22;
const INNER_R_COARSE = 16;
const INNER_OP = 0.18;
const INNER_OP_MIN = 0.12;
const INNER_OP_MAX = 0.26;
const INNER_HEX = 0xffe0a0;
const INNER_PULSE = 0.7;
const INNER_ORDER = -5;

const SIZES = {
  x: STAR_CORE.x,
  y: STAR_CORE.y,
  z: STAR_CORE.z,
  lookY: LOOK_Y,
  rayW: RAY_W,
  rayH: RAY_H,
  rayN: RAY_N,
  rayNCoarse: RAY_N_COARSE,
  rayOp: RAY_OP,
  raySpin: RAY_SPIN,
  innerR: INNER_R,
  innerRCoarse: INNER_R_COARSE,
  innerOp: INNER_OP,
  innerOpMin: INNER_OP_MIN,
  innerOpMax: INNER_OP_MAX,
  pulse: INNER_PULSE,
};

function addGold(hex: number, opacity: number) {
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

/**
 * Star Core corona rays at STAR_CORE (-4050, 540, 195). Group lookAt(0, 190, 0).
 * 6 PlaneGeometry w=8 h=420 (coarse 3) MeshBasic additive gold 0xe8c070 opacity
 * 0.07, equally rotated on local Z. Inner SphereGeometry r=22 (coarse 16)
 * additive 0xffe0a0 opacity 0.18. tick: rays 0.04 rad/s + inner opacity 0.12–0.26
 * via sin(t*0.7). coarse: skip tick pulse, still plant rays. Charge is seen, not stored.
 */
export function growCorona(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "corona";
  group.add(root);

  const n = coarse ? RAY_N_COARSE : RAY_N;
  const innerR = coarse ? INNER_R_COARSE : INNER_R;
  const segs = coarse ? 8 : 12;
  const rings = coarse ? 6 : 10;

  const core = new THREE.Group();
  core.name = "corona-core";
  core.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  core.lookAt(0, LOOK_Y, 0);
  core.frustumCulled = false;
  core.castShadow = false;
  core.receiveShadow = false;

  const rays = new THREE.Group();
  rays.name = "corona-rays";
  rays.frustumCulled = false;
  const rayGeo = new THREE.PlaneGeometry(RAY_W, RAY_H);
  const rayMat = addGold(RAY_HEX, RAY_OP);
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(rayGeo, rayMat);
    mesh.rotation.z = (i / n) * Math.PI;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = RAY_ORDER;
    rays.add(mesh);
  }
  core.add(rays);

  const innerMat = addGold(INNER_HEX, INNER_OP);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(innerR, segs, rings), innerMat);
  inner.castShadow = false;
  inner.receiveShadow = false;
  inner.frustumCulled = false;
  inner.renderOrder = INNER_ORDER;
  core.add(inner);

  root.add(core);

  root.userData.rayCount = n;
  root.userData.innerCount = 1;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    x: STAR_CORE.x,
    y: STAR_CORE.y,
    z: STAR_CORE.z,
    lookY: LOOK_Y,
    rayW: RAY_W,
    rayH: RAY_H,
    rayN: n,
    rayOp: RAY_OP,
    raySpin: coarse ? 0 : RAY_SPIN,
    innerR,
    innerOp: INNER_OP,
    innerOpMin: coarse ? INNER_OP : INNER_OP_MIN,
    innerOpMax: coarse ? INNER_OP : INNER_OP_MAX,
    pulse: coarse ? 0 : INNER_PULSE,
    segs,
    rings,
  };

  if (coarse) return { tick() {} };

  const span = INNER_OP_MAX - INNER_OP_MIN;
  return {
    tick(t: number) {
      rays.rotation.z = t * RAY_SPIN;
      const u = (Math.sin(t * INNER_PULSE) + 1) * 0.5;
      innerMat.opacity = INNER_OP_MIN + u * span;
    },
  };
}

export { SIZES as CORONA_SIZES };
