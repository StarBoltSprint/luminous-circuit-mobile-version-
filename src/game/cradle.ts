/** Seln HOWL CRADLE at the canal den — leftover First Howl rests, not a dam.
 * Lathe bowl r=3.4 MeshPhysical dark gold. Inner cyan disc y=0.5 opacity 0.2.
 * Offset from Howl-fall (cascade.ts) and charge wells (cisterns.ts). One cradle.
 * Parent hooks with:
 *   laterOn(() => { try { growCradle(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
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

function howlDisc(opacity: number) {
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

/** Outer radius of the lathe bowl — a rest, not a cistern well. */
const BOWL_R = 3.4;
const BOWL_H = 1.12;
const WALL = 0.22;
const DISC_R = 2.6;
const DISC_Y = 0.5;
const DISC_OP = 0.2;
/** Up-canal of Howl-fall (along 0–6) and the charge well (along ~48). */
const ALONG = -16;
/** Off the current — clears cascade width 6 and cistern rim 9.6. */
const SIDE = 20;
const HUB_R = 90;

const SIZES = {
  r: BOWL_R,
  h: BOWL_H,
  wall: WALL,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  along: ALONG,
  side: SIDE,
};

function bowlPts(r: number, h: number, wall: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(r * 0.48, 0.05),
    new THREE.Vector2(r * 0.86, h * 0.38),
    new THREE.Vector2(r, h),
    new THREE.Vector2(r - wall, h),
    new THREE.Vector2(r * 0.72, h * 0.4),
    new THREE.Vector2(r * 0.32, wall),
    new THREE.Vector2(0.06, wall * 0.65),
  ];
}

const emptySizes = {
  r: BOWL_R,
  h: BOWL_H,
  wall: WALL,
  discR: 0,
  discY: 0,
  discOp: 0,
  along: ALONG,
  side: SIDE,
  x: 0,
  y: 0,
  z: 0,
  bowlCount: 0,
  discCount: 0,
  segs: 0,
};

/**
 * One Seln Howl-cradle at DISTRICTS kind==="canal" x,z. LatheGeometry bowl
 * r=3.4 MeshPhysical dark gold. Inner CircleGeometry r=2.6 at y=0.5 opacity
 * 0.2. Offset from cascade and cistern so leftover First Howl can rest, not
 * dam. coarse: bowl only, skip disc. One cradle.
 */
export function growCradle(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "cradle";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.bowlCount = 0;
  root.userData.discCount = 0;
  root.userData.cradleCount = 0;

  const canal = den("canal");
  if (!canal) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R) return;

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const s1 = Math.hypot(canal.x + px * SIDE, canal.z + pz * SIDE);
  const s2 = Math.hypot(canal.x - px * SIDE, canal.z - pz * SIDE);
  const side = s1 >= s2 ? 1 : -1;
  const x = canal.x + ux * ALONG + px * SIDE * side;
  const z = canal.z + uz * ALONG + pz * SIDE * side;
  if (Math.hypot(x, z) < HUB_R) return;

  const segs = coarse ? 10 : 20;
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlPts(BOWL_R, BOWL_H, WALL), segs),
    darkGold(),
  );
  bowl.position.set(x, 0, z);
  bowl.castShadow = false;
  bowl.receiveShadow = true;
  bowl.frustumCulled = true;
  bowl.renderOrder = 2;
  root.add(bowl);

  sizes.x = x;
  sizes.y = 0;
  sizes.z = z;
  sizes.bowlCount = 1;
  sizes.segs = segs;
  root.userData.bowlCount = 1;
  root.userData.cradleCount = 1;

  if (coarse) return;

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, howlDisc(DISC_OP));
  disc.position.set(x, DISC_Y, z);
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

export { SIZES as CRADLE_SIZES };
