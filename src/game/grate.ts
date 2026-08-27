/** Seln CANAL GRATE — Charge is tended, never bottled.
 * A surface grate over the current so folk don't fall in.
 * Not rails (rails.ts). Not sluice (sluice.ts). Not trough (trough.ts).
 * Not weir (weir.ts). Not cistern wells (cisterns.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growGrate(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold with a cyan kiss — Charge showing through, never bottled. */
function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.28,
    metalness: 0.55,
    emissive: 0x3aa8c0,
    emissiveIntensity: 0.1,
    iridescence: 0.36,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.32,
    clearcoatRoughness: 0.34,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = 2;
  group.add(mesh);
}

/** Cross-bars over the current. Width across the canal, thin along the flow. */
const BAR_W = 3.6;
const BAR_H = 0.08;
const BAR_D = 0.14;
const BAR_SPACE = 0.42;
/** Frame rails at the two ends of the bars — longer along than the slat cluster. */
const FRAME_W = 0.16;
const FRAME_H = 0.12;
const FRAME_D = 3.8;
/** Above canal water so folk walk, Charge still flows under. */
const GRATE_Y = 0.9;
/** Downstream of the den, on the current (side 0). */
const ALONG = 22;
const SIDE = 0;
const N_BARS_FINE = 4;
const N_BARS_COARSE = 2;
const N_RAILS_FINE = 2;
const N_RAILS_COARSE = 1;

export const GRATE_SIZES = {
  barW: BAR_W,
  barH: BAR_H,
  barD: BAR_D,
  barSpace: BAR_SPACE,
  y: GRATE_Y,
  frameW: FRAME_W,
  frameH: FRAME_H,
  frameD: FRAME_D,
  along: ALONG,
  side: SIDE,
  nBarsFine: N_BARS_FINE,
  nBarsCoarse: N_BARS_COARSE,
  nRailsFine: N_RAILS_FINE,
  nRailsCoarse: N_RAILS_COARSE,
};

const emptySizes = {
  barW: BAR_W,
  barH: BAR_H,
  barD: BAR_D,
  barSpace: BAR_SPACE,
  y: 0,
  frameW: FRAME_W,
  frameH: FRAME_H,
  frameD: FRAME_D,
  along: ALONG,
  side: SIDE,
  nBarsFine: N_BARS_FINE,
  nBarsCoarse: N_BARS_COARSE,
  nRailsFine: N_RAILS_FINE,
  nRailsCoarse: N_RAILS_COARSE,
  nBars: 0,
  nRails: 0,
  wantBars: 0,
  wantRails: 0,
  x: 0,
  z: 0,
  yaw: 0,
  grateCount: 0,
};

function nBars(coarse: boolean): number {
  return coarse ? N_BARS_COARSE : N_BARS_FINE;
}

function nRails(coarse: boolean): number {
  return coarse ? N_RAILS_COARSE : N_RAILS_FINE;
}

/**
 * One Seln canal-grate at DISTRICTS kind==="canal" x,z, along +22 side 0.
 * 4 BoxGeometry 3.6×0.08×0.14 bars (coarse 2) spaced 0.42 across the current,
 * plus 2 BoxGeometry 0.16×0.12×3.8 frame rails (coarse 1) at the bar ends.
 * MeshPhysical dark gold 0x2c2212, emissive cyan 0x3aa8c0 0.1, y=0.9.
 * Charge is tended, never bottled. Folk walk; the current still walks under.
 * Not rails. Not sluice. Not trough. Not weir. Not cistern wells.
 */
export function growGrate(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "grate";
  group.add(root);

  const wantBars = nBars(coarse);
  const wantRails = nRails(coarse);
  const sizes = { ...emptySizes, wantBars, wantRails };
  root.userData.sizes = sizes;
  root.userData.barCount = 0;
  root.userData.railCount = 0;
  root.userData.grateCount = 0;

  const canal = den("canal");
  if (!canal) return;

  const join = den("market");
  const dx = (join?.x ?? 0) - canal.x;
  const dz = (join?.z ?? 0) - canal.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const yaw = Math.atan2(dx, dz);
  const cx = canal.x + ux * ALONG + px * SIDE;
  const cz = canal.z + uz * ALONG + pz * SIDE;

  const gold = darkGold();
  const bars: Pose[] = [];
  for (let i = 0; i < wantBars; i++) {
    const alongOff = (i - (wantBars - 1) * 0.5) * BAR_SPACE;
    bars.push({
      x: cx + ux * alongOff,
      y: GRATE_Y,
      z: cz + uz * alongOff,
      ry: yaw,
    });
  }
  stamp(new THREE.BoxGeometry(BAR_W, BAR_H, BAR_D), gold, bars, root);

  const rails: Pose[] = [];
  for (let i = 0; i < wantRails; i++) {
    const sideSign = wantRails === 1 ? 1 : i === 0 ? -1 : 1;
    const sideOff = sideSign * BAR_W * 0.5;
    rails.push({
      x: cx + px * sideOff,
      y: GRATE_Y,
      z: cz + pz * sideOff,
      ry: yaw,
    });
  }
  stamp(new THREE.BoxGeometry(FRAME_W, FRAME_H, FRAME_D), gold, rails, root);

  sizes.y = GRATE_Y;
  sizes.nBars = bars.length;
  sizes.nRails = rails.length;
  sizes.x = cx;
  sizes.z = cz;
  sizes.yaw = yaw;
  sizes.grateCount = 1;
  root.userData.barCount = bars.length;
  root.userData.railCount = rails.length;
  root.userData.grateCount = 1;
}
