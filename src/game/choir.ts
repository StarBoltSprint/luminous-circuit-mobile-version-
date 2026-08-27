/** REST-TO-CHORUS sit-stones on empty ground BETWEEN Crystal Terraces and Outer Howl.
 * Mira's tired walk to Rhoa without a trial. Not terrace benches (rest.ts).
 * Not Howl pads (pads.ts). Not ring dais (dais.ts). Not terrace steps (steps.ts).
 * Not chorus stones (chorus.ts) — those sit IN the ring.
 * Parent hooks with:
 *   laterOn(() => { try { growChoir(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.26,
    metalness: 0.46,
    emissive: 0x5a4020,
    emissiveIntensity: 0.12,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
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
  group.add(mesh);
}

/** Low sit-stone. Width along the walk, depth toward the path. */
const STONE_W = 1.6;
const STONE_H = 0.22;
const STONE_D = 0.7;
/** Box center: height 0.22 sits on y=0. */
const STONE_Y = 0.11;
/**
 * Empty middle of terrace→ring. t=0.5 is on both radius edges (r=130),
 * so stones sit EAST of the line (world x +36).
 * Terrace (48, 660) r=130. Outer Howl (40, 920) r=130.
 */
const T_LO = 0.36;
const T_HI = 0.64;
const OFFSET_X = 36;
/** Skip hypot < 140 from terrace (48, 660) or ring (40, 920). */
const DEN_SKIP = 140;
const HUB_R = 90;
const N_FINE = 5;
const N_COARSE = 3;

export const CHOIR_SIZES = {
  w: STONE_W,
  h: STONE_H,
  d: STONE_D,
  y: STONE_Y,
  tLo: T_LO,
  tHi: T_HI,
  offsetX: OFFSET_X,
  denSkip: DEN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nStones(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, y: STONE_Y, tLo: T_LO, tHi: T_HI, offsetX: OFFSET_X };
}

/**
 * Mira→Rhoa rest-to-chorus sit-stones on empty ground between DISTRICTS
 * terrace and ring. 5 BoxGeometry 1.6×0.22×0.7 (coarse 3) MeshPhysical
 * dark gold 0x2c2212 emissive 0x5a4020 intensity 0.12, evenly t=0.36..0.64
 * of the terrace→ring segment, offset x=+36, y=0.11. Yaw faces the path.
 * Skip hypot < 140 from terrace (48, 660) or ring (40, 920). Hub skip (r<90).
 * Not rest benches. Not Howl pads. Not dais. Not steps. Not chorus stones.
 */
export function growChoir(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "choir";
  group.add(root);

  const want = nStones(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.choirCounts = counts;
  root.userData.choirCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: STONE_W,
    h: STONE_H,
    d: STONE_D,
    y: STONE_Y,
    tLo: T_LO,
    tHi: T_HI,
    offsetX: OFFSET_X,
    denSkip: DEN_SKIP,
  };

  const terrace = den("terrace");
  const ring = den("ring");
  if (!terrace || !ring) return;
  if (Math.hypot(terrace.x, terrace.z) < HUB_R || Math.hypot(ring.x, ring.z) < HUB_R) return;
  if (Math.hypot(terrace.x, terrace.z) < DEN_SKIP) return;
  if (Math.hypot(ring.x, ring.z) < DEN_SKIP) return;

  const dx = ring.x - terrace.x;
  const dz = ring.z - terrace.z;
  const yaw = Math.atan2(dx, dz);
  /** Face the path from the east offset — local Z toward the walk line. */
  const ry = yaw - Math.PI / 2;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = terrace.x + dx * t + OFFSET_X;
    const z = terrace.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    poses.push({ x, y: STONE_Y, z, ry });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(STONE_W, STONE_H, STONE_D), darkGold(), poses, root);

  counts.n = poses.length;
  root.userData.choirCount = poses.length;
}
