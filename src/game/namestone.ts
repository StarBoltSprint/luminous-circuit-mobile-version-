/** IRI NAME-STONES on empty ground BETWEEN Hub and Residual Archive.
 * Names walking home to Hub breath. Not reading nook (nook.ts).
 * Not scripture seam (seam.ts — that owns archive↔join icosahedrons).
 * Not residual.ts (that's archive↔canal). Not cairn archive→join (cairn.ts).
 * Not standing tablets (tablets.ts — those sit AT the archive).
 * Parent hooks with:
 *   laterOn(() => { try { growNamestone(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold — a name already true, walking home to Hub breath. */
function leftoverGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.5,
    emissive: 0xc4a060,
    emissiveIntensity: 0.18,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.42,
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

/** Standing name-stone. Thin face toward the walk home — a name, not a tablet. */
const BOX_W = 0.55;
const BOX_H = 1.15;
const BOX_D = 0.18;
/** Asked y=0.58 (box center; height 1.15 sits on y=0). */
const BOX_Y = 0.58;
/**
 * Empty middle of hub→archive. t=0.28..0.70 sits between dens, not inside
 * either floor. Hub (0,0) r=52 civic skip 90. Archive (−540,−460) r=120 skip 130.
 */
const T_LO = 0.28;
const T_HI = 0.7;
const HUB_X = 0;
const HUB_Z = 0;
const HUB_SKIP = 90;
const ARCHIVE_SKIP = 130;
const N_FINE = 4;
const N_COARSE = 2;

export const NAMESTONE_SIZES = {
  w: BOX_W,
  h: BOX_H,
  d: BOX_D,
  y: BOX_Y,
  tLo: T_LO,
  tHi: T_HI,
  hubSkip: HUB_SKIP,
  archiveSkip: ARCHIVE_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, w: BOX_W, h: BOX_H, d: BOX_D, y: BOX_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Iri name-stones on empty ground between Hub (0,0) and DISTRICTS archive.
 * 4 BoxGeometry 0.55×1.15×0.18 (coarse 2) MeshPhysical dark gold 0x2c2212
 * emissive 0xc4a060 intensity 0.18 roughness 0.24 metalness 0.5 iridescence
 * 0.44 clearcoat 0.42, evenly t=0.28..0.70 of hub(0,0) → archive(-540,-460),
 * y=0.58. Yaw faces the walk home. Skip hypot < 90 from hub or < 130 from
 * archive. Names walking home to Hub breath. Not nook. Not seam. Not residual.
 * Not cairn archive→join. Not standing tablets. No tick.
 */
export function growNamestone(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "namestone";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.namestoneCounts = counts;
  root.userData.namestoneCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: BOX_W,
    h: BOX_H,
    d: BOX_D,
    y: BOX_Y,
    tLo: T_LO,
    tHi: T_HI,
    hubSkip: HUB_SKIP,
    archiveSkip: ARCHIVE_SKIP,
  };

  const archive = den("archive");
  if (!archive) return;
  if (Math.hypot(archive.x, archive.z) < HUB_SKIP) return;

  const dx = archive.x - HUB_X;
  const dz = archive.z - HUB_Z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = HUB_X + dx * t;
    const z = HUB_Z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < HUB_SKIP) continue;
    if (Math.hypot(x - archive.x, z - archive.z) < ARCHIVE_SKIP) continue;
    poses.push({ x, y: BOX_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D), leftoverGold(), poses, root);

  counts.n = poses.length;
  root.userData.namestoneCount = poses.length;
}
