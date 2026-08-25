/** Kael's SOFT GATE — two posts + a lintel. Open, not a wall. Leave. Return. No score.
 * Parent hooks with:
 *   laterOn(() => { try { growGates(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function softViolet() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x141022,
    roughness: 0.2,
    metalness: 0.38,
    emissive: 0x5a4020,
    emissiveIntensity: 0.12,
    iridescence: 0.52,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.46,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

const POST_W = 1.2;
const POST_H = 14;
const POST_D = 1.2;
const LINTEL_W = 10;
const LINTEL_H = 0.8;
const LINTEL_D = 1.2;
/** Post centers so the lintel covers both caps. Inner walk-gap stays open. */
const POST_X = LINTEL_W * 0.5 - POST_W * 0.5;
const OPEN = POST_X * 2 - POST_W;
const POST_Y = POST_H * 0.5;
const LINTEL_Y = POST_H + LINTEL_H * 0.5;

/**
 * Kael's soft gate at DISTRICTS kind==="gate" x,z. Two BoxGeometry posts
 * 1.2×14×1.2 plus a 10×0.8×1.2 lintel. MeshPhysical dark violet, faint gold
 * emissive. Opening faces the Hub. coarse: posts only — still a door, never a wall.
 */
export function growGates(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "gates";
  group.add(root);

  const sizes = {
    postW: POST_W,
    postH: POST_H,
    postD: POST_D,
    lintelW: LINTEL_W,
    lintelH: LINTEL_H,
    lintelD: LINTEL_D,
    span: POST_X * 2,
    open: OPEN,
    postY: POST_Y,
    lintelY: coarse ? 0 : LINTEL_Y,
  };
  root.userData.sizes = sizes;
  root.userData.postCount = 0;
  root.userData.lintelCount = 0;

  const gate = den("gate");
  if (!gate) return;
  if (Math.hypot(gate.x, gate.z) < 90) return;

  const yaw = Math.atan2(gate.x, gate.z);
  const cx = Math.cos(yaw);
  const sz = Math.sin(yaw);
  const mat = softViolet();
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";

  const postGeo = new THREE.BoxGeometry(POST_W, POST_H, POST_D);
  const posts = new THREE.InstancedMesh(postGeo, mat, 2);
  posts.castShadow = false;
  posts.receiveShadow = true;
  posts.frustumCulled = true;
  posts.renderOrder = 2;

  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    dummy.position.set(gate.x + side * POST_X * cx, POST_Y, gate.z - side * POST_X * sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);
  root.userData.postCount = 2;

  if (!coarse) {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(LINTEL_W, LINTEL_H, LINTEL_D), mat);
    lintel.position.set(gate.x, LINTEL_Y, gate.z);
    lintel.rotation.y = yaw;
    lintel.castShadow = false;
    lintel.receiveShadow = true;
    lintel.frustumCulled = true;
    lintel.renderOrder = 2;
    root.add(lintel);
    root.userData.lintelCount = 1;
  }
}
