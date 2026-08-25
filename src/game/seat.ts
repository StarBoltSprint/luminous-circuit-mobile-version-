/** Aure PARENT-SEAT — low sit at the Star-core Overlook den.
 * Watch the parent. Do not move it. An orbit is not a throne.
 * Not Hub breath basin (fountain.ts). Not Nesh plaza stele (notice.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growSeat(group, coarse); } catch { } });
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
  });
}

function lensGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.16,
    metalness: 0.5,
    emissive: 0xd4a050,
    emissiveIntensity: 0.18,
    iridescence: 0.56,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

/** World from seat-local X/Z after yaw (THREE rotation.y). */
function at(cx: number, cz: number, lx: number, lz: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

const SEAT_W = 4.2;
const SEAT_H = 0.55;
const SEAT_D = 2.2;
const SEAT_Y = 0.55;
const HUB_R = 90;

const POST_H = 1.72;
const POST_R0 = 0.07;
const POST_R1 = 0.05;
const POST_LX = SEAT_W * 0.42;
const POST_LZ = SEAT_D * 0.38;

const LENS_R = 0.28;
const LENS_TUBE = 0.055;

export const SEAT_SIZES = {
  w: SEAT_W,
  h: SEAT_H,
  d: SEAT_D,
  y: SEAT_Y,
  postH: POST_H,
  postR: POST_R0,
  lensR: LENS_R,
  lensTube: LENS_TUBE,
};

const emptySizes = {
  w: SEAT_W,
  h: SEAT_H,
  d: SEAT_D,
  y: 0,
  postH: 0,
  postR: 0,
  lensR: 0,
  lensTube: 0,
  seatCount: 0,
  postCount: 0,
};

/**
 * One Aure parent-seat at DISTRICTS kind==="overlook" x,z. BoxGeometry
 * 4.2×0.55×2.2 at y=0.55, MeshPhysical dark gold. Faces the horizon parent
 * (do not move it). Small torus lens disc on a post at the sit-end.
 * coarse: skip post. Sit. Not Hub basin. Not Nesh stele.
 */
export function growSeat(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "seat";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.seatCount = 0;
  root.userData.postCount = 0;

  const overlook = den("overlook");
  if (!overlook) return;
  if (Math.hypot(overlook.x, overlook.z) < HUB_R) return;

  const cx = overlook.x;
  const cz = overlook.z;
  const yaw = Math.atan2(cx, cz);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(SEAT_W, SEAT_H, SEAT_D), darkGold());
  bench.position.set(cx, SEAT_Y, cz);
  bench.rotation.y = yaw;
  bench.castShadow = false;
  bench.receiveShadow = true;
  bench.frustumCulled = true;
  root.add(bench);

  sizes.y = SEAT_Y;
  sizes.seatCount = 1;
  root.userData.seatCount = 1;

  if (!coarse) {
    const segs = 10;
    const postAt = at(cx, cz, POST_LX, POST_LZ, yaw);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(POST_R1, POST_R0, POST_H, segs),
      lensGold(),
    );
    post.position.set(postAt.x, POST_H * 0.5, postAt.z);
    post.castShadow = false;
    post.receiveShadow = true;
    post.frustumCulled = true;
    root.add(post);

    const lens = new THREE.Mesh(
      new THREE.TorusGeometry(LENS_R, LENS_TUBE, 8, 16),
      lensGold(),
    );
    lens.position.set(postAt.x, POST_H + LENS_R * 0.15, postAt.z);
    lens.rotation.y = yaw;
    lens.castShadow = false;
    lens.receiveShadow = true;
    lens.frustumCulled = true;
    root.add(lens);

    sizes.postH = POST_H;
    sizes.postR = POST_R0;
    sizes.lensR = LENS_R;
    sizes.lensTube = LENS_TUBE;
    sizes.postCount = 1;
    root.userData.postCount = 1;
  }
}
