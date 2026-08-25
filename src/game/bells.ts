/** Veyra HUB BREATH BELL — one gold lathe bell hanging from a thin post on the Core Spire plaza.
 * Not the Hub breath basin (fountain.ts at 0,0). Not the Hub font (font.ts).
 * Not civic banners (banners.ts).
 * Parent hooks with:
 *   laterOn(() => { try { bells = growBells(group, coarse); } catch { } });
 *   // in world.tick(t): try { bells?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { CITIZENS } from "./lore";

function veyraAim() {
  const veyra = CITIZENS.find((c) => c.id === "veyra");
  const vx = veyra?.x ?? 30;
  const vz = veyra?.z ?? -40;
  const len = Math.hypot(vx, vz) || 1;
  return { vx: vx / len, vz: vz / len };
}

function darkPost() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a140c,
    roughness: 0.42,
    metalness: 0.34,
    emissive: 0x3a2c16,
    emissiveIntensity: 0.08,
    iridescence: 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    transparent: false,
  });
}

function goldBell() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.18,
    metalness: 0.52,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.18,
    iridescence: 0.48,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.46,
    clearcoatRoughness: 0.22,
    transparent: false,
    side: THREE.DoubleSide,
  });
}

/** Lathe bell — mouth at y=0, crown at y=h. Hang offsets by -h. */
const BELL_R = 0.55;
const BELL_H = 1.8;
const POST_H = 4.4;
const POST_R = 0.08;
const ARM_L = 0.78;
const ARM_T = 0.07;
const ARM_D = 0.1;
/** Hang pivot sits just under the arm. */
const HANG_Y = POST_H - ARM_T;
/** plazaHeart top in world.ts is 3.4 + 1.2/2 = 4.0. Post sits on plaza stone. */
const HEART_TOP = 4.0;
/**
 * Outside Hub breath basin (rim r=6 tube=0.45 → outer 6.45) and mosaic
 * tiles (ring r=14, tile half 1.2 → outer 15.2). Inside plazaHeart top r=46.
 * Bearing is +90° from Veyra so it misses the Hub font (apron 9.6 toward Veyra).
 */
const APRON_R = 16.8;
const SWAY = 0.03;
const SWAY_SPEED = 0.86;

const SIZES = {
  r: BELL_R,
  h: BELL_H,
  postH: POST_H,
  postR: POST_R,
  armL: ARM_L,
  armT: ARM_T,
  hangY: HANG_Y,
  y: HEART_TOP,
  apronR: APRON_R,
  sway: SWAY,
  swaySpeed: SWAY_SPEED,
};

function bellPts(r: number, h: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.05, h),
    new THREE.Vector2(r * 0.16, h * 0.97),
    new THREE.Vector2(r * 0.38, h * 0.82),
    new THREE.Vector2(r * 0.58, h * 0.58),
    new THREE.Vector2(r * 0.78, h * 0.32),
    new THREE.Vector2(r * 0.94, h * 0.1),
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.86, 0.03),
    new THREE.Vector2(r * 0.62, h * 0.28),
    new THREE.Vector2(r * 0.34, h * 0.58),
    new THREE.Vector2(r * 0.14, h * 0.88),
    new THREE.Vector2(0.04, h * 0.96),
  ];
}

/**
 * One Veyra Hub-breath bell on the plazaHeart, +90° from Veyra, offset from
 * the fountain basin at 0,0 and Hub font at apron 9.6. LatheGeometry bell
 * h=1.8 r=0.55 MeshPhysical gold hanging from a thin CylinderGeometry post.
 * tick: hang rotation.z sway ±0.03. coarse: skip sway, still one bell.
 */
export function growBells(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "bells";
  group.add(root);

  const aim = veyraAim();
  const x = -aim.vz * APRON_R;
  const z = aim.vx * APRON_R;
  const yaw = Math.atan2(x, z);
  const segs = coarse ? 8 : 16;

  const sizes = {
    r: SIZES.r,
    h: SIZES.h,
    postH: SIZES.postH,
    postR: SIZES.postR,
    armL: SIZES.armL,
    armT: SIZES.armT,
    hangY: SIZES.hangY,
    y: SIZES.y,
    apronR: SIZES.apronR,
    sway: coarse ? 0 : SIZES.sway,
    swaySpeed: coarse ? 0 : SIZES.swaySpeed,
    x,
    z,
    yaw,
    segs,
    bellCount: 1,
    postCount: 1,
  };
  root.userData.sizes = sizes;
  root.userData.bellCount = 1;
  root.userData.postCount = 1;
  root.userData.breathing = !coarse;

  const rig = new THREE.Group();
  rig.position.set(x, HEART_TOP, z);
  rig.rotation.y = yaw;
  root.add(rig);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(POST_R, POST_R, POST_H, segs),
    darkPost(),
  );
  post.position.set(0, POST_H * 0.5, 0);
  post.castShadow = false;
  post.receiveShadow = true;
  post.frustumCulled = true;
  post.renderOrder = 2;
  rig.add(post);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(ARM_L, ARM_T, ARM_D), darkPost());
  arm.position.set(ARM_L * 0.5, POST_H - ARM_T * 0.5, 0);
  arm.castShadow = false;
  arm.receiveShadow = true;
  arm.frustumCulled = true;
  arm.renderOrder = 2;
  rig.add(arm);

  const hang = new THREE.Group();
  hang.position.set(ARM_L, HANG_Y, 0);
  rig.add(hang);

  const bell = new THREE.Mesh(
    new THREE.LatheGeometry(bellPts(BELL_R, BELL_H), segs),
    goldBell(),
  );
  bell.position.set(0, -BELL_H, 0);
  bell.castShadow = false;
  bell.receiveShadow = true;
  bell.frustumCulled = true;
  bell.renderOrder = 2;
  hang.add(bell);

  if (coarse) return { tick() {} };

  return {
    tick(t: number) {
      hang.rotation.z = Math.sin(t * SWAY_SPEED) * SWAY;
    },
  };
}

export { SIZES as BELL_SIZES };
