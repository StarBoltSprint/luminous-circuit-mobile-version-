/** REST-WARD GOLD PADS on empty ground BETWEEN Crystal Terraces
 * (48, 660 r=130, Mira) and Outer Foundry (70, −680 r=130, Orren).
 * Rest meeting kiln — Mira's post is not a test, Orren's body is never chrome.
 * Empty ground between rest and fire. Not a kiln in the terrace. Not rest in the foundry.
 * Not rest.ts / steps.ts / posts.ts (AT terrace). Not breathrest.ts (hub↔terrace).
 * Not tendrest.ts (canal↔terrace). Not choir.ts (terrace↔ring).
 * Not restgate.ts (terrace↔gate). Not spanrest.ts (bridge↔terrace).
 * Not resthail.ts (terrace↔beacon). Not anvil.ts / heat.ts / smoke.ts /
 * chimney.ts / hearth.ts / forge.ts (AT foundry). Not kilnspan.ts (foundry↔bridge).
 * Not kilndoor.ts (foundry↔gate). Not kilnwild.ts (foundry↔wild).
 * Not joinwalk.ts (foundry↔join). Not petal.ts (grove↔kiln).
 * Parent hooks with:
 *   laterOn(() => { try { growRestkiln(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Rest-ward gold — Mira's rest meeting Orren's kiln on empty ground, never chrome. */
function wardGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x24180c,
    roughness: 0.26,
    metalness: 0.42,
    emissive: 0xc4a060,
    emissiveIntensity: 0.18,
    iridescence: 0.4,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.4,
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

/** Rest-ward gold pad. Radius 1.7, height 0.2 — a pad, not a kiln, not a sit. */
const PAD_R = 1.7;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of terrace→foundry. Skip hypot < 138 from
 * terrace or < 138 from foundry — dens sit far apart, so the band holds
 * the BETWEEN strip. Terrace (48, 660) r=130. Foundry (70, −680) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_TERRACE = 138;
const SKIP_FOUNDRY = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const RESTKILN_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipTerrace: SKIP_TERRACE,
  skipFoundry: SKIP_FOUNDRY,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nPads(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: PAD_R, h: PAD_H, y: PAD_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Rest-ward gold pads on empty ground between DISTRICTS terrace and foundry.
 * 3 CylinderGeometry r=1.7 h=0.2 (coarse 2) MeshPhysical 0x24180c
 * emissive 0xc4a060 intensity 0.18 roughness 0.26 metalness 0.42
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * terrace→foundry segment, y=0.11. Skip hypot < 138 from terrace or
 * < 138 from foundry. Rest meeting kiln — Mira's post is not a test,
 * Orren's body is never chrome. Empty ground between rest and fire.
 * Not a kiln in the terrace. Not rest in the foundry. No tick.
 */
export function growRestkiln(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "restkiln";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.restkilnCounts = counts;
  root.userData.restkilnCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const terrace = den("terrace");
  const foundry = den("foundry");
  if (!terrace || !foundry) return;

  const dx = foundry.x - terrace.x;
  const dz = foundry.z - terrace.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_TERRACE + 0.05) / dist;
  const tMax = 1 - (SKIP_FOUNDRY + 0.05) / dist;
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
    if (Math.hypot(x - foundry.x, z - foundry.z) < SKIP_FOUNDRY) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), wardGold(), poses, root);

  counts.n = poses.length;
  root.userData.restkilnCount = poses.length;
}
