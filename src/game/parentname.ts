/** Iri NAMES WALKING TO THE PARENT on empty ground BETWEEN Residual Archive and Star-core Overlook.
 * Iri's leftover light so Aure's parent on the horizon is never decoration.
 * Do not move the parent.
 * Not namestone.ts (hub↔archive). Not residual.ts (archive↔canal).
 * Not hubaim.ts (hub↔overlook). Not westmark.ts (overlook↔canal).
 * Not seat.ts (AT overlook). Not tablets.ts (AT archive).
 * Not firelight.ts (foundry↔archive).
 * Parent hooks with:
 *   laterOn(() => { try { growParentname(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold — a name walking to Aure's parent so the horizon is never decoration. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.52,
    emissive: 0xc4a060,
    emissiveIntensity: 0.18,
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

/** Upright name-crystal. Radius 0.38, tall and thin — a walk to the parent, not a tablet. */
const NAME_R = 0.38;
const NAME_Y = 0.44;
const SCALE_X = 0.85;
const SCALE_Y = 1.4;
const SCALE_Z = 0.7;
/**
 * Empty middle of archive→overlook. t=0.28..0.72 sits between dens, not inside
 * either floor. Archive (−540,−460) r=120 skip 130. Overlook (−880, 220) r=140 skip 148.
 * Canal (−620, 96) skip 140 so we do not sit on Seln.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const ARCHIVE_SKIP = 130;
const OVERLOOK_SKIP = 148;
const CANAL_SKIP = 140;
const N_FINE = 5;
const N_COARSE = 3;

export const PARENTNAME_SIZES = {
  r: NAME_R,
  y: NAME_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  archiveSkip: ARCHIVE_SKIP,
  overlookSkip: OVERLOOK_SKIP,
  canalSkip: CANAL_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nNames(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: NAME_R, y: NAME_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Iri leftover-light names walking to the parent on empty ground between
 * DISTRICTS archive and overlook. 5 OctahedronGeometry(0.38, 0) (coarse 3)
 * MeshPhysical dark gold 0x2c2212 emissive 0xc4a060 intensity 0.18 roughness
 * 0.22 metalness 0.52 iridescence 0.46 clearcoat 0.42, evenly t=0.28..0.72 of
 * archive(−540,−460) → overlook(−880,220), y=0.44, scale 0.85×1.4×0.7
 * (upright name-crystal). Skip hypot < 130 from archive or < 148 from
 * overlook. Also skip hypot < 140 from canal (−620,96). Iri's leftover light
 * so Aure's parent on the horizon is never decoration. Do not move the parent.
 * Not namestone. Not residual. Not hubaim. Not westmark. Not seat. Not tablets.
 * Not firelight. No tick.
 */
export function growParentname(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "parentname";
  group.add(root);

  const want = nNames(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.parentnameCounts = counts;
  root.userData.parentnameCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: NAME_R,
    y: NAME_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
    archiveSkip: ARCHIVE_SKIP,
    overlookSkip: OVERLOOK_SKIP,
    canalSkip: CANAL_SKIP,
  };

  const archive = den("archive") ?? { x: -540, z: -460 };
  const overlook = den("overlook") ?? { x: -880, z: 220 };
  const canal = den("canal") ?? { x: -620, z: 96 };

  const dx = overlook.x - archive.x;
  const dz = overlook.z - archive.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = archive.x + dx * t;
    const z = archive.z + dz * t;
    if (Math.hypot(x - archive.x, z - archive.z) < ARCHIVE_SKIP) continue;
    if (Math.hypot(x - overlook.x, z - overlook.z) < OVERLOOK_SKIP) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < CANAL_SKIP) continue;
    poses.push({ x, y: NAME_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.OctahedronGeometry(NAME_R, 0), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.parentnameCount = poses.length;
}
