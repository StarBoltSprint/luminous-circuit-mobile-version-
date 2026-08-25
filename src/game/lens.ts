/** Nesh WITNESS LENS — gold torus + cyan disc on the Hub plaza apron toward Nesh.
 * Not the Hub fountain (fountain.ts at 0,0). Not the notice stele lens (notice.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growLens(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { CITIZENS, HUB } from "./lore";

const TORUS_R = 4.2;
const TUBE = 0.18;
const TORUS_Y = TUBE;
const DISC_R = 3.6;
const DISC_Y = 0.22;
const DISC_OP = 0.22;
/** Plaza apron toward Nesh — outside the heart, inside the plaza edge, off 0,0. */
const APRON_R = Math.min(84, Math.max(78, HUB.radius + 30));

function neshAim() {
  const nesh = CITIZENS.find((c) => c.id === "nesh");
  const nx = nesh?.x ?? -24;
  const nz = nesh?.z ?? 128;
  const len = Math.hypot(nx, nz) || 1;
  return { nx: nx / len, nz: nz / len };
}

function goldRim() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.22,
    metalness: 0.48,
    emissive: 0x6a4c22,
    emissiveIntensity: 0.16,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

function cyanDisc(opacity: number) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2ee6ff,
    roughness: 0.16,
    metalness: 0.22,
    emissive: 0x163844,
    emissiveIntensity: 0.18,
    iridescence: 0.48,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const SIZES = {
  torusR: TORUS_R,
  tube: TUBE,
  torusY: TORUS_Y,
  discR: DISC_R,
  discY: DISC_Y,
  discOp: DISC_OP,
  apronR: APRON_R,
};

/**
 * One Nesh witness lens on the Hub plaza apron toward Nesh. Offset from the
 * Hub fountain at 0,0. TorusGeometry r=4.2 tube=0.18 MeshPhysical gold.
 * Inner CircleGeometry r=3.6 at y=0.22 MeshPhysical cyan opacity 0.22.
 * coarse: skip torus, disc only. One lens.
 */
export function growLens(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "lens";
  group.add(root);

  const aim = neshAim();
  const x = aim.nx * APRON_R;
  const z = aim.nz * APRON_R;
  const segs = coarse ? 12 : 22;
  const tubeSeg = coarse ? 5 : 8;

  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, cyanDisc(DISC_OP));
  disc.position.set(x, DISC_Y, z);
  disc.castShadow = false;
  disc.receiveShadow = false;
  disc.frustumCulled = true;
  disc.renderOrder = 1;
  root.add(disc);

  if (!coarse) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TORUS_R, TUBE, tubeSeg, segs), goldRim());
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, TORUS_Y, z);
    rim.castShadow = false;
    rim.receiveShadow = true;
    rim.frustumCulled = true;
    rim.renderOrder = 2;
    root.add(rim);
  }

  root.userData.lensCount = 1;
  root.userData.torusCount = coarse ? 0 : 1;
  root.userData.discCount = 1;
  root.userData.sizes = {
    x,
    y: DISC_Y,
    z,
    torusR: coarse ? 0 : TORUS_R,
    tube: coarse ? 0 : TUBE,
    torusY: coarse ? 0 : TORUS_Y,
    discR: DISC_R,
    discY: DISC_Y,
    discOp: DISC_OP,
    apronR: APRON_R,
    segs,
    tubeSeg: coarse ? 0 : tubeSeg,
  };
}

export { SIZES as LENS_SIZES };
