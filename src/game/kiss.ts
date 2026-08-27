/** PARENT KISS — god-ray sheets of leftover First Howl from Star Core toward the city.
 * Charge is seen, not stored. Not corona.ts rays (those sit AT the core, 8×420).
 * Not flare.ts anamorphic streaks. Not Lumen beam.ts. Not aurora.ts sky veils.
 * Parent hooks with:
 *   laterOn(() => { try { kiss = growKiss(group, coarse); } catch { } });
 *   // in world.tick(t): try { kiss?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const LOOK_Y = 190;
const SHEET_N = 3;
const SHEET_N_COARSE = 2;
const SHEET_W = 90;
const SHEET_H = 2100;
const SHEET_HEX = 0xe8c070;
const SHEET_OP = 0.055;
const OP_MIN = 0.035;
const OP_MAX = 0.08;
const WAVE = 0.32;
const ALONG = 0.38;
const STAGGER_Z = 0.55;
const SHEET_ORDER = -2;

const POSE_X = STAR_CORE.x + (0 - STAR_CORE.x) * ALONG;
const POSE_Y = STAR_CORE.y + (LOOK_Y - STAR_CORE.y) * ALONG;
const POSE_Z = STAR_CORE.z + (0 - STAR_CORE.z) * ALONG;

const SIZES = {
  w: SHEET_W,
  h: SHEET_H,
  n: SHEET_N,
  nCoarse: SHEET_N_COARSE,
  hex: SHEET_HEX,
  op: SHEET_OP,
  opMin: OP_MIN,
  opMax: OP_MAX,
  wave: WAVE,
  along: ALONG,
  staggerZ: STAGGER_Z,
  order: SHEET_ORDER,
  lookY: LOOK_Y,
  x: POSE_X,
  y: POSE_Y,
  z: POSE_Z,
  coreX: STAR_CORE.x,
  coreY: STAR_CORE.y,
  coreZ: STAR_CORE.z,
};

function addGold(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: SHEET_HEX,
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

function nSheets(coarse: boolean): number {
  return coarse ? SHEET_N_COARSE : SHEET_N;
}

/**
 * Parent kiss god-ray sheets on the Star Core → city line. 3 PlaneGeometry
 * w=90 h=2100 (coarse 2) MeshBasic additive gold 0xe8c070 opacity 0.055,
 * DoubleSide, depthWrite false, fog false, renderOrder -2. Center at 38% of
 * the way from STAR_CORE to (0, 190, 0). lookAt origin, then rotation.z by
 * i * 0.55. tick: opacity 0.035–0.08 via sin(t*0.32 + i). coarse: still plant,
 * skip tick. Charge is seen, not stored. Not corona, flare, Lumen beam, aurora.
 */
export function growKiss(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "kiss";
  group.add(root);

  const n = nSheets(coarse);

  const pose = new THREE.Group();
  pose.name = "kiss-pose";
  pose.position.set(POSE_X, POSE_Y, POSE_Z);
  pose.lookAt(0, LOOK_Y, 0);
  pose.frustumCulled = false;
  pose.castShadow = false;
  pose.receiveShadow = false;

  const geo = new THREE.PlaneGeometry(SHEET_W, SHEET_H);
  const mats: THREE.MeshBasicMaterial[] = [];

  for (let i = 0; i < n; i++) {
    const mat = addGold(SHEET_OP);
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `kiss-sheet-${i}`;
    mesh.rotation.z = i * STAGGER_Z;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = SHEET_ORDER;
    pose.add(mesh);
  }
  root.add(pose);

  root.userData.sheetCount = n;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    w: SHEET_W,
    h: SHEET_H,
    n,
    nFine: SHEET_N,
    nCoarse: SHEET_N_COARSE,
    hex: SHEET_HEX,
    op: SHEET_OP,
    opMin: coarse ? SHEET_OP : OP_MIN,
    opMax: coarse ? SHEET_OP : OP_MAX,
    wave: coarse ? 0 : WAVE,
    along: ALONG,
    staggerZ: STAGGER_Z,
    order: SHEET_ORDER,
    lookY: LOOK_Y,
    x: POSE_X,
    y: POSE_Y,
    z: POSE_Z,
    coreX: STAR_CORE.x,
    coreY: STAR_CORE.y,
    coreZ: STAR_CORE.z,
  };

  if (coarse) return { tick() {} };

  const span = OP_MAX - OP_MIN;
  return {
    tick(t: number) {
      for (let i = 0; i < mats.length; i++) {
        const u = (Math.sin(t * WAVE + i) + 1) * 0.5;
        mats[i]!.opacity = OP_MIN + u * span;
      }
    },
  };
}

export { SIZES as KISS_SIZES };
