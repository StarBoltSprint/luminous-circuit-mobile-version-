/** Nesh WATCH PLINTH at plaza/watch den — low gold stand Nesh stands on to notice.
 * One Cylinder r=0.9 h=0.28 MeshPhysical dark gold y=0.14 plus one thin stele
 * Box 0.22×1.6×0.12 on it. Not notice.ts stele. Not prism.ts. Not hail bowl.
 * Not parent-seat. One watch.
 * Parent hooks with:
 *   laterOn(() => { try { growWatch(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { CITIZENS, HUB } from "./lore";

function neshAim() {
  const nesh = CITIZENS.find((c) => c.id === "nesh");
  const nx = nesh?.x ?? -24;
  const nz = nesh?.z ?? 128;
  const len = Math.hypot(nx, nz) || 1;
  return { nx: nx / len, nz: nz / len };
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
  });
}

function watchGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0xd4a050,
    emissiveIntensity: 0.16,
    iridescence: 0.48,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.46,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

/** Low stand Nesh stands on. Cylinder r=0.9 h=0.28, center y=0.14 sits on plaza. */
const PLINTH_R = 0.9;
const PLINTH_H = 0.28;
const PLINTH_Y = 0.14;
/** Thin notice-marker on the plinth — not notice.ts 1.2×8×0.4, not prism cone. */
const STELE_W = 0.22;
const STELE_H = 1.6;
const STELE_D = 0.12;
/** Stele center: plinth top 0.28 + half height 0.8. */
const STELE_Y = PLINTH_H + STELE_H * 0.5;
/**
 * Plaza/watch den toward Nesh. Outside notice.ts R=88 (stele w=1.2) and
 * prism/lens APRON_R=82 (torus r=4.2 → outer ~86.2). Inside Nesh at ~130.
 * Not hail bowl (beacon). Not parent-seat (overlook).
 */
const APRON_R = Math.min(116, Math.max(104, HUB.radius + 58));

export const WATCH_SIZES = {
  r: PLINTH_R,
  h: PLINTH_H,
  y: PLINTH_Y,
  steleW: STELE_W,
  steleH: STELE_H,
  steleD: STELE_D,
  steleY: STELE_Y,
  apronR: APRON_R,
};

const emptySizes = {
  r: PLINTH_R,
  h: PLINTH_H,
  y: 0,
  steleW: 0,
  steleH: 0,
  steleD: 0,
  steleY: 0,
  apronR: APRON_R,
  x: 0,
  z: 0,
  yaw: 0,
  segs: 0,
  watchCount: 0,
  plinthCount: 0,
  steleCount: 0,
};

/**
 * One Nesh watch-plinth at the Hub plaza/watch den toward Nesh. CylinderGeometry
 * r=0.9 h=0.28 MeshPhysical dark gold at y=0.14. Thin BoxGeometry 0.22×1.6×0.12
 * on it (Nesh stands here to notice). coarse: skip stele, keep plinth. One watch.
 * Not notice.ts stele. Not prism.ts. Not hail bowl. Not parent-seat.
 */
export function growWatch(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "watch";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.watchCount = 0;
  root.userData.plinthCount = 0;
  root.userData.steleCount = 0;

  const aim = neshAim();
  const x = aim.nx * APRON_R;
  const z = aim.nz * APRON_R;
  const yaw = Math.atan2(x, z);
  const segs = coarse ? 8 : 16;

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(PLINTH_R, PLINTH_R, PLINTH_H, segs),
    darkGold(),
  );
  plinth.position.set(x, PLINTH_Y, z);
  plinth.castShadow = false;
  plinth.receiveShadow = true;
  plinth.frustumCulled = true;
  plinth.renderOrder = 2;
  root.add(plinth);

  sizes.y = PLINTH_Y;
  sizes.x = x;
  sizes.z = z;
  sizes.yaw = yaw;
  sizes.segs = segs;
  sizes.watchCount = 1;
  sizes.plinthCount = 1;
  root.userData.watchCount = 1;
  root.userData.plinthCount = 1;

  if (coarse) return;

  const stele = new THREE.Mesh(new THREE.BoxGeometry(STELE_W, STELE_H, STELE_D), watchGold());
  stele.position.set(x, STELE_Y, z);
  stele.rotation.y = yaw;
  stele.castShadow = false;
  stele.receiveShadow = true;
  stele.frustumCulled = true;
  stele.renderOrder = 2;
  root.add(stele);

  sizes.steleW = STELE_W;
  sizes.steleH = STELE_H;
  sizes.steleD = STELE_D;
  sizes.steleY = STELE_Y;
  sizes.steleCount = 1;
  root.userData.steleCount = 1;
}
