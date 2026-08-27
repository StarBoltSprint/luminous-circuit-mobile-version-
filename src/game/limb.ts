/** Star Core LIMB — the gold ring of the parent, seen from the city.
 * RingGeometry, not a disc, not corona rays, not glow map, not vault dusk.
 * Charge is seen, not stored. Star Core is the parent, not a throne.
 * Parent hooks with:
 *   laterOn(() => { try { limb = growLimb(group, coarse); } catch { } });
 *   // in world.tick(t): try { limb?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const LOOK_Y = 190;
const INNER = 168;
const OUTER = 214;
const INNER_COARSE = 120;
const OUTER_COARSE = 154;
const OP = 0.28;
const OP_MIN = 0.18;
const OP_MAX = 0.4;
const PULSE = 0.62;
const HEX = 0xffe0a0;
const ANSWER_HEX = 0x48c8d8;

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

export const LIMB_SIZES = { inner: INNER, outer: OUTER, op: OP };

/**
 * Gold solar limb at STAR_CORE facing the city. Inner cyan answer-ring.
 * coarse: gold only, skip tick.
 */
export function growLimb(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "limb";
  group.add(root);

  const core = new THREE.Group();
  core.name = "limb-core";
  core.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  core.lookAt(0, LOOK_Y, 0);
  core.frustumCulled = false;

  const inner = coarse ? INNER_COARSE : INNER;
  const outer = coarse ? OUTER_COARSE : OUTER;
  const segs = coarse ? 32 : 48;
  const goldMat = addMat(HEX, OP);
  const gold = new THREE.Mesh(new THREE.RingGeometry(inner, outer, segs), goldMat);
  gold.castShadow = false;
  gold.receiveShadow = false;
  gold.frustumCulled = false;
  gold.renderOrder = -2;
  core.add(gold);

  let answerMat: THREE.MeshBasicMaterial | null = null;
  if (!coarse) {
    answerMat = addMat(ANSWER_HEX, 0.12);
    const answer = new THREE.Mesh(new THREE.RingGeometry(outer * 1.08, outer * 1.22, segs), answerMat);
    answer.castShadow = false;
    answer.receiveShadow = false;
    answer.frustumCulled = false;
    answer.renderOrder = -2;
    core.add(answer);
  }
  root.add(core);

  if (coarse) return { tick() {} };

  const span = OP_MAX - OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * PULSE) + 1) * 0.5;
      goldMat.opacity = OP_MIN + u * span;
      if (answerMat) answerMat.opacity = 0.08 + u * 0.1;
      core.rotation.z = t * 0.03;
    },
  };
}
