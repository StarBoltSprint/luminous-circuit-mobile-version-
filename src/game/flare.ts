/** Star Core ANAMORPHIC FLARE — parent-line seen, not stored.
 * Not corona.ts plane rays (those are 8×420). Not vault dusk discs. Not Lumen beam.
 * Parent hooks with:
 *   laterOn(() => { try { flare = growFlare(group, coarse); } catch { } });
 *   // in world.tick(t): try { flare?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

/** atmos lookAt uses CORE_Y * 0.35 = 189; task pins 190. */
const LOOK_Y = 190;

const GOLD_W = 980;
const GOLD_H = 14;
const GOLD_HEX = 0xffe0a0;
const GOLD_OP = 0.11;
const GOLD_OP_MIN = 0.08;
const GOLD_OP_MAX = 0.16;
const GOLD_PULSE = 0.55;

const CYAN_W = 14;
const CYAN_H = 620;
const CYAN_HEX = 0x48c8d8;
const CYAN_OP = 0.07;
const CYAN_OP_MIN = 0.04;
const CYAN_OP_MAX = 0.1;
const CYAN_PULSE = 0.41;
const CYAN_PHASE = 1;

const FLARE_ORDER = -4;

const SIZES = {
  x: STAR_CORE.x,
  y: STAR_CORE.y,
  z: STAR_CORE.z,
  lookY: LOOK_Y,
  goldW: GOLD_W,
  goldH: GOLD_H,
  goldHex: GOLD_HEX,
  goldOp: GOLD_OP,
  goldOpMin: GOLD_OP_MIN,
  goldOpMax: GOLD_OP_MAX,
  goldPulse: GOLD_PULSE,
  cyanW: CYAN_W,
  cyanH: CYAN_H,
  cyanHex: CYAN_HEX,
  cyanOp: CYAN_OP,
  cyanOpMin: CYAN_OP_MIN,
  cyanOpMax: CYAN_OP_MAX,
  cyanPulse: CYAN_PULSE,
  cyanPhase: CYAN_PHASE,
  order: FLARE_ORDER,
};

function addMat(hex: number, opacity: number) {
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
 * Star Core anamorphic flare at STAR_CORE (-4050, 540, 195). Group lookAt(0, 190, 0).
 * One PlaneGeometry 980×14 MeshBasic additive gold 0xffe0a0 opacity 0.11,
 * renderOrder -4 — horizontal streak. One PlaneGeometry 14×620 MeshBasic additive
 * cyan 0x48c8d8 opacity 0.07, renderOrder -4 — vertical answer. coarse: gold streak
 * only, skip cyan. tick: gold opacity 0.08–0.16 via sin(t*0.55); cyan 0.04–0.10 via
 * sin(t*0.41+1). coarse: skip tick. Parent-line seen, not stored. Not corona rays,
 * not vault dusk discs, not Lumen beam.
 */
export function growFlare(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "flare";
  group.add(root);

  const core = new THREE.Group();
  core.name = "flare-core";
  core.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  core.lookAt(0, LOOK_Y, 0);
  core.frustumCulled = false;
  core.castShadow = false;
  core.receiveShadow = false;

  const goldMat = addMat(GOLD_HEX, GOLD_OP);
  const gold = new THREE.Mesh(new THREE.PlaneGeometry(GOLD_W, GOLD_H), goldMat);
  gold.name = "flare-gold";
  gold.castShadow = false;
  gold.receiveShadow = false;
  gold.frustumCulled = false;
  gold.renderOrder = FLARE_ORDER;
  core.add(gold);

  let cyanMat: THREE.MeshBasicMaterial | null = null;
  if (!coarse) {
    cyanMat = addMat(CYAN_HEX, CYAN_OP);
    const cyan = new THREE.Mesh(new THREE.PlaneGeometry(CYAN_W, CYAN_H), cyanMat);
    cyan.name = "flare-cyan";
    cyan.castShadow = false;
    cyan.receiveShadow = false;
    cyan.frustumCulled = false;
    cyan.renderOrder = FLARE_ORDER;
    core.add(cyan);
  }

  root.add(core);

  root.userData.goldCount = 1;
  root.userData.cyanCount = coarse ? 0 : 1;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    x: STAR_CORE.x,
    y: STAR_CORE.y,
    z: STAR_CORE.z,
    lookY: LOOK_Y,
    goldW: GOLD_W,
    goldH: GOLD_H,
    goldHex: GOLD_HEX,
    goldOp: GOLD_OP,
    goldOpMin: coarse ? GOLD_OP : GOLD_OP_MIN,
    goldOpMax: coarse ? GOLD_OP : GOLD_OP_MAX,
    goldPulse: coarse ? 0 : GOLD_PULSE,
    cyanW: coarse ? 0 : CYAN_W,
    cyanH: coarse ? 0 : CYAN_H,
    cyanHex: CYAN_HEX,
    cyanOp: CYAN_OP,
    cyanOpMin: coarse ? 0 : CYAN_OP_MIN,
    cyanOpMax: coarse ? 0 : CYAN_OP_MAX,
    cyanPulse: coarse ? 0 : CYAN_PULSE,
    cyanPhase: CYAN_PHASE,
    order: FLARE_ORDER,
  };

  if (coarse) return { tick() {} };

  const goldSpan = GOLD_OP_MAX - GOLD_OP_MIN;
  const cyanSpan = CYAN_OP_MAX - CYAN_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * GOLD_PULSE) + 1) * 0.5;
      goldMat.opacity = GOLD_OP_MIN + u * goldSpan;
      if (cyanMat) {
        const v = (Math.sin(t * CYAN_PULSE + CYAN_PHASE) + 1) * 0.5;
        cyanMat.opacity = CYAN_OP_MIN + v * cyanSpan;
      }
    },
  };
}

export { SIZES as FLARE_SIZES };
