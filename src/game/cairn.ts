/** WAY-CAIRNS on the empty ground BETWEEN dens. Stacked-stone mark so a walker knows the next den.
 * Not path lamps (lamps.ts). Not plaza steles (notice.ts). Not span pylons (pylons.ts).
 * Not terrace posts (posts.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growCairn(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.5,
    emissive: 0x5a4020,
    emissiveIntensity: 0.16,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

/** Leftover First Howl — a way-spark in the cairn cap. Skip on coarse. */
function waySpark() {
  return new THREE.MeshBasicMaterial({
    color: 0x2ee6ff,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  s: number;
};

type Way = {
  x: number;
  z: number;
  way: string;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group, order = 0) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = order;
  group.add(mesh);
}

/** Hub skip — same civic floor as lamps / pylons / posts. */
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;
const STONES_FINE = 3;
const STONES_COARSE = 2;
const STONE_SCALES = [1.15, 0.82, 0.55] as const;
const STONE_Y = [0.55, 1.35, 2.05] as const;
const SPARK_S = 0.22;
const SPARK_Y = 2.35;

/**
 * World marks on empty ground between dens — not inside a den radius.
 * Coarse keeps the first two.
 */
const WAYS: Way[] = [
  { x: -310, z: 48, way: "hub-canal" },
  { x: 35, z: -340, way: "hub-foundry" },
  { x: 320, z: 45, way: "hub-bridge" },
  { x: -420, z: -400, way: "archive-join" },
];

export const CAIRN_SIZES = {
  nFine: N_FINE,
  nCoarse: N_COARSE,
  stonesFine: STONES_FINE,
  stonesCoarse: STONES_COARSE,
  scales: STONE_SCALES,
  y: STONE_Y,
  sparkS: SPARK_S,
  sparkY: SPARK_Y,
};

function nCairns(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function nStones(coarse: boolean): number {
  return coarse ? STONES_COARSE : STONES_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, stones: 0, sparks: 0, want };
}

/** True if the world mark sits inside Hub or any den radius. */
function insideDen(x: number, z: number): boolean {
  if (Math.hypot(x, z) < HUB_R) return true;
  for (const d of DISTRICTS) {
    if (Math.hypot(x - d.x, z - d.z) < d.radius) return true;
  }
  return false;
}

/**
 * Way-cairns at world coords between dens. 4 stacked OctahedronGeometry(1,0)
 * (coarse 2, first two). 3 stones each (coarse 2). MeshPhysical dark gold
 * 0x2c2212 emissive 0x5a4020. Fine: cyan MeshBasic way-spark at y=2.35.
 * Hub / den-radius skip. Not lamps. Not steles. Not pylons. Not posts.
 */
export function growCairn(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "cairn";
  group.add(root);

  const want = nCairns(coarse);
  const layers = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number; way: string }[] = [];
  root.userData.cairnCounts = counts;
  root.userData.cairnCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    scales: STONE_SCALES.slice(0, layers),
    y: STONE_Y.slice(0, layers),
    sparkS: coarse ? 0 : SPARK_S,
    sparkY: coarse ? 0 : SPARK_Y,
  };

  const stones: Pose[] = [];
  const sparks: Pose[] = [];

  for (let i = 0; i < want; i++) {
    const mark = WAYS[i];
    if (!mark) continue;
    const { x, z, way } = mark;
    if (insideDen(x, z)) continue;
    positions.push({ x, z, way });
    for (let k = 0; k < layers; k++) {
      stones.push({ x, y: STONE_Y[k]!, z, s: STONE_SCALES[k]! });
    }
    if (!coarse) sparks.push({ x, y: SPARK_Y, z, s: SPARK_S });
  }

  const geo = new THREE.OctahedronGeometry(1, 0);
  stamp(geo, darkGold(), stones, root, 0);
  stamp(geo, waySpark(), sparks, root, 2);

  counts.n = positions.length;
  counts.stones = stones.length;
  counts.sparks = sparks.length;
  root.userData.cairnCount = positions.length;
}
