/** SKY AURORA VEILS toward the parent Star Core — leftover First Howl written on the vault.
 * Not atmos.ts sky sphere. Not vault.ts dusk discs. Not corona.ts rays. Not Lumen beam.
 * Parent hooks with:
 *   laterOn(() => { try { aurora = growAurora(group, coarse); } catch { } });
 *   // in world.tick(t): try { aurora?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const VEIL_W = 2200;
const VEIL_H = 780;
const VEIL_N = 4;
const VEIL_N_COARSE = 2;
const VEIL_Y = 480;
const VEIL_ALONG = 0.62;
const VEIL_ORDER = -16;
const STAGGER_Z = 0.18;
const FAN_X = 320;
const FAN_Z = 52;

const CYAN_HEX = 0x3aa8c0;
const VIOLET_HEX = 0x6a48a8;
const CYAN_OP = 0.045;
const VIOLET_OP = 0.038;
const OP_MIN = 0.022;
const OP_MAX = 0.058;
const WAVE = 0.35;

const SIZES = {
  w: VEIL_W,
  h: VEIL_H,
  n: VEIL_N,
  nCoarse: VEIL_N_COARSE,
  y: VEIL_Y,
  along: VEIL_ALONG,
  order: VEIL_ORDER,
  staggerZ: STAGGER_Z,
  fanX: FAN_X,
  fanZ: FAN_Z,
  cyanHex: CYAN_HEX,
  violetHex: VIOLET_HEX,
  cyanOp: CYAN_OP,
  violetOp: VIOLET_OP,
  opMin: OP_MIN,
  opMax: OP_MAX,
  wave: WAVE,
  x: STAR_CORE.x * VEIL_ALONG,
  z: STAR_CORE.z * VEIL_ALONG,
  coreX: STAR_CORE.x,
  coreY: STAR_CORE.y,
  coreZ: STAR_CORE.z,
};

function addVeil(hex: number, opacity: number) {
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

function nVeils(coarse: boolean): number {
  return coarse ? VEIL_N_COARSE : VEIL_N;
}

/**
 * Sky aurora veils on the city→Star Core line. 4 PlaneGeometry w=2200 h=780
 * (coarse 2) MeshBasic additive, DoubleSide, depthWrite false, fog false,
 * renderOrder -16. Planted at 62% of STAR_CORE, y≈480, facing the city.
 * Cyan 0x3aa8c0 op 0.045 / violet 0x6a48a8 op 0.038, Z-stagger ±0.18.
 * tick: opacity 0.022–0.058 via sin(t*0.35 + i). coarse: still plant, skip tick.
 * Leftover First Howl on the vault — not atmos sky, dusk discs, corona, or beam.
 */
export function growAurora(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "aurora";
  group.add(root);

  const n = nVeils(coarse);
  const ax = STAR_CORE.x * VEIL_ALONG;
  const az = STAR_CORE.z * VEIL_ALONG;
  const mid = (n - 1) * 0.5;

  const pose = new THREE.Group();
  pose.name = "aurora-fan";
  pose.position.set(ax, VEIL_Y, az);
  pose.lookAt(0, VEIL_Y, 0);
  pose.frustumCulled = false;
  pose.castShadow = false;
  pose.receiveShadow = false;

  const geo = new THREE.PlaneGeometry(VEIL_W, VEIL_H);
  const mats: THREE.MeshBasicMaterial[] = [];

  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i - mid) / mid;
    const cyan = i % 2 === 0;
    const mat = addVeil(cyan ? CYAN_HEX : VIOLET_HEX, cyan ? CYAN_OP : VIOLET_OP);
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `aurora-veil-${i}`;
    mesh.position.set(u * FAN_X, 0, (i - mid) * FAN_Z);
    mesh.rotation.z = u * STAGGER_Z;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = VEIL_ORDER;
    pose.add(mesh);
  }
  root.add(pose);

  root.userData.veilCount = n;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    w: VEIL_W,
    h: VEIL_H,
    n,
    nFine: VEIL_N,
    nCoarse: VEIL_N_COARSE,
    y: VEIL_Y,
    along: VEIL_ALONG,
    order: VEIL_ORDER,
    staggerZ: STAGGER_Z,
    fanX: FAN_X,
    fanZ: FAN_Z,
    cyanHex: CYAN_HEX,
    violetHex: VIOLET_HEX,
    cyanOp: CYAN_OP,
    violetOp: VIOLET_OP,
    opMin: coarse ? CYAN_OP : OP_MIN,
    opMax: coarse ? VIOLET_OP : OP_MAX,
    wave: coarse ? 0 : WAVE,
    x: ax,
    z: az,
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

export { SIZES as AURORA_SIZES };
