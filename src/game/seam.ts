/** Iri SCRIPTURE SEAM — leftover-light names on empty ground between archive and join.
 * A line so Iri's names walk toward Voss's join. Not standing tablets (tablets.ts).
 * Not reading nook (nook.ts). Not name-ledger (ledger.ts). Not plaza mosaic (mosaic.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growSeam(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold — a name that already stood true, walking toward the join. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.2,
    metalness: 0.55,
    emissive: 0xc4a060,
    emissiveIntensity: 0.22,
    iridescence: 0.5,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
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

/** Leftover-light crystal. Radius 0.55, slightly flat — a name, not a tablet. */
const SEAM_R = 0.55;
const SEAM_Y = 0.55;
const SCALE_X = 1;
const SCALE_Y = 0.7;
const SCALE_Z = 1;
/**
 * Empty middle of archive→join. t=0.28 / 0.72 is the trails.ts den-pad
 * (radius * 0.62) so the line sits between dens, not inside either floor.
 * Archive (-540,-460) r=120. Join/market (-300,-340) r=110.
 */
const T_LO = 0.28;
const T_HI = 0.72;
const HUB_R = 90;
const N_FINE = 6;
const N_COARSE = 3;

export const SEAM_SIZES = {
  r: SEAM_R,
  y: SEAM_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nSeams(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: SEAM_R, y: SEAM_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Iri's scripture seam on empty ground between DISTRICTS archive and market.
 * 6 IcosahedronGeometry r=0.55 detail 0 (coarse 3) MeshPhysical dark gold
 * 0x2c2212 emissive 0xc4a060 intensity 0.22, evenly t=0.28..0.72 of the
 * archive→join segment, y=0.55, scale 1×0.7×1. A line of leftover light
 * so Iri's names walk toward Voss's join. Hub skip (r<90).
 * Not tablets. Not nook. Not ledger. Not plaza mosaic.
 */
export function growSeam(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "seam";
  group.add(root);

  const want = nSeams(coarse);
  const counts = emptyCounts(want);
  root.userData.seamCounts = counts;
  root.userData.seamCount = 0;
  root.userData.sizes = {
    r: SEAM_R,
    y: SEAM_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
  };

  const archive = den("archive");
  const join = den("market");
  if (!archive || !join) return;
  if (Math.hypot(archive.x, archive.z) < HUB_R || Math.hypot(join.x, join.z) < HUB_R) return;

  const dx = join.x - archive.x;
  const dz = join.z - archive.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = archive.x + dx * t;
    const z = archive.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({ x, y: SEAM_Y, z, ry: yaw });
  }

  stamp(new THREE.IcosahedronGeometry(SEAM_R, 0), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.seamCount = poses.length;
}
