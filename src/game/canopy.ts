/** Syl ORCHARD CANOPY RING — shade as a building, not a kiln.
 * Horizontal gold torus + posts + thin shade disc at the grove den.
 * Not boughs.ts branches. Not fruit.ts hanging fruit. Not roots.ts.
 * Not grove extras (world.ts trunks). Charge rests in shade here.
 * Parent hooks with:
 *   laterOn(() => { try { growCanopy(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function shadeGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.12,
    iridescence: 0.5,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function shadeDisc(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Shade ring in the air — a building of shade, not a kiln forge torus. */
const RING_R = 5.4;
const TUBE = 0.18;
const RING_Y = 4.2;
/** Posts hold the ring. Height matches RING_Y; center sits at half-height. */
const POST_R = 0.1;
const POST_H = 4.2;
const POST_Y = 2.1;
/** Thin shade disc inside the torus (inner 5.22). Skip on coarse. */
const DISC_R = 4.6;
const DISC_Y = 4.2;
const DISC_OP = 0.08;
/**
 * Grove apron — outside the hall (scale 32) and inside world.ts trunks (r=38).
 * Along the den radial from Hub; side is the left-hand perpendicular.
 */
const ALONG = 16;
const SIDE = -12;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

export const CANOPY_SIZES = {
  r: RING_R,
  tube: TUBE,
  y: RING_Y,
  ringR: RING_R,
  ringTube: TUBE,
  ringY: RING_Y,
  postR: POST_R,
  postH: POST_H,
  postY: POST_Y,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  along: ALONG,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  r: RING_R,
  tube: TUBE,
  y: 0,
  ringR: 0,
  ringTube: 0,
  ringY: 0,
  postR: 0,
  postH: 0,
  postY: 0,
  discR: 0,
  discY: 0,
  discOp: 0,
  along: ALONG,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  x: 0,
  z: 0,
  ringCount: 0,
  postCount: 0,
  discCount: 0,
  segs: 0,
  want: 0,
};

function nPosts(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * One Syl orchard canopy ring at DISTRICTS kind==="grove" x,z, offset along
 * +16 side -12. TorusGeometry r=5.4 tube=0.18 MeshPhysical dark gold at y=4.2,
 * rotateX PI/2. 4 CylinderGeometry posts r=0.1 h=4.2 (coarse 2) at the torus
 * cardinals, y=2.1. CircleGeometry r=4.6 MeshBasic gold opacity 0.08 shade
 * disc at y=4.2; skip disc on coarse. Shade as a building, not a kiln.
 * Hub skip (r<90). Not boughs. Not hanging fruit. Not floor roots.
 */
export function growCanopy(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "canopy";
  group.add(root);

  const want = nPosts(coarse);
  const sizes = { ...emptySizes, want };
  root.userData.sizes = sizes;
  root.userData.ringCount = 0;
  root.userData.postCount = 0;
  root.userData.discCount = 0;
  root.userData.canopyCount = 0;

  const grove = den("grove");
  if (!grove) return;
  if (Math.hypot(grove.x, grove.z) < HUB_R) return;

  const len = Math.hypot(grove.x, grove.z) || 1;
  const ux = grove.x / len;
  const uz = grove.z / len;
  const px = -uz;
  const pz = ux;
  const x = grove.x + ux * ALONG + px * SIDE;
  const z = grove.z + uz * ALONG + pz * SIDE;
  if (Math.hypot(x, z) < HUB_R) return;

  const segs = coarse ? 10 : 16;
  const tubeSeg = coarse ? 5 : 8;
  const postSegs = coarse ? 6 : 8;
  const gold = shadeGold();

  const rig = new THREE.Group();
  rig.name = "canopy-rig";
  rig.position.set(x, 0, z);
  root.add(rig);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, TUBE, tubeSeg, segs), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, RING_Y, 0);
  ring.castShadow = false;
  ring.receiveShadow = true;
  ring.frustumCulled = true;
  ring.renderOrder = 2;
  rig.add(ring);

  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, POST_H, postSegs);
  const posts = new THREE.InstancedMesh(postGeo, gold, want);
  posts.castShadow = false;
  posts.receiveShadow = true;
  posts.frustumCulled = true;
  posts.renderOrder = 2;
  for (let i = 0; i < want; i++) {
    const a = (i / want) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * RING_R, POST_Y, Math.sin(a) * RING_R);
    dummy.rotation.set(0, a, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  rig.add(posts);

  sizes.x = x;
  sizes.y = RING_Y;
  sizes.z = z;
  sizes.ringR = RING_R;
  sizes.ringTube = TUBE;
  sizes.ringY = RING_Y;
  sizes.postR = POST_R;
  sizes.postH = POST_H;
  sizes.postY = POST_Y;
  sizes.segs = segs;
  sizes.ringCount = 1;
  sizes.postCount = want;
  root.userData.ringCount = 1;
  root.userData.postCount = want;
  root.userData.canopyCount = 1;

  if (coarse) return;

  const disc = new THREE.Mesh(new THREE.CircleGeometry(DISC_R, segs), shadeDisc(DISC_OP));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, DISC_Y, 0);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  rig.add(disc);

  sizes.discR = DISC_R;
  sizes.discY = DISC_Y;
  sizes.discOp = DISC_OP;
  sizes.discCount = 1;
  root.userData.discCount = 1;
}
