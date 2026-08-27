/** Iri LEFTOVER-LIGHT WALK on empty ground BETWEEN Residual Archive and Charge Canals.
 * Iri's names walking toward Seln's current. Not scripture seam (seam.ts archive↔join).
 * Not charge rill (rill.ts Hub→canal). Not reading nook (nook.ts). Not standing
 * tablets (tablets.ts). Not name-ledger (ledger.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growResidual(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold — a name that already stood true, walking toward Seln's current. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.2,
    metalness: 0.52,
    emissive: 0xc4a060,
    emissiveIntensity: 0.2,
    iridescence: 0.48,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
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

/** Leftover-light name. Radius 0.38, slightly tall — a walk, not a tablet, not a seam. */
const NAME_R = 0.38;
const NAME_Y = 0.48;
const SCALE_X = 0.85;
const SCALE_Y = 1.2;
const SCALE_Z = 0.85;
/**
 * Empty middle of archive→canal. t=0.32..0.68 sits between dens, not inside
 * either floor. Archive (−540,−460) r=120. Canal (−620, 96) r=130.
 */
const T_LO = 0.32;
const T_HI = 0.68;
const ARCHIVE_SKIP = 130;
const CANAL_SKIP = 140;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const RESIDUAL_SIZES = {
  r: NAME_R,
  y: NAME_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  archiveSkip: ARCHIVE_SKIP,
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
 * Iri leftover-light walk on empty ground between DISTRICTS archive and canal.
 * 5 IcosahedronGeometry(0.38, 0) (coarse 3) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.2 roughness 0.2 metalness 0.52 iridescence
 * 0.48 clearcoat 0.48, evenly t=0.32..0.68 of archive(−540,−460) →
 * canal(−620,96), y=0.48, scale 0.85×1.2×0.85. Skip hypot < 130 from
 * archive or < 140 from canal. Hub skip (r<90). Not seam. Not rill.
 * Not nook. Not tablets. No tick.
 */
export function growResidual(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "residual";
  group.add(root);

  const want = nNames(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.residualCounts = counts;
  root.userData.residualCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: NAME_R,
    y: NAME_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
  };

  const archive = den("archive");
  const canal = den("canal");
  if (!archive || !canal) return;
  if (Math.hypot(archive.x, archive.z) < HUB_R || Math.hypot(canal.x, canal.z) < HUB_R) return;

  const dx = canal.x - archive.x;
  const dz = canal.z - archive.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = archive.x + dx * t;
    const z = archive.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - archive.x, z - archive.z) < ARCHIVE_SKIP) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < CANAL_SKIP) continue;
    poses.push({ x, y: NAME_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.IcosahedronGeometry(NAME_R, 0), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.residualCount = poses.length;
}
