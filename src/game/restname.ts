/** REST MEETING LEFTOVER LIGHT on empty ground BETWEEN Crystal Terraces
 * (48, 660 r=130, Mira) and Residual Archive (−540, −460 r=120, Iri).
 * Mira's rest meeting Iri's leftover light. Rest is not a test. Leftover light is not Hall.
 * Not fruitname.ts (grove↔archive). Not kilnname.ts (foundry↔archive).
 * Not namehail.ts (archive↔beacon). Not parentname.ts (archive↔overlook).
 * Not namestone.ts (hub↔archive). Not seam.ts (archive↔join).
 * Not residual.ts (archive↔canal). Not restkiln.ts (terrace↔foundry).
 * Not restjoin.ts (terrace↔join). Not restgate.ts (terrace↔gate).
 * Not resthail.ts (terrace↔beacon). Not breathrest.ts (hub↔terrace).
 * Not tendterrace.ts (canal↔terrace). Not choir.ts (terrace↔ring).
 * Not rest.ts / steps.ts (AT terrace). Not tablets.ts / shelves.ts (AT archive).
 * Parent hooks with:
 *   laterOn(() => { try { growRestname(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover-light cyan — rest meeting a name already true, never Hall. */
function residueCyan() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a2230,
    roughness: 0.28,
    metalness: 0.35,
    emissive: 0x3ec8e0,
    emissiveIntensity: 0.2,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.38,
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

/** Cyan name-tablet. 2.2 × 0.18 × 1.1 — a tablet, not a test, not Hall. */
const TAB_W = 2.2;
const TAB_H = 0.18;
const TAB_D = 1.1;
const TAB_Y = 0.1;
/**
 * Asked band t=0.40..0.60 of terrace→archive. Skip hypot < 138 from
 * terrace or < 128 from archive. Terrace (48, 660) r=130. Archive (−540, −460) r=120.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_TERRACE = 138;
const SKIP_ARCHIVE = 128;
const N_FINE = 3;
const N_COARSE = 2;

export const RESTNAME_SIZES = {
  w: TAB_W,
  h: TAB_H,
  d: TAB_D,
  y: TAB_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipTerrace: SKIP_TERRACE,
  skipArchive: SKIP_ARCHIVE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nTabs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, w: TAB_W, h: TAB_H, d: TAB_D, y: TAB_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Leftover-light cyan tablets on empty ground between DISTRICTS terrace and archive.
 * 3 BoxGeometry 2.2×0.18×1.1 (coarse 2) MeshPhysical 0x0a2230
 * emissive 0x3ec8e0 intensity 0.2 roughness 0.28 metalness 0.35
 * iridescence 0.4 clearcoat 0.38, evenly t=0.40..0.60 of the
 * terrace→archive segment, y=0.10. Skip hypot < 138 from terrace or
 * < 128 from archive. Rest is not a test. Leftover light is not Hall. No tick.
 */
export function growRestname(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "restname";
  group.add(root);

  const want = nTabs(coarse);
  const counts = emptyCounts(want);
  root.userData.restnameCounts = counts;
  root.userData.restnameCount = 0;
  root.userData.sizes = {
    w: TAB_W,
    h: TAB_H,
    d: TAB_D,
    y: TAB_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const terrace = den("terrace");
  const archive = den("archive");
  if (!terrace || !archive) return;

  const dx = archive.x - terrace.x;
  const dz = archive.z - terrace.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_TERRACE + 0.05) / dist;
  const tMax = 1 - (SKIP_ARCHIVE + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = terrace.x + dx * t;
    const z = terrace.z + dz * t;
    if (Math.hypot(x - terrace.x, z - terrace.z) < SKIP_TERRACE) continue;
    if (Math.hypot(x - archive.x, z - archive.z) < SKIP_ARCHIVE) continue;
    poses.push({ x, y: TAB_Y, z, rz: 0 });
  }

  stamp(new THREE.BoxGeometry(TAB_W, TAB_H, TAB_D), residueCyan(), poses, root);

  counts.n = poses.length;
  root.userData.restnameCount = poses.length;
}
