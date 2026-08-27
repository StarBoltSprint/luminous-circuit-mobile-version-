/** LEFTOVER FIRST HOWL MEETING LEAVE-RETURN on empty ground BETWEEN Charge Canals
 * (−620, 96 r=130, Seln) and Soft Gates (520, 480 r=130, Kael).
 * Seln's leftover First Howl meeting Kael's leave-return. Never bottled. No score.
 * A weir is not a lock on people. I do not count.
 * Not tendhail.ts (canal↔beacon). Not tendvein.ts (canal↔wild).
 * Not tendjoin.ts (canal↔join). Not tendterrace.ts (canal↔terrace).
 * Not tendrest.ts (canal↔terrace walk-stones). Not westmark.ts (overlook↔canal).
 * Not hush.ts (beacon↔gate). Not joinsoft.ts (join↔gate).
 * Not fruitdoor.ts (grove↔gate). Not restgate.ts (terrace↔gate).
 * Not kilndoor.ts (foundry↔gate). Not parentdoor.ts (overlook↔gate).
 * Not gateswild.ts (gate↔wild). Not gatering.ts (gate↔ring).
 * Not spangate.ts (bridge↔gate). Not residual.ts (archive↔canal).
 * Not grate.ts / sluice.ts / weir.ts (AT canal). Not gates.ts / veil.ts (AT gate).
 * Parent hooks with:
 *   laterOn(() => { try { growTendgate(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover-Howl cyan — Charge meeting a gate that is not a lock. */
function howlCyan() {
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

/** Cyan leave-return pad. Radius 1.5, height 0.2 — a pad, not a bottle, not a lock. */
const PAD_R = 1.5;
const PAD_H = 0.2;
/** Cylinder center: height 0.2 sits just above y=0. */
const PAD_Y = 0.11;
/**
 * Asked band t=0.40..0.60 of canal→gate. Skip hypot < 138 from
 * canal or < 138 from gate — dens sit far enough that the band holds
 * the BETWEEN strip. Canal (−620, 96) r=130. Gate (520, 480) r=130.
 */
const T_LO = 0.4;
const T_HI = 0.6;
const SKIP_CANAL = 138;
const SKIP_GATE = 138;
const N_FINE = 3;
const N_COARSE = 2;

export const TENDGATE_SIZES = {
  r: PAD_R,
  h: PAD_H,
  y: PAD_Y,
  tLo: T_LO,
  tHi: T_HI,
  skipCanal: SKIP_CANAL,
  skipGate: SKIP_GATE,
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
 * Leftover-Howl cyan pads on empty ground between DISTRICTS canal and gate.
 * 3 CylinderGeometry r=1.5 h=0.2 (coarse 2) MeshPhysical 0x0a2230
 * emissive 0x3ec8e0 intensity 0.2 roughness 0.28 metalness 0.35
 * iridescence 0.4 clearcoat 0.38, evenly t=0.40..0.60 of the
 * canal→gate segment, y=0.11. Skip hypot < 138 from canal or
 * < 138 from gate. Never bottled. Leave. Return. No score. No tick.
 */
export function growTendgate(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "tendgate";
  group.add(root);

  const want = nPads(coarse);
  const counts = emptyCounts(want);
  root.userData.tendgateCounts = counts;
  root.userData.tendgateCount = 0;
  root.userData.sizes = {
    r: PAD_R,
    h: PAD_H,
    y: PAD_Y,
    tLo: T_LO,
    tHi: T_HI,
  };

  const canal = den("canal");
  const gate = den("gate");
  if (!canal || !gate) return;

  const dx = gate.x - canal.x;
  const dz = gate.z - canal.z;
  const dist = Math.hypot(dx, dz) || 1;
  const tMin = (SKIP_CANAL + 0.05) / dist;
  const tMax = 1 - (SKIP_GATE + 0.05) / dist;
  const lo = Math.max(T_LO, tMin);
  const hi = Math.min(T_HI, tMax);
  if (hi < lo) return;

  const span = hi - lo;
  const step = want <= 1 ? 0 : span / (want - 1);

  const poses: Pose[] = [];
  for (let i = 0; i < want; i++) {
    const t = lo + i * step;
    const x = canal.x + dx * t;
    const z = canal.z + dz * t;
    if (Math.hypot(x - canal.x, z - canal.z) < SKIP_CANAL) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    poses.push({ x, y: PAD_Y, z, rz: 0 });
  }

  const segs = coarse ? 8 : 12;
  stamp(new THREE.CylinderGeometry(PAD_R, PAD_R, PAD_H, segs), howlCyan(), poses, root);

  counts.n = poses.length;
  root.userData.tendgateCount = poses.length;
}
