/** LEAVE-RETURN GOLD PADS on empty ground BETWEEN Soft Gates
 * (520, 480 r=130, Kael) and Outer Howl (40, 920 r=130, Rhoa).
 * Kael's leave-return meeting Rhoa's gather that does not close. No score.
 * The Hub is not the only Howl.
 * Not restgate.ts (terrace↔gate). Not hush.ts (beacon↔gate).
 * Not joinsoft.ts (join↔gate). Not gateswild.ts (gate↔wild).
 * Not fruitdoor.ts (grove↔gate). Not kilndoor.ts (foundry↔gate).
 * Not parentdoor.ts (overlook↔gate). Not choir.ts (terrace↔ring).
 * Not hailchorus.ts (beacon↔ring). Not aimchorus.ts (overlook↔ring).
 * Not gates.ts / veil.ts / lintel.ts (AT gate).
 * Not pads.ts / dais.ts / chorus.ts / staves.ts (AT ring).
 * Parent hooks with:
 *   laterOn(() => { try { growGatering(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leave-return gold — Kael's door meeting Rhoa's gather, never a score, never a close. */
function leaveGold() {
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

/** Leave-return gold pad. Radius 1.5, height 0.2 — a pad, not a score, not a close. */
const PAD_R = 1.5;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of gate→ring. Skip hypot < 138 from
 * gate or < 138 from ring — dens sit far apart, so the band holds
 * the BETWEEN strip. Gate (520, 480) r=130. Ring (40, 920) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_GATE = 138;
const SKIP_RING = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const GATERING_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipGate: SKIP_GATE,
  skipRing: SKIP_RING,
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
 * Leave-return gold pads on empty ground between DISTRICTS gate and ring.
 * 3 CylinderGeometry r=1.5 h=0.2 (coarse 2) MeshPhysical 0x24180c
 * emissive 0xc4a060 intensity 0.18 roughness 0.26 metalness 0.42
 * iridescence 0.4 clearcoat 0.4, evenly t=0.40..0.60 of the
 * gate→ring segment, y=0.11. Skip hypot < 138 from gate or
 * < 138 from ring. Kael's leave-return meeting Rhoa's gather that
 * does not close. No score. The Hub is not the only Howl. No tick.
 */
export function growGatering(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "gatering";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.gateringCounts = counts;
  root.userData.gateringCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const gate = den("gate");
  const ring = den("ring");
  if (!gate || !ring) return;

  const dx = ring.x - gate.x;
  const dz = ring.z - gate.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_GATE + 0.05) / dist;
  const tMax = 1 - (SKIP_RING + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = gate.x + dx * t;
    const z = gate.z + dz * t;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - ring.x, z - ring.z) < SKIP_RING) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), leaveGold(), poses, root);

  counts.n = poses.length;
  root.userData.gateringCount = poses.length;
}
