/** HUB-TO-OVERLOOK AIM DISCS on empty ground BETWEEN Hub and Star-core Overlook.
 * The city aimed at the parent. Do not move it.
 * Not westmark.ts (overlook↔canal sticks). Not seat.ts (AT overlook).
 * Not cairn.ts (other mids). Not glow/limb sky.
 * Parent hooks with:
 *   laterOn(() => { try { growHubaim(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft gold aim — a look-disc on the walk, not a seat, not a stick. */
function aimGold() {
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

/** Ground aim-disc. Radius of a look-mark, flush to empty street. */
const CIRCLE_R = 0.9;
const CIRCLE_Y = 0.04;
const CIRCLE_OP = 0.2;
const CIRCLE_HEX = 0xc4a060;
/**
 * Empty middle of hub(0,0) → overlook(−880, 220). t=0.22..0.72 is the
 * long BETWEEN strip. Hub civic floor skip r<90. Overlook r=140 skip 148.
 * Canal (−620, 96) skip 140 so we do not sit on Seln.
 */
const T_LO = 0.22;
const T_HI = 0.72;
const SKIP_HUB = 90;
const SKIP_OVERLOOK = 148;
const SKIP_CANAL = 140;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const HUBAIM_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipHub: SKIP_HUB,
  skipOverlook: SKIP_OVERLOOK,
  skipCanal: SKIP_CANAL,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

function nDiscs(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function emptyCounts(want: number) {
  return { n: 0, want, r: CIRCLE_R, y: CIRCLE_Y, tLo: T_LO, tHi: T_HI };
}

/**
 * Hub-to-overlook aim discs on empty ground hub(0,0) → DISTRICTS overlook.
 * 4 CircleGeometry r=0.9 (coarse 2) MeshBasic gold 0xc4a060 opacity 0.2,
 * rotation.x=-Math.PI/2, y=0.04, evenly t=0.22..0.72 of hub(0,0) →
 * overlook(−880,220). Skip hypot < 90 from hub, < 148 from overlook, AND
 * < 140 from canal (−620,96) so we do not sit on Seln.
 * The city aimed at the parent. Not westmark sticks. Not parent-seat.
 * Not way-cairns. Not glow/limb sky. No tick.
 */
export function growHubaim(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "hubaim";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.hubaimCounts = counts;
  root.userData.hubaimCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipHub: SKIP_HUB,
    skipOverlook: SKIP_OVERLOOK,
    skipCanal: SKIP_CANAL,
  };

  const overlook = den("overlook") ?? { x: -880, z: 220 };
  const canal = den("canal") ?? { x: -620, z: 96 };

  const dx = overlook.x - HUB_X;
  const dz = overlook.z - HUB_Z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = aimGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = HUB_X + dx * t;
    const z = HUB_Z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;
    if (Math.hypot(x - overlook.x, z - overlook.z) < SKIP_OVERLOOK) continue;
    if (Math.hypot(x - canal.x, z - canal.z) < SKIP_CANAL) continue;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, CIRCLE_Y, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    root.add(mesh);
    positions.push({ x, z });
  }

  counts.n = positions.length;
  root.userData.hubaimCount = positions.length;
}
