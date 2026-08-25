/** Seln HOWL-FALL at the canal den — leftover First Howl stepping down toward Join.
 * Additive cyan planes. Not canal water sheets (water.ts). Not rails. Not cistern wells.
 * Parent hooks with:
 *   laterOn(() => { try { cascade = growCascade(group, coarse); } catch { } });
 *   // in world.tick(t): try { cascade?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function addCyan(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3ec8e0,
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

/** Thin fall-sheet. Width across the current, depth along canal → Join. */
const PLANE_W = 6;
const PLANE_H = 0.08;
const PLANE_D = 2;
/** Highest sheet at the den; lowest sheet toward Join. */
const Y_TOP = 3.2;
const Y_BOT = 0.6;
const OP = 0.18;
const OP_MIN = 0.12;
const OP_MAX = 0.24;
/** Slow Howl-fall pulse — not Hub breath, not Beacon hail. */
const FALL = 0.92;
const N_FINE = 4;
const N_COARSE = 2;
const HUB_R = 90;

const SIZES = {
  w: PLANE_W,
  h: PLANE_H,
  d: PLANE_D,
  yTop: Y_TOP,
  yBot: Y_BOT,
  op: OP,
  opMin: OP_MIN,
  opMax: OP_MAX,
  fall: FALL,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPlanes(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Seln's Howl-fall at DISTRICTS kind==="canal" x,z. 4 BoxGeometry 6×0.08×2
 * (coarse 2) MeshBasic additive cyan planes, opacity 0.18, stepping down
 * y 3.2→0.6 toward Join. tick: opacity 0.12–0.24. Not water sheets. Not rails.
 * Not cistern wells.
 */
export function growCascade(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "cascade";
  group.add(root);

  const want = nPlanes(coarse);
  const spanOp = OP_MAX - OP_MIN;
  root.userData.planeCount = 0;
  root.userData.sizes = {
    w: SIZES.w,
    h: SIZES.h,
    d: SIZES.d,
    yTop: SIZES.yTop,
    yBot: SIZES.yBot,
    op: SIZES.op,
    opMin: SIZES.opMin,
    opMax: SIZES.opMax,
    fall: SIZES.fall,
    n: 0,
    want,
  };

  const canal = den("canal");
  if (!canal) return { tick() {} };
  if (Math.hypot(canal.x, canal.z) < HUB_R) return { tick() {} };

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(ux, uz);
  const alongSpan = (N_FINE - 1) * PLANE_D;

  const geo = new THREE.BoxGeometry(PLANE_W, PLANE_H, PLANE_D);
  const mat = addCyan(OP);
  const mesh = new THREE.InstancedMesh(geo, mat, want);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 3;

  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  for (let i = 0; i < want; i++) {
    const u = want === 1 ? 0 : i / (want - 1);
    const along = u * alongSpan;
    dummy.position.set(
      canal.x + ux * along,
      Y_TOP + (Y_BOT - Y_TOP) * u,
      canal.z + uz * along,
    );
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);

  root.userData.planeCount = want;
  root.userData.sizes.n = want;
  root.userData.sizes.x = canal.x;
  root.userData.sizes.y = Y_TOP;
  root.userData.sizes.z = canal.z;
  root.userData.sizes.along = alongSpan;

  return {
    tick(t: number) {
      const u = (Math.sin(t * FALL) + 1) * 0.5;
      mat.opacity = OP_MIN + u * spanOp;
    },
  };
}

export { SIZES as CASCADE_SIZES };
