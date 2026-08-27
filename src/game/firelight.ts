/** Iri LEFTOVER LIGHT WALKING TO THE KILN on empty ground BETWEEN Outer Foundry and Residual Archive.
 * Iri's names walking so Charge becomes named body, never chrome.
 * Not residual.ts (archive↔canal). Not namestone.ts (hub↔archive).
 * Not joinwalk.ts (foundry↔join). Not petal.ts (grove↔kiln).
 * Not tablets.ts (AT archive). Not seam.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growFirelight(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold — a name walking to the kiln so Charge becomes body, never chrome. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.16,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.26,
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

/** Low name-body. Thin height of a walk-stone; long face along the kiln path. */
const BOX_W = 0.7;
const BOX_H = 0.14;
const BOX_D = 1.1;
/** Asked y=0.08 (box center; height 0.14 sits on y=0). */
const BOX_Y = 0.08;
/**
 * Empty middle of foundry→archive. t=0.28..0.72 sits between dens, not inside
 * either floor. Foundry (70,−680) r=130 skip 140. Archive (−540,−460) r=120 skip 130.
 * Join/market (−300,−340) skip 120 so we do not sit on Voss's Charge-walk.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const FOUNDRY_SKIP = 140;
const ARCHIVE_SKIP = 130;
const JOIN_SKIP = 120;
const JOIN_X = -300;
const JOIN_Z = -340;
const N_FINE = 5;
const N_COARSE = 3;

export const FIRELIGHT_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  tLo: T_LO,
  tHi: T_HI,
  foundrySkip: FOUNDRY_SKIP,
  archiveSkip: ARCHIVE_SKIP,
  joinSkip: JOIN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nLights(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, w: BOX_W, h: BOX_H, d: BOX_D, y: BOX_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Iri leftover-light walk on empty ground between DISTRICTS foundry and archive.
 * 5 BoxGeometry 0.7×0.14×1.1 (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.16 roughness 0.24 metalness 0.5 iridescence
 * 0.44 clearcoat 0.4, evenly t=0.28..0.72 of foundry(70,-680) →
 * archive(-540,-460), y=0.08. Yaw faces the path. Skip hypot < 140 from
 * foundry or < 130 from archive. Also skip hypot < 120 from join market
 * (-300,-340). Charge becomes named body, never chrome. Not residual.
 * Not namestone. Not joinwalk. Not petal. Not tablets. Not seam. No tick.
 */
export function growFirelight(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "firelight";
  group.add(root);

  const want = nLights(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.firelightCounts = counts;
  root.userData.firelightCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    tLo: T_LO,
    tHi: T_HI,
    foundrySkip: FOUNDRY_SKIP,
    archiveSkip: ARCHIVE_SKIP,
    joinSkip: JOIN_SKIP,
  };

  const foundry = den("foundry");
  const archive = den("archive");
  if (!foundry || !archive) return;

  const dx = archive.x - foundry.x;
  const dz = archive.z - foundry.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = foundry.x + dx * t;
    const z = foundry.z + dz * t;
    if (Math.hypot(x - foundry.x, z - foundry.z) < FOUNDRY_SKIP) continue;
    if (Math.hypot(x - archive.x, z - archive.z) < ARCHIVE_SKIP) continue;
    if (Math.hypot(x - JOIN_X, z - JOIN_Z) < JOIN_SKIP) continue;
    poses.push({ x, y: BOX_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.firelightCount = poses.length;
}
