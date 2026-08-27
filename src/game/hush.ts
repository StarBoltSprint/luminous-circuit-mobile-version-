/** SOFT HAIL PATH — first landing hailed, never locked, on empty ground BETWEEN dens.
 * High Beacon (780, 620 r=120) → Soft Gates (520, 480 r=130). The SEAM only.
 * Not Lumen's hail column (beam.ts). Not Kael posts (gates.ts). Not gate veil (veil.ts).
 * Not way-cairns (cairn.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growHush(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function pathGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function hailCyan() {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: false,
  });
}

/** Ground hail-mark. A landing, not a lock. */
const CIRCLE_R = 0.95;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.2;
const CIRCLE_HEX = 0xc4a060;
/** Leftover First Howl at the true midpoint. Skip on coarse. */
const OCTA_S = 0.28;
const OCTA_Y = 0.28;
const OCTA_OP = 0.35;
const OCTA_HEX = 0x3aa8c0;
/**
 * Empty middle of beacon→gate. Both dens' radii almost meet (120+130 vs ~295).
 * t=0.42..0.58 is the seam only — not inside either floor.
 * Beacon (780, 620) r=120. Gate (520, 480) r=130.
 */
const T_LO = 0.42;
const T_HI = 0.58;
const BEACON_SKIP = 128;
const GATE_SKIP = 138;
const N_FINE = 4;
const N_COARSE = 2;

function nMarks(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Soft hail path on empty ground between DISTRICTS beacon and gate.
 * 4 CircleGeometry r=0.95 (coarse 2) MeshBasic gold 0xc4a060 opacity 0.2,
 * rotation.x=-PI/2, y=0.03, evenly t=0.42..0.58 of beacon→gate.
 * Skip hypot < 128 from beacon or < 138 from gate.
 * Fine: 1 OctahedronGeometry MeshBasic cyan 0x3aa8c0 opacity 0.35 scale 0.28
 * at the true midpoint if that point survives skip. Skip octa on coarse.
 * First landing is hailed, never locked. No tick.
 */
export function growHush(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hush";
  group.add(root);

  const want = nMarks(coarse);
  let planted = 0;
  root.userData.hushCount = 0;
  root.userData.want = want;
  root.userData.octaCount = 0;

  const beacon = den("beacon");
  const gate = den("gate");
  if (!beacon || !gate) return;

  const dx = gate.x - beacon.x;
  const dz = gate.z - beacon.z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = pathGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = beacon.x + dx * t;
    const z = beacon.z + dz * t;
    if (Math.hypot(x - beacon.x, z - beacon.z) < BEACON_SKIP) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < GATE_SKIP) continue;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, CIRCLE_Y, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    root.add(mesh);
    planted += 1;
  }

  if (!coarse) {
    const mx = beacon.x + dx * 0.5;
    const mz = beacon.z + dz * 0.5;
    if (
      Math.hypot(mx - beacon.x, mz - beacon.z) >= BEACON_SKIP &&
      Math.hypot(mx - gate.x, mz - gate.z) >= GATE_SKIP
    ) {
      const octa = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), hailCyan());
      octa.position.set(mx, OCTA_Y, mz);
      octa.scale.setScalar(OCTA_S);
      octa.castShadow = false;
      octa.receiveShadow = false;
      octa.frustumCulled = true;
      octa.renderOrder = 2;
      root.add(octa);
      planted += 1;
      root.userData.octaCount = 1;
    }
  }

  root.userData.hushCount = planted;
}
