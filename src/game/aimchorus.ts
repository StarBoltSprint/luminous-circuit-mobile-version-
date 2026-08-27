/** PARENT-AIM WALKING TO THE GATHER on empty ground BETWEEN Star-core Overlook
 * (−880,220 r=140) and Outer Howl (40,920 r=130).
 * Aure keeps the city aimed; Rhoa gathers without closing. Do not move the parent.
 * Not hubaim.ts (hub↔overlook). Not westmark.ts (overlook↔canal).
 * Not parentname.ts (archive↔overlook). Not choir.ts (terrace↔ring).
 * Not hailchorus.ts (beacon↔ring). Not seat.ts (AT overlook).
 * Not dais/pads/chorus (AT ring).
 * Parent hooks with:
 *   laterOn(() => { try { growAimchorus(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold aim-crystal — Aure's look walking to Rhoa, never a lock, never a close. */
function aimGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.52,
    emissive: 0xc4a060,
    emissiveIntensity: 0.16,
    iridescence: 0.46,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
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
    dummy.scale.set(SCALE_X, SCALE_Y, SCALE_Z);
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

/** Upright aim-crystal. Radius 0.36, tall and thin — a walk to the gather, not a seat. */
const AIM_R = 0.36;
const AIM_Y = 0.42;
const SCALE_X = 0.8;
const SCALE_Y = 1.35;
const SCALE_Z = 0.65;
/**
 * Empty middle of overlook→ring. t=0.28..0.72 sits between dens, not inside
 * either floor. Overlook (−880, 220) r=140 skip 148. Outer Howl (40, 920) r=130 skip 140.
 * Terrace (48, 660) skip 140 so we do not sit on Mira. Canal (−620, 96) skip 140 so we do not sit on Seln.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const OVERLOOK_SKIP = 148;
const RING_SKIP = 140;
const TERRACE_SKIP = 140;
const CANAL_SKIP = 140;
const N_FINE = 5;
const N_COARSE = 3;

export const AIMCHORUS_SIZES = {
  r: AIM_R,
  y: AIM_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  overlookSkip: OVERLOOK_SKIP,
  ringSkip: RING_SKIP,
  terraceSkip: TERRACE_SKIP,
  canalSkip: CANAL_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nAims(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: AIM_R, y: AIM_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Parent-aim walking to the gather on empty ground between DISTRICTS
 * overlook and ring. 5 OctahedronGeometry(0.36, 0) (coarse 3)
 * MeshPhysical dark gold 0x2c2212 emissive 0xc4a060 intensity 0.16 roughness
 * 0.22 metalness 0.52 iridescence 0.46 clearcoat 0.42, evenly t=0.28..0.72 of
 * overlook(−880,220) → ring(40,920), y=0.42, scale 0.8×1.35×0.65
 * (upright aim-crystal). Skip hypot < 148 from overlook or < 140 from ring.
 * Also skip hypot < 140 from terrace (48,660) and < 140 from canal (−620,96).
 * Aure keeps the city aimed; Rhoa gathers without closing. Do not move the parent.
 * Not hubaim. Not westmark. Not parentname. Not choir. Not hailchorus.
 * Not seat. Not dais/pads/chorus. No tick.
 */
export function growAimchorus(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "aimchorus";
  group.add(root);

  const want = nAims(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.aimchorusCounts = counts;
  root.userData.aimchorusCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: AIM_R,
    y: AIM_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
    overlookSkip: OVERLOOK_SKIP,
    ringSkip: RING_SKIP,
    terraceSkip: TERRACE_SKIP,
    canalSkip: CANAL_SKIP,
  };

  const overlook = den("overlook") ?? { x: -880, z: 220 };
  const ring = den("ring") ?? { x: 40, z: 920 };
  const terrace = den("terrace") ?? { x: 48, z: 660 };
  const canal = den("canal") ?? { x: -620, z: 96 };

  const dx = ring.x - overlook.x;
  const dz = ring.z - overlook.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = overlook.x + dx * t;
    const z = overlook.z + dz * t;
    if (Math.hypot(x - overlook.x, z - overlook.z) < OVERLOOK_SKIP) continue;
    if (Math.hypot(x - ring.x, z - ring.z) < RING_SKIP) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < TERRACE_SKIP) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < CANAL_SKIP) continue;
    poses.push({ x, y: AIM_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.OctahedronGeometry(AIM_R, 0), aimGold(), poses, root);

  counts.n = poses.length;
  root.userData.aimchorusCount = poses.length;
}
