/** Rhoa HOWL DAIS — the gather stands on a raised ring-step, not a stage.
 * Not Howl pads on the floor (pads.ts). Not chorus stones (chorus.ts).
 * Not Aure parent-seat (seat.ts). Not Howl cradle (cradle.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growDais(group, coarse); } catch { } });
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

function howlInner(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Raised ring-step. Radius of a gather stand, height of a street memory — not a stage. */
const DAIS_R = 4.8;
const DAIS_H = 0.38;
/** Cylinder center: height 0.38 sits on y=0. */
const DAIS_Y = DAIS_H * 0.5;
/** Leftover First Howl on the stand — inside the gold, just above the tread. */
const INNER_R = 3.2;
const INNER_H = 0.12;
const INNER_Y = 0.4;
const INNER_OP = 0.16;
/** Slim rim posts. Height 0.9, radius 0.12 — a mark, not chorus stones, not staves. */
const POST_R = 0.12;
const POST_H = 0.9;
/** Sit on the dais tread so the posts name the rim, not the floor. */
const POST_Y = DAIS_H + POST_H * 0.5;
const POST_RIM = DAIS_R - POST_R;
/**
 * chorus.ts stones sit at RING_R=22 around the den. A dais at the origin
 * would read as a stage. Offset along Hub-aim −14, side 10 so the gather
 * stands on a ring-step, not on chorus stones.
 */
const ALONG = -14;
const SIDE = 10;
const HUB_R = 90;
const N_FINE = 3;
const N_COARSE = 2;
/** 120° around the rim — coarse keeps the first two. */
const POST_GAP = (Math.PI * 2) / 3;

export const DAIS_SIZES = {
  r: DAIS_R,
  h: DAIS_H,
  y: DAIS_Y,
  innerR: INNER_R,
  innerH: INNER_H,
  innerY: INNER_Y,
  innerOp: INNER_OP,
  postR: POST_R,
  postH: POST_H,
  postY: POST_Y,
  postRim: POST_RIM,
  along: ALONG,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  r: DAIS_R,
  h: DAIS_H,
  y: 0,
  innerR: 0,
  innerH: 0,
  innerY: 0,
  innerOp: 0,
  postR: 0,
  postH: 0,
  postY: 0,
  postRim: 0,
  along: ALONG,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  n: 0,
  want: 0,
  x: 0,
  z: 0,
  segs: 0,
  daisCount: 0,
  innerCount: 0,
  postCount: 0,
};

function nPosts(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * One Rhoa Howl-dais at DISTRICTS kind==="ring" x,z, offset along Hub-aim
 * −14 side 10 so it is not on chorus stones. CylinderGeometry r=4.8 h=0.38
 * MeshPhysical dark gold. Inner Cylinder r=3.2 h=0.12 MeshBasic additive
 * cyan opacity 0.16 at y=0.4 — leftover First Howl on the stand. 3 rim
 * posts r=0.12 h=0.9 at 120° (coarse 2). coarse: skip inner. Hub skip (r<90).
 * Not pads. Not chorus stones. Not Aure seat. Not cradle.
 */
export function growDais(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "dais";
  group.add(root);

  const want = nPosts(coarse);
  const sizes = { ...emptySizes, want };
  root.userData.sizes = sizes;
  root.userData.daisCount = 0;
  root.userData.innerCount = 0;
  root.userData.postCount = 0;

  const ring = den("ring");
  if (!ring) return;
  if (Math.hypot(ring.x, ring.z) < HUB_R) return;

  const dx = 0 - ring.x;
  const dz = 0 - ring.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const s1 = Math.hypot(ring.x + px * SIDE, ring.z + pz * SIDE);
  const s2 = Math.hypot(ring.x - px * SIDE, ring.z - pz * SIDE);
  const side = s1 >= s2 ? 1 : -1;
  const x = ring.x + ux * ALONG + px * SIDE * side;
  const z = ring.z + uz * ALONG + pz * SIDE * side;
  if (Math.hypot(x, z) < HUB_R) return;

  const segs = coarse ? 10 : 16;
  const gold = darkGold();

  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(DAIS_R, DAIS_R, DAIS_H, segs),
    gold,
  );
  stand.position.set(x, DAIS_Y, z);
  stand.castShadow = false;
  stand.receiveShadow = true;
  stand.frustumCulled = true;
  stand.renderOrder = 2;
  root.add(stand);

  sizes.x = x;
  sizes.y = DAIS_Y;
  sizes.z = z;
  sizes.segs = segs;
  sizes.daisCount = 1;
  root.userData.daisCount = 1;

  const a0 = Math.atan2(z - ring.z, x - ring.x);
  const postSegs = coarse ? 6 : 8;
  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, POST_H, postSegs);
  let posts = 0;
  for (let i = 0; i < want; i++) {
    const a = a0 + i * POST_GAP;
    const pxp = x + Math.cos(a) * POST_RIM;
    const pzp = z + Math.sin(a) * POST_RIM;
    if (Math.hypot(pxp, pzp) < HUB_R) continue;
    const post = new THREE.Mesh(postGeo, gold);
    post.position.set(pxp, POST_Y, pzp);
    post.castShadow = false;
    post.receiveShadow = true;
    post.frustumCulled = true;
    post.renderOrder = 2;
    root.add(post);
    posts += 1;
  }

  sizes.postR = POST_R;
  sizes.postH = POST_H;
  sizes.postY = POST_Y;
  sizes.postRim = POST_RIM;
  sizes.n = posts;
  sizes.postCount = posts;
  root.userData.postCount = posts;

  if (coarse) return;

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(INNER_R, INNER_R, INNER_H, segs),
    howlInner(INNER_OP),
  );
  inner.position.set(x, INNER_Y, z);
  inner.castShadow = false;
  inner.receiveShadow = false;
  inner.frustumCulled = true;
  inner.renderOrder = 1;
  root.add(inner);

  sizes.innerR = INNER_R;
  sizes.innerH = INNER_H;
  sizes.innerY = INNER_Y;
  sizes.innerOp = INNER_OP;
  sizes.innerCount = 1;
  root.userData.innerCount = 1;
}
