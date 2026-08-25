/** Veyra HUB BREATH basin — gold torus rim on the Core Spire floor at 0,0.
 * Not cistern wells (canal/foundry charge). Not canal water (Seln's sheets).
 * Parent hooks with:
 *   laterOn(() => { try { fountain = growFountain(group, coarse); } catch { } });
 *   // in world.tick(t): try { fountain?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";

const RIM_R = 6;
const TUBE = 0.45;
/** Torus center sits one tube-radius up so the rim rests on plaza stone. */
const RIM_Y = TUBE;
/** Inner breath disc — below the rim center, inside the basin bowl. */
const DISC_Y = 0.35;
const DISC_R = RIM_R - TUBE - 0.15;
const DISC_OP = 0.28;
const DISC_OP_MIN = 0.2;
const DISC_OP_MAX = 0.36;
/** Slow Hub inhale — not inner-core spin, not canal bob. */
const BREATH = 0.68;

const SIZES = {
  x: 0,
  y: RIM_Y,
  z: 0,
  rimR: RIM_R,
  tube: TUBE,
  rimY: RIM_Y,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  discOpMin: DISC_OP_MIN,
  discOpMax: DISC_OP_MAX,
  breath: BREATH,
};

function goldRim() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.22,
    metalness: 0.48,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.16,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

function breathDisc(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * One Hub breath basin at the Core Spire origin. TorusGeometry r=6 tube=0.45
 * MeshPhysical gold rim. Inner cyan CircleGeometry at y=0.35 opacity 0.28.
 * tick: disc opacity 0.2–0.36 (Veyra breath). coarse: skip pulse, static disc.
 */
export function growFountain(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "fountain";
  group.add(root);

  const segs = coarse ? 12 : 22;
  const tubeSeg = coarse ? 5 : 8;

  const rimGeo = new THREE.TorusGeometry(RIM_R, TUBE, tubeSeg, segs);
  const rim = new THREE.Mesh(rimGeo, goldRim());
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, RIM_Y, 0);
  rim.castShadow = false;
  rim.receiveShadow = true;
  rim.frustumCulled = true;
  rim.renderOrder = 2;
  root.add(rim);

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = breathDisc(DISC_OP);
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.set(0, DISC_Y, 0);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  root.add(disc);

  const span = DISC_OP_MAX - DISC_OP_MIN;
  root.userData.basinCount = 1;
  root.userData.rimCount = 1;
  root.userData.discCount = 1;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    x: SIZES.x,
    y: SIZES.y,
    z: SIZES.z,
    rimR: SIZES.rimR,
    tube: SIZES.tube,
    rimY: SIZES.rimY,
    discR: SIZES.discR,
    discY: SIZES.discY,
    discOp: SIZES.discOp,
    discOpMin: coarse ? SIZES.discOp : SIZES.discOpMin,
    discOpMax: coarse ? SIZES.discOp : SIZES.discOpMax,
    breath: coarse ? 0 : SIZES.breath,
    segs,
    tubeSeg,
  };

  if (coarse) return { tick() {} };

  return {
    tick(t: number) {
      const u = (Math.sin(t * BREATH) + 1) * 0.5;
      discMat.opacity = DISC_OP_MIN + u * span;
    },
  };
}

export { SIZES as FOUNTAIN_SIZES };
