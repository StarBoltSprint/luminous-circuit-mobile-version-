/** STAR GLINTS — leftover First Howl twinkling on the vault.
 * Not atmos.ts instanced stars. Not corona rays. Not shards.ts orbit octahedra.
 * Not flare.ts streaks. Individual octahedra so each can breathe.
 * Parent hooks with:
 *   laterOn(() => { try { glint = growGlint(group, coarse); } catch { } });
 *   // in world.tick(t): try { glint?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE, SKY_R } from "./atmos";

const GLINT_N = 18;
const GLINT_N_COARSE = 8;
const GLINT_R = SKY_R * 0.74;
const CORE_SKIP = 0.92;
const SCALE_MIN = 6;
const SCALE_MAX = 16;
const GLINT_ORDER = -11;
const OP_MIN = 0.18;
const OP_MAX = 0.85;
const OP_BASE = 0.7;
const OP_STEP = 0.13;
const PAL = [0xffe8b0, 0xc8d8f0, 0x9ecad8, 0xc4a8e0] as const;

const SIZES = {
  n: GLINT_N,
  nCoarse: GLINT_N_COARSE,
  r: GLINT_R,
  skyR: SKY_R,
  coreSkip: CORE_SKIP,
  scaleMin: SCALE_MIN,
  scaleMax: SCALE_MAX,
  order: GLINT_ORDER,
  opMin: OP_MIN,
  opMax: OP_MAX,
  opBase: OP_BASE,
  opStep: OP_STEP,
  pal: PAL,
  coreX: STAR_CORE.x,
  coreY: STAR_CORE.y,
  coreZ: STAR_CORE.z,
};

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function addGlint(hex: number, opacity: number) {
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

function nGlints(coarse: boolean): number {
  return coarse ? GLINT_N_COARSE : GLINT_N;
}

function opAt(t: number, i: number) {
  const u = (Math.sin(t * (OP_BASE + i * OP_STEP) + i) + 1) * 0.5;
  return OP_MIN + u * (OP_MAX - OP_MIN);
}

/**
 * Star glints on the vault sphere r = SKY_R * 0.74. 18 OctahedronGeometry(1, 0)
 * (coarse 8) MeshBasic additive, vertex colors not used, pal gold/cyan/violet
 * [0xffe8b0, 0xc8d8f0, 0x9ecad8, 0xc4a8e0]. Skip any whose direction-dot to
 * STAR_CORE > 0.92 — do not sit on the parent. Scale 6–16, fog false,
 * depthWrite false, renderOrder -11. tick: each glint opacity 0.18–0.85 via
 * sin(t * (0.7 + i * 0.13) + i). coarse: still plant, skip tick. Leftover
 * First Howl twinkling — not instanced stars, corona, orbit shards, or flare.
 */
export function growGlint(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "glint";
  group.add(root);

  const want = nGlints(coarse);
  const geo = new THREE.OctahedronGeometry(1, 0);
  const coreLen = Math.hypot(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z) || 1;
  const span = SCALE_MAX - SCALE_MIN;
  const mats: THREE.MeshBasicMaterial[] = [];
  let placed = 0;

  for (let i = 0; placed < want && i < want * 8; i++) {
    const theta = hash(i, 11) * Math.PI * 2;
    const phi = Math.acos(0.06 + hash(i, 23) * 0.78);
    const x = GLINT_R * Math.sin(phi) * Math.cos(theta);
    const y = GLINT_R * Math.cos(phi);
    const z = GLINT_R * Math.sin(phi) * Math.sin(theta);
    const dot = (x * STAR_CORE.x + y * STAR_CORE.y + z * STAR_CORE.z) / (GLINT_R * coreLen);
    if (dot > CORE_SKIP) continue;

    const k = placed;
    const mat = addGlint(PAL[k % PAL.length]!, opAt(0, k));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `glint-${k}`;
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(SCALE_MIN + hash(i, 31) * span);
    mesh.rotation.set(hash(i, 17) * 2, theta, phi);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = GLINT_ORDER;
    root.add(mesh);
    mats.push(mat);
    placed += 1;
  }

  root.userData.glintCount = placed;
  root.userData.glintWant = want;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    n: placed,
    nFine: GLINT_N,
    nCoarse: GLINT_N_COARSE,
    r: GLINT_R,
    skyR: SKY_R,
    coreSkip: CORE_SKIP,
    scaleMin: SCALE_MIN,
    scaleMax: SCALE_MAX,
    order: GLINT_ORDER,
    opMin: coarse ? OP_MIN : OP_MIN,
    opMax: coarse ? OP_MIN : OP_MAX,
    opBase: coarse ? 0 : OP_BASE,
    opStep: coarse ? 0 : OP_STEP,
    pal: PAL,
    coreX: STAR_CORE.x,
    coreY: STAR_CORE.y,
    coreZ: STAR_CORE.z,
  };

  if (coarse) return { tick() {} };

  return {
    tick(t: number) {
      for (let i = 0; i < mats.length; i++) {
        mats[i]!.opacity = opAt(t, i);
      }
    },
  };
}

export { SIZES as GLINT_SIZES };
