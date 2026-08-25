/** Seln CANAL TROUGH at canal den — Charge rests here before it moves.
 * One open cyan box, offset from the sluice (sluice.ts). Not sluice posts.
 * Not rails (rails.ts). Not water surface (water.ts). Not cascade lip (lip.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growTrough(group, coarse); } catch { } });
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

/** Open rest-trough. Width across the current, depth along canal → Join. */
const TROUGH_W = 3.6;
const TROUGH_H = 0.18;
const TROUGH_D = 1.1;
/** Floor of the den — Charge sits here, not on the sluice bar (y=1.6) or lip (y=3.2). */
const TROUGH_Y = 0.22;
/**
 * sluice.ts sits at canal x,z (bar 3.2×0.12×0.18). Trough is upstream of that
 * gate so Charge rests here before it moves. bar half-depth + trough half-depth + gap.
 */
const SLUICE_BAR_D = 0.18;
const GAP = 1.04;
const OFFSET = SLUICE_BAR_D * 0.5 + TROUGH_D * 0.5 + GAP;
const HUB_R = 90;
const N_FINE = 1;
const N_COARSE = 1;

export const TROUGH_SIZES = {
  w: TROUGH_W,
  h: TROUGH_H,
  d: TROUGH_D,
  y: TROUGH_Y,
  offset: OFFSET,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  w: TROUGH_W,
  h: TROUGH_H,
  d: TROUGH_D,
  y: 0,
  offset: 0,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  n: 0,
  want: 1,
  x: 0,
  z: 0,
  yaw: 0,
  troughCount: 0,
};

/**
 * One Seln canal-trough at DISTRICTS kind==="canal" x,z, offset from sluice.ts.
 * BoxGeometry 3.6×0.18×1.1 at y=0.22, MeshPhysical cyan, rotation.y faces Join.
 * Charge rests here before it moves. coarse: still one. Hub skip (r<90).
 * Not sluice posts. Not rails. Not water surface. Not cascade lip.
 */
export function growTrough(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "trough";
  group.add(root);

  const want = coarse ? N_COARSE : N_FINE;
  const sizes = { ...emptySizes, want };
  root.userData.sizes = sizes;
  root.userData.troughCount = 0;

  const canal = den("canal");
  if (!canal) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R) return;

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const yaw = Math.atan2(dx, dz);
  const x = canal.x - ux * OFFSET;
  const z = canal.z - uz * OFFSET;
  if (Math.hypot(x, z) < HUB_R) return;

  const trough = new THREE.Mesh(new THREE.BoxGeometry(TROUGH_W, TROUGH_H, TROUGH_D), cyanCrystal());
  trough.position.set(x, TROUGH_Y, z);
  trough.rotation.y = yaw;
  trough.castShadow = false;
  trough.receiveShadow = true;
  trough.frustumCulled = true;
  trough.renderOrder = 2;
  root.add(trough);

  sizes.y = TROUGH_Y;
  sizes.offset = OFFSET;
  sizes.n = 1;
  sizes.x = x;
  sizes.z = z;
  sizes.yaw = yaw;
  sizes.troughCount = 1;
  root.userData.troughCount = 1;
}
