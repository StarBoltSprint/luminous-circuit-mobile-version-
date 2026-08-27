/** GOLD FRUIT DISCS on empty ground BETWEEN Gold Orchard and Light-Bridge.
 * Quiet crystal paper meeting a civic span — not a kiln, never a toll.
 * Syl's fruit so Tal's crossing can land.
 * Not fruit.ts (hanging octas AT grove). Not petal.ts (grove↔kiln).
 * Not fruitjoin.ts (grove↔join). Not fruitdoor.ts (grove↔gate).
 * Not quietvein.ts (grove↔wild). Not kilnspan.ts (foundry↔bridge).
 * Not landing.ts (wild↔bridge). Not spans/pylons (AT bridge).
 * Not canopy.ts / boughs.ts / roots.ts (AT grove).
 * Parent hooks with:
 *   laterOn(() => { try { growFruitspan(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Quiet crystal paper — Syl's fruit so Tal's crossing can land. Not a kiln. Never a toll. */
function fruitGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2a2210,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0xc4a060,
    emissiveIntensity: 0.2,
    iridescence: 0.42,
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

/** Gold fruit disc. Radius 1.5, height 0.18 — a street paper, not a kiln, not a toll. */
const DISC_R = 1.5;
const DISC_H = 0.18;
/** Cylinder center: height 0.18 sits just above y=0. */
const DISC_Y = 0.1;
/**
 * Asked band t=0.40..0.60 of grove→bridge. Skip hypot < 138 from grove
 * or < 138 from bridge. Grove (320, −980) r=130. Bridge (640, 90) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_GROVE = 138;
const SKIP_BRIDGE = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const FRUITSPAN_SIZES = {
  r: DISC_R,
  h: DISC_H,
  y: DISC_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipGrove: SKIP_GROVE,
  skipBridge: SKIP_BRIDGE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nDiscs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: DISC_R, h: DISC_H, y: DISC_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Gold fruit discs on empty ground between DISTRICTS grove and bridge.
 * 3 CylinderGeometry r=1.5 h=0.18 (coarse 2) MeshPhysical dark gold 0x2a2210
 * emissive 0xc4a060 intensity 0.2 roughness 0.24 metalness 0.48
 * iridescence 0.42 clearcoat 0.4, evenly t=0.40..0.60 of the
 * grove→bridge segment, y=0.1. Skip hypot < 138 from grove or < 138 from bridge.
 * Quiet crystal paper meeting a civic span — not a kiln, never a toll.
 * Syl's fruit so Tal's crossing can land. No tick.
 */
export function growFruitspan(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "fruitspan";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  root.userData.fruitspanCounts = counts;
  root.userData.fruitspanCount = 0;
  root.userData.sizes = {
    r: DISC_R,
    h: DISC_H,
    y: DISC_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const grove = den("grove");
  const bridge = den("bridge");
  if (!grove || !bridge) return;

  const dx = bridge.x - grove.x;
  const dz = bridge.z - grove.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_GROVE + 0.05) / dist;
  const tMax = 1 - (SKIP_BRIDGE + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = grove.x + dx * t;
    const z = grove.z + dz * t;
    if (Math.hypot(x - grove.x, z - grove.z) < SKIP_GROVE) continue;
    if (Math.hypot(x - bridge.x, z - bridge.z) < SKIP_BRIDGE) continue;
    poses.push({ x, y: DISC_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, segs), fruitGold(), poses, root);

  counts.n = poses.length;
  root.userData.fruitspanCount = poses.length;
}
