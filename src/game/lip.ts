/** Seln HOWL-FALL LIP at the canal cascade — Charge tips here, not dams.
 * One thin cyan box at the cascade crest. Not cascade water (cascade.ts).
 * Not weir (weir.ts). Not sluice (sluice.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growLip(group, coarse); } catch { } });
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

/** Thin crest lip. Width across the current, short depth along the fall. */
const LIP_W = 4.2;
const LIP_H = 0.16;
const LIP_D = 0.55;
/** Matches cascade.ts Y_TOP — Howl-fall crest, not the low Join sheet. */
const LIP_Y = 3.2;
const HUB_R = 90;
const N_FINE = 1;
const N_COARSE = 1;

export const LIP_SIZES = {
  w: LIP_W,
  h: LIP_H,
  d: LIP_D,
  y: LIP_Y,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  w: LIP_W,
  h: LIP_H,
  d: LIP_D,
  y: 0,
  nFine: N_FINE,
  nCoarse: N_COARSE,
  n: 0,
  want: 1,
  x: 0,
  z: 0,
  yaw: 0,
  lipCount: 0,
};

/**
 * One Seln Howl-fall lip at DISTRICTS kind==="canal" x,z. BoxGeometry
 * 4.2×0.16×0.55 at y=3.2 (cascade.ts Y_TOP), MeshPhysical cyan, rotation.y
 * faces Join so Charge tips here, not dams. coarse: still one. Hub skip
 * (r<90). Not cascade water. Not weir. Not sluice.
 */
export function growLip(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "lip";
  group.add(root);

  const want = coarse ? N_COARSE : N_FINE;
  const sizes = { ...emptySizes, want };
  root.userData.sizes = sizes;
  root.userData.lipCount = 0;

  const canal = den("canal");
  if (!canal) return;
  if (Math.hypot(canal.x, canal.z) < HUB_R) return;

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const yaw = Math.atan2(dx, dz);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(LIP_W, LIP_H, LIP_D), cyanCrystal());
  lip.position.set(canal.x, LIP_Y, canal.z);
  lip.rotation.y = yaw;
  lip.castShadow = false;
  lip.receiveShadow = true;
  lip.frustumCulled = true;
  lip.renderOrder = 2;
  root.add(lip);

  sizes.y = LIP_Y;
  sizes.n = 1;
  sizes.x = canal.x;
  sizes.z = canal.z;
  sizes.yaw = yaw;
  sizes.lipCount = 1;
  root.userData.lipCount = 1;
}
