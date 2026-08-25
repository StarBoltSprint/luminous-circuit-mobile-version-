/** Seln CANAL SLUICE at canal den — Charge is gated here, not locked.
 * Two thin cyan posts + one horizontal bar. Not cascade (cascade.ts).
 * Not weir (weir.ts). Not canal rails (rails.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growSluice(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function cyanCrystal() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x163844,
    roughness: 0.16,
    metalness: 0.44,
    emissive: 0x2ee6ff,
    emissiveIntensity: 0.22,
    iridescence: 0.52,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

/** Thin sluice posts. Height 2.8, radius 0.1 — not rail boxes, not cascade sheets. */
const POST_H = 2.8;
const POST_R = 0.1;
const POST_Y = POST_H * 0.5;
/** Horizontal gate-bar. Charge is gated here, never locked. */
const BAR_W = 3.2;
const BAR_H = 0.12;
const BAR_D = 0.18;
const BAR_Y = 1.6;
/** Post centers so the bar covers both caps. Current still walks through. */
const POST_X = BAR_W * 0.5 - POST_R;
const SPAN = POST_X * 2;
const OPEN = SPAN - POST_R * 2;
const HUB_R = 90;
const N_POSTS = 2;

export const SLUICE_SIZES = {
  postH: POST_H,
  postR: POST_R,
  postY: POST_Y,
  barW: BAR_W,
  barH: BAR_H,
  barD: BAR_D,
  barY: BAR_Y,
  span: SPAN,
  open: OPEN,
  nPosts: N_POSTS,
};

const emptySizes = {
  postH: POST_H,
  postR: POST_R,
  postY: 0,
  barW: BAR_W,
  barH: BAR_H,
  barD: BAR_D,
  barY: 0,
  span: SPAN,
  open: OPEN,
  nPosts: 0,
  postCount: 0,
  barCount: 0,
  x: 0,
  z: 0,
  yaw: 0,
  segs: 0,
};

/**
 * One Seln canal-sluice at DISTRICTS kind==="canal" x,z. Two CylinderGeometry
 * posts h=2.8 r=0.1 plus one BoxGeometry 3.2×0.12×0.18 bar at y=1.6.
 * MeshPhysical cyan. Faces Join so Charge is gated, not locked. Hub skip (r<90).
 * coarse: skip bar, keep posts. Not cascade. Not weir. Not canal rails.
 */
export function growSluice(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "sluice";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.postCount = 0;
  root.userData.barCount = 0;
  root.userData.sluiceCount = 0;

  const canal = den("canal");
  if (!canal) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R) return;

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const yaw = Math.atan2(dx, dz);
  const cx = Math.cos(yaw);
  const sz = Math.sin(yaw);
  const segs = coarse ? 6 : 8;
  const mat = cyanCrystal();
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";

  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, POST_H, segs);
  const posts = new THREE.InstancedMesh(postGeo, mat, N_POSTS);
  posts.castShadow = false;
  posts.receiveShadow = true;
  posts.frustumCulled = true;
  posts.renderOrder = 2;

  for (let i = 0; i < N_POSTS; i++) {
    const side = i === 0 ? -1 : 1;
    dummy.position.set(canal.x + side * POST_X * cx, POST_Y, canal.z - side * POST_X * sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  sizes.postY = POST_Y;
  sizes.nPosts = N_POSTS;
  sizes.postCount = N_POSTS;
  sizes.x = canal.x;
  sizes.z = canal.z;
  sizes.yaw = yaw;
  sizes.segs = segs;
  root.userData.postCount = N_POSTS;
  root.userData.sluiceCount = 1;

  if (coarse) return;

  const bar = new THREE.Mesh(new THREE.BoxGeometry(BAR_W, BAR_H, BAR_D), mat);
  bar.position.set(canal.x, BAR_Y, canal.z);
  bar.rotation.y = yaw;
  bar.castShadow = false;
  bar.receiveShadow = true;
  bar.frustumCulled = true;
  bar.renderOrder = 2;
  root.add(bar);

  sizes.barY = BAR_Y;
  sizes.barCount = 1;
  root.userData.barCount = 1;
}
