/** Star Core GLOW MAP — parent-line seen, not stored.
 * Textured additive disc from sky-core-glow.jpg. Not atmos discs, not corona rays,
 * not flare streaks, not vault dusk circles.
 * Parent hooks with:
 *   laterOn(() => { try { glow = growGlow(group, coarse); } catch { } });
 *   // in world.tick(t): try { glow?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const LOOK_Y = 190;
const DISC_R = 1280;
const DISC_R_COARSE = 860;
const BALL_R = 280;
const BALL_R_COARSE = 180;
const DISC_OP = 0.62;
const DISC_OP_MIN = 0.48;
const DISC_OP_MAX = 0.78;
const BALL_OP = 0.38;
const PULSE = 0.48;
const TEX = `${import.meta.env.BASE_URL}luminous-circuit/sky-core-glow.jpg`.replace(/\/{2,}/g, "/");

function loadGlow() {
  const map = new THREE.TextureLoader().load(TEX);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function glowMat(map: THREE.Texture, opacity: number) {
  return new THREE.MeshBasicMaterial({
    map,
    color: 0xfff0c8,
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

export const GLOW_SIZES = {
  discR: DISC_R,
  discRCoarse: DISC_R_COARSE,
  ballR: BALL_R,
  ballOp: BALL_OP,
  discOp: DISC_OP,
};

/**
 * Gold radial glow at STAR_CORE. Charge is seen, not stored.
 * CircleGeometry disc + SphereGeometry volume, both mapped with sky-core-glow.
 * coarse: smaller, skip tick.
 */
export function growGlow(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "glow";
  group.add(root);

  const map = loadGlow();
  const core = new THREE.Group();
  core.name = "glow-core";
  core.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  core.lookAt(0, LOOK_Y, 0);
  core.frustumCulled = false;

  const discR = coarse ? DISC_R_COARSE : DISC_R;
  const discMat = glowMat(map, DISC_OP);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(discR, coarse ? 24 : 40), discMat);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = false;
  disc.renderOrder = -3;
  core.add(disc);

  const ballR = coarse ? BALL_R_COARSE : BALL_R;
  const ballMat = glowMat(map, BALL_OP);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(ballR, coarse ? 10 : 16, coarse ? 8 : 12), ballMat);
  ball.castShadow = false;
  ball.receiveShadow = false;
  ball.frustumCulled = false;
  ball.renderOrder = -3;
  core.add(ball);
  root.add(core);

  if (coarse) return { tick() {} };

  const span = DISC_OP_MAX - DISC_OP_MIN;
  return {
    tick(t: number) {
      const u = (Math.sin(t * PULSE) + 1) * 0.5;
      discMat.opacity = DISC_OP_MIN + u * span;
      ballMat.opacity = BALL_OP * (0.78 + u * 0.36);
      ball.rotation.y = t * 0.07;
    },
  };
}
