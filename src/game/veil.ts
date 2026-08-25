/** Kael GATE VEIL — additive violet hang in the Soft Gates arch. Open. Never a lock.
 * Parent hooks with:
 *   laterOn(() => { try { veil = growVeil(group, coarse); } catch { } });
 *   // in world.tick(t): try { veil?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 * Not gate posts (gates.ts). Not civic banners (banners.ts).
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function addViolet(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x9a72e8,
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

/** Thickness, hang, face — BoxGeometry 0.08×5.2×3.4. rotation.y = yaw+PI/2 so the face spans the arch. */
const VEIL_T = 0.08;
const VEIL_H = 5.2;
const VEIL_W = 3.4;
/** Hang from Kael lintel underside (gates.ts POST_H). */
const HANG_Y = 14;
const VEIL_Y = HANG_Y - VEIL_H * 0.5;
/** Walk slit between the two hangs — never a lock. Inner posts sit at ±3.8. */
const SLIT = 0.28;
const PITCH = VEIL_W + SLIT;
const OP = 0.14;
const OP_MIN = 0.08;
const OP_MAX = 0.20;
/** Soft gate breath — slower than Howl-fall, not Hub inhale, not Beacon hail. */
const BREATH = 0.73;
const N_FINE = 2;
const N_COARSE = 1;
const HUB_R = 90;
/** Face the opening: geometry Z (3.4) maps onto gate local X. */
const FACE_YAW = Math.PI / 2;

const SIZES = {
  t: VEIL_T,
  h: VEIL_H,
  w: VEIL_W,
  hangY: HANG_Y,
  veilY: VEIL_Y,
  slit: SLIT,
  pitch: PITCH,
  op: OP,
  opMin: OP_MIN,
  opMax: OP_MAX,
  breath: BREATH,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  faceYaw: FACE_YAW,
};

function nVeils(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Kael's gate veil at DISTRICTS kind==="gate" x,z. 2 BoxGeometry 0.08×5.2×3.4
 * (coarse 1) MeshBasic additive violet planes hanging in the den arch, opacity
 * 0.14. tick: opacity 0.08–0.20. Walk slit in the middle — never a lock.
 * Not gate posts. Not civic banners. Hub skip (r<90).
 */
export function growVeil(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "veil";
  group.add(root);

  const want = nVeils(coarse);
  const spanOp = OP_MAX - OP_MIN;
  root.userData.veilCount = 0;
  root.userData.sizes = {
    t: SIZES.t,
    h: SIZES.h,
    w: SIZES.w,
    hangY: SIZES.hangY,
    veilY: SIZES.veilY,
    slit: SIZES.slit,
    pitch: SIZES.pitch,
    op: SIZES.op,
    opMin: SIZES.opMin,
    opMax: SIZES.opMax,
    breath: SIZES.breath,
    nFine: SIZES.nFine,
    nCoarse: SIZES.nCoarse,
    faceYaw: SIZES.faceYaw,
    n: 0,
    want,
    x: 0,
    y: 0,
    z: 0,
  };

  const gate = den("gate");
  if (!gate) return { tick() {} };
  if (Math.hypot(gate.x, gate.z) < HUB_R) return { tick() {} };

  const yaw = Math.atan2(gate.x, gate.z);
  const cx = Math.cos(yaw);
  const sz = Math.sin(yaw);
  const faceYaw = yaw + FACE_YAW;

  const geo = new THREE.BoxGeometry(VEIL_T, VEIL_H, VEIL_W);
  const mat = addViolet(OP);
  const mesh = new THREE.InstancedMesh(geo, mat, want);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 3;

  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  for (let i = 0; i < want; i++) {
    const lx = want === 1 ? 0 : (i - (want - 1) * 0.5) * PITCH;
    dummy.position.set(gate.x + lx * cx, VEIL_Y, gate.z - lx * sz);
    dummy.rotation.set(0, faceYaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);

  root.userData.veilCount = want;
  root.userData.sizes.n = want;
  root.userData.sizes.x = gate.x;
  root.userData.sizes.y = VEIL_Y;
  root.userData.sizes.z = gate.z;

  return {
    tick(t: number) {
      const u = (Math.sin(t * BREATH) + 1) * 0.5;
      mat.opacity = OP_MIN + u * spanOp;
    },
  };
}

export { SIZES as VEIL_SIZES };
