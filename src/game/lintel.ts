/** Kael GATE LINTEL — one cyan beam spanning the Soft Gates posts. Open, not a wall.
 * Soft gates stay open; the lintel names the passage.
 * Not veil (veil.ts). Not gate posts (gates.ts). Not path arches (arches.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growLintel(group, coarse); } catch { } });
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

/** One naming beam. Width spans the Kael walk-gap; height leaves the door open. */
const LINTEL_W = 4.8;
const LINTEL_H = 0.22;
const LINTEL_D = 0.55;
/** Center y — underside 4.49 so Soft Gates stay open. Not the posts' cap lintel. */
const LINTEL_Y = 4.6;
const HUB_R = 90;
const N_FINE = 1;
const N_COARSE = 1;

export const LINTEL_SIZES = {
  w: LINTEL_W,
  h: LINTEL_H,
  d: LINTEL_D,
  y: LINTEL_Y,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  w: LINTEL_W,
  h: LINTEL_H,
  d: LINTEL_D,
  y: 0,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  n: 0,
  want: 1,
  x: 0,
  z: 0,
  yaw: 0,
  lintelCount: 0,
};

/**
 * One Kael gate lintel at DISTRICTS kind==="gate" x,z. BoxGeometry
 * 4.8×0.22×0.55 at y=4.6, MeshPhysical cyan, rotation.y = gate yaw so it
 * spans the Soft Gates posts. Names the passage — never a lock.
 * coarse: still one. Hub skip (r<90). Not veil. Not gate posts. Not path arches.
 */
export function growLintel(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "lintel";
  group.add(root);

  const want = coarse ? N_COARSE : N_FINE;
  const sizes = { ...emptySizes, want };
  root.userData.sizes = sizes;
  root.userData.lintelCount = 0;

  const gate = den("gate");
  if (!gate) return;
  if (Math.hypot(gate.x, gate.z) < HUB_R) return;

  const yaw = Math.atan2(gate.x, gate.z);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(LINTEL_W, LINTEL_H, LINTEL_D), cyanCrystal());
  lintel.position.set(gate.x, LINTEL_Y, gate.z);
  lintel.rotation.y = yaw;
  lintel.castShadow = false;
  lintel.receiveShadow = true;
  lintel.frustumCulled = true;
  lintel.renderOrder = 2;
  root.add(lintel);

  sizes.y = LINTEL_Y;
  sizes.n = 1;
  sizes.x = gate.x;
  sizes.z = gate.z;
  sizes.yaw = yaw;
  sizes.lintelCount = 1;
  root.userData.lintelCount = 1;
}
