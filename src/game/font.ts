/** Veyra HUB FONT — small listening bowl on the Core Spire plaza.
 * Lathe bowl r=1.6 MeshPhysical dark gold. Inner breath disc you can see.
 * Offset from the Hub breath basin (fountain.ts at 0,0) and mosaic tiles
 * (mosaic.ts ring r=14). Not a hail bowl. Not a Howl cradle.
 * Parent hooks with:
 *   laterOn(() => { try { growFont(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
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

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0x5a4020,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
    side: THREE.DoubleSide,
  });
}

function breathDisc(opacity: number) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3aa8c0,
    roughness: 0.18,
    metalness: 0.2,
    emissive: 0x1a6578,
    emissiveIntensity: 0.22,
    iridescence: 0.5,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.46,
    clearcoatRoughness: 0.24,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Outer radius of the lathe bowl — a listen, not a hail, not a cradle. */
const BOWL_R = 1.6;
const BOWL_H = 0.68;
const WALL = 0.14;
const DISC_R = 1.04;
const DISC_Y = 0.28;
const DISC_OP = 0.34;
/** plazaHeart top in world.ts is 3.4 + 1.2/2 = 4.0. Bowl sits on plaza stone. */
const HEART_TOP = 4.0;
const BOWL_Y = HEART_TOP;
/**
 * Between Hub breath basin (rim r=6 tube=0.45 → outer 6.45) and mosaic
 * tiles (ring r=14, tile half 1.2 → inner 12.8). Bowl outer 1.6 clears both.
 */
const APRON_R = 9.6;

const SIZES = {
  r: BOWL_R,
  h: BOWL_H,
  wall: WALL,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  y: BOWL_Y,
  apronR: APRON_R,
};

function bowlPts(r: number, h: number, wall: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.04, 0),
    new THREE.Vector2(r * 0.58, 0.02),
    new THREE.Vector2(r * 0.9, h * 0.26),
    new THREE.Vector2(r, h),
    new THREE.Vector2(r - wall * 0.55, h * 0.96),
    new THREE.Vector2(r * 0.78, h * 0.3),
    new THREE.Vector2(r * 0.4, wall * 0.72),
    new THREE.Vector2(0.04, wall * 0.48),
  ];
}

/**
 * One Veyra Hub-font on the plazaHeart, toward Veyra, offset from the
 * fountain basin at 0,0 and mosaic ring at r=14. LatheGeometry bowl r=1.6
 * MeshPhysical dark gold. Inner CircleGeometry r=1.04 at y=0.28 above the
 * bowl, MeshPhysical cyan breath opacity 0.34. coarse: bowl only, skip disc.
 * One font. Breath you can see. No tick.
 */
export function growFont(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "font";
  group.add(root);

  const aim = veyraAim();
  const x = aim.vx * APRON_R;
  const z = aim.vz * APRON_R;
  const segs = coarse ? 8 : 16;

  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlPts(BOWL_R, BOWL_H, WALL), segs),
    darkGold(),
  );
  bowl.position.set(x, BOWL_Y, z);
  bowl.castShadow = false;
  bowl.receiveShadow = true;
  bowl.frustumCulled = true;
  bowl.renderOrder = 2;
  root.add(bowl);

  const sizes = {
    r: BOWL_R,
    h: BOWL_H,
    wall: WALL,
    discR: 0,
    discY: 0,
    discOp: 0,
    y: BOWL_Y,
    apronR: APRON_R,
    x,
    z,
    bowlCount: 1,
    discCount: 0,
    segs,
  };
  root.userData.sizes = sizes;
  root.userData.bowlCount = 1;
  root.userData.discCount = 0;
  root.userData.fontCount = 1;

  if (coarse) return;

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, breathDisc(DISC_OP));
  disc.position.set(x, BOWL_Y + DISC_Y, z);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  root.add(disc);

  sizes.discR = DISC_R;
  sizes.discY = DISC_Y;
  sizes.discOp = DISC_OP;
  sizes.discCount = 1;
  root.userData.discCount = 1;
}

export { SIZES as FONT_SIZES };
