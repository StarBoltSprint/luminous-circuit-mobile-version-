/** REST-NOT-A-TEST marks on empty ground BETWEEN Crystal Terraces and Soft Gates.
 * Mira wards rest so Kael's gates never become a trial.
 * Not terrace benches (rest.ts). Not terrace↔ring sit-stones (choir.ts).
 * Not beacon↔gate hail (hush.ts). Not Kael posts (gates.ts). Not terrace steps (steps.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growRestgate(group, coarse); } catch { } });
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
    roughness: 0.28,
    metalness: 0.46,
    emissive: 0x5a4020,
    emissiveIntensity: 0.12,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.38,
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

/** Low rest-mark. Width across the walk, depth along it. Not a sit-bench. */
const MARK_W = 1.4;
const MARK_H = 0.18;
const MARK_D = 0.55;
/** Box center: height 0.18 sits on y=0. */
const MARK_Y = 0.09;
/**
 * Empty middle of terrace→gate. t=0.34..0.66 is BETWEEN both floors.
 * Terrace (48, 660) r=130. Soft Gates (520, 480) r=130.
 */
const T_LO = 0.34;
const T_HI = 0.66;
/** Skip hypot < 140 from terrace (48, 660) or gate (520, 480). */
const DEN_SKIP = 140;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;

export const RESTGATE_SIZES = {
  w: MARK_W,
  h: MARK_H,
  d: MARK_D,
  y: MARK_Y,
  tLo: T_LO,
  tHi: T_HI,
  denSkip: DEN_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nMarks(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, y: MARK_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Mira→Kael REST-NOT-A-TEST marks on empty ground between DISTRICTS
 * terrace and gate. 4 BoxGeometry 1.4×0.18×0.55 (coarse 2) MeshPhysical
 * dark gold 0x2c2212 emissive 0x5a4020 intensity 0.12 roughness 0.28
 * metalness 0.46 iridescence 0.4 clearcoat 0.38, evenly t=0.34..0.66 of
 * terrace(48,660) → gate(520,480), y=0.09. Yaw faces the path.
 * Skip hypot < 140 from terrace or < 140 from gate.
 * Not rest benches. Not choir sit-stones. Not hush hail. Not gates. Not steps.
 */
export function growRestgate(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "restgate";
  group.add(root);

  const want = nMarks(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.restgateCounts = counts;
  root.userData.restgateCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    w: MARK_W,
    h: MARK_H,
    d: MARK_D,
    y: MARK_Y,
    tLo: T_LO,
    tHi: T_HI,
    denSkip: DEN_SKIP,
  };

  const terrace = den("terrace");
  const gate = den("gate");
  if (!terrace || !gate) return;
  if (Math.hypot(terrace.x, terrace.z) < HUB_R || Math.hypot(gate.x, gate.z) < HUB_R) return;

  const dx = gate.x - terrace.x;
  const dz = gate.z - terrace.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = terrace.x + dx * t;
    const z = terrace.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < DEN_SKIP) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < DEN_SKIP) continue;
    poses.push({ x, y: MARK_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.BoxGeometry(MARK_W, MARK_H, MARK_D), darkGold(), poses, root);

  counts.n = poses.length;
  root.userData.restgateCount = poses.length;
}
