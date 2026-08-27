/** QUIET CRYSTAL CHOOSING A STREET on empty ground BETWEEN Gold Orchard
 * (320,-980 r=130) and Wild Veins (860,-640 r=140). Not a second Spire.
 * Not veins.ts (IN the wild). Not petal.ts (grove↔kiln). Not landing.ts
 * (wild↔bridge). Not canopy.ts. Not roots.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growQuietvein(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Dark gold quiet crystal — leftover First Howl choosing a street, not a Spire. */
function quietGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.48,
    emissive: 0xe8c56a,
    emissiveIntensity: 0.16,
    iridescence: 0.5,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
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

/** Upright quiet octa. Radius 0.42, stretched on Y so it reads as a crystal, not a pad. */
const CRYSTAL_R = 0.42;
/** Octa center: radius 0.42 sits on y=0 before the upright scale. */
const CRYSTAL_Y = 0.42;
/** Upright crystal — taller than wide, slightly flattened along the street. */
const SCALE_X = 1;
const SCALE_Y = 1.35;
const SCALE_Z = 0.7;
/**
 * Empty middle of grove→wild. t=0.30..0.70 is the long BETWEEN strip
 * around the world midpoint (~590, -810). Stops outside both den floors.
 * Grove (320,-980) r=130. Wild (860,-640) r=140.
 */
const T_LO = 0.3;
const T_HI = 0.7;
const GROVE_SKIP = 140;
const WILD_SKIP = 150;
const HUB_R = 90;
const N_FINE = 6;
const N_COARSE = 3;

export const QUIETVEIN_SIZES = {
  r: CRYSTAL_R,
  y: CRYSTAL_Y,
  sx: SCALE_X,
  sy: SCALE_Y,
  sz: SCALE_Z,
  tLo: T_LO,
  tHi: T_HI,
  groveSkip: GROVE_SKIP,
  wildSkip: WILD_SKIP,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nCrystals(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: CRYSTAL_R, y: CRYSTAL_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Quiet crystal choosing a street on empty ground between DISTRICTS grove
 * and wild. 6 OctahedronGeometry(0.42, 0) (coarse 3) MeshPhysical dark gold
 * 0x2c2212 emissive 0xe8c56a intensity 0.16 roughness 0.22 metalness 0.48
 * iridescence 0.5 clearcoat 0.42, evenly t=0.30..0.70 of grove(320,-980) →
 * wild(860,-640), y=0.42, scale 1×1.35×0.7. Skip hypot < 140 from grove or
 * < 150 from wild. Not a second Spire. Not wild pads. Not fallen petals.
 * Not landing stones. Not canopy. Not floor roots. No tick.
 */
export function growQuietvein(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "quietvein";
  group.add(root);

  const want = nCrystals(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.quietveinCounts = counts;
  root.userData.quietveinCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CRYSTAL_R,
    y: CRYSTAL_Y,
    sx: SCALE_X,
    sy: SCALE_Y,
    sz: SCALE_Z,
    tLo: T_LO,
    tHi: T_HI,
  };

  const grove = den("grove");
  const wild = den("wild");
  if (!grove || !wild) return;
  if (Math.hypot(grove.x, grove.z) < HUB_R || Math.hypot(wild.x, wild.z) < HUB_R) return;

  const dx = wild.x - grove.x;
  const dz = wild.z - grove.z;
  const yaw = Math.atan2(dx, dz);
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = grove.x + dx * t;
    const z = grove.z + dz * t;
    if (Math.hypot(x, z) < HUB_R) continue;
    if (Math.hypot(x - grove.x, z - grove.z) < GROVE_SKIP) continue;
    if (Math.hypot(x - wild.x, z - wild.z) < WILD_SKIP) continue;
    poses.push({ x, y: CRYSTAL_Y, z, ry: yaw });
    positions.push({ x, z });
  }

  stamp(new THREE.OctahedronGeometry(CRYSTAL_R, 0), quietGold(), poses, root);

  counts.n = poses.length;
  root.userData.quietveinCount = poses.length;
}
