/** AURE AIM MARKS on empty ground BETWEEN Overlook and Charge Canals.
 * Parent still sits on the horizon. Do not move it.
 * Not seat.ts parent-seat (that's AT overlook). Not rill.ts (that's Hub→canal).
 * Not cairn.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growWestmark(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold aim — a look-mark, not a seat, not a cairn. */
function aimGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.55,
    emissive: 0xc4a060,
    emissiveIntensity: 0.2,
    iridescence: 0.46,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  rz: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, p.rz);
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

/** Thin aim stick. Width 0.18, height 1.8 — a mark, not a seat, not a rill. */
const BOX_W = 0.18;
const BOX_H = 1.8;
const BOX_D = 0.18;
/** Box center: height 1.8 sits on y=0. */
const BOX_Y = 0.9;
/** Lean toward parent west. */
const LEAN_Z = -0.18;
/**
 * Asked band t=0.40..0.60 of overlook→canal. Skip hypot < 148 from
 * overlook or < 138 from canal — dens nearly kiss, so the band clamps
 * onto that BETWEEN strip. Overlook (−880, 220) r=140. Canal (−620, 96) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_OVERLOOK = 148;
const SKIP_CANAL = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const WESTMARK_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  leanZ: LEAN_Z,
  tLo: T_LO,
  tHi: T_HI,
  skipOverlook: SKIP_OVERLOOK,
  skipCanal: SKIP_CANAL,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nMarks(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, y: BOX_Y, tLo: T_LO, tHi: T_HI, leanZ: LEAN_Z };
}

/**
 * Aure aim marks on empty ground between DISTRICTS overlook and canal.
 * 3 BoxGeometry 0.18×1.8×0.18 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.2 roughness 0.22 metalness 0.55
 * iridescence 0.46 clearcoat 0.45, evenly t=0.40..0.60 of the
 * overlook→canal segment, y=0.9, rotation.z = −0.18 (lean toward parent
 * west). Skip hypot < 148 from overlook or < 138 from canal.
 * Not parent-seat. Not charge rill. Not way-cairn. No tick.
 */
export function growWestmark(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "westmark";
  group.add(root);

  const want = nMarks(coarse);
  const counts = emptyCounts(want);
  root.userData.westmarkCounts = counts;
  root.userData.westmarkCount = 0;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    leanZ: LEAN_Z,
    tLo: T_LO,
    tHi: T_HI,
  };

  const overlook = den("overlook");
  const canal = den("canal");
  if (!overlook || !canal) return;

  const dx = canal.x - overlook.x;
  const dz = canal.z - overlook.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_OVERLOOK + 0.05) / dist;
  const tMax = 1 - (SKIP_CANAL + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = overlook.x + dx * t;
    const z = overlook.z + dz * t;
    if (Math.hypot(x - overlook.x, z - overlook.z) < SKIP_OVERLOOK) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < SKIP_CANAL) continue;
    poses.push({ x, y: BOX_Y, z, rz: LEAN_Z });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), aimGold(), poses, root);

  counts.n = poses.length;
  root.userData.westmarkCount = poses.length;
}
