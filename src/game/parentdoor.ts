/** PARENT-AIM WALKING TO THE SOFT GATE on empty ground BETWEEN
 * Star-core Overlook (−880,220 r=140) and Soft Gates (520,480 r=130).
 * Aure keeps the city aimed; Kael keeps the door uncounted.
 * Do not move the parent. Leave. Return. No score.
 * Not hubaim.ts (hub↔overlook). Not westmark.ts (overlook↔canal).
 * Not parentname.ts (archive↔overlook). Not aimchorus.ts (overlook↔ring).
 * Not restgate.ts (terrace↔gate). Not hush.ts (beacon↔gate).
 * Not joinsoft.ts (join↔gate). Not gateswild.ts (gate↔wild).
 * Not seat.ts (AT overlook). Not gates/veil (AT gate).
 * Parent hooks with:
 *   laterOn(() => { try { growParentdoor(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft gold parent-aim — Aure's look walking to Kael's uncounted door. */
function aimGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground aim-disc. Radius of a look-mark, flush to empty street. */
const CIRCLE_R = 0.76;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.17;
const CIRCLE_HEX = 0xc4a060;
/**
 * Empty middle of overlook(−880,220) → gate(520,480). t=0.26..0.74 is the
 * long BETWEEN strip. Overlook r=140 skip 148. Gate r=130 skip 140.
 * Hub civic floor skip r<90 so aim never sits on Veyra's breath.
 * Terrace (48,660) skip 140 so we do not sit on Mira.
 * Canal (−620,96) skip 140 so we do not sit on Seln.
 */
const T_LO = 0.26;
const T_HI = 0.74;
const SKIP_OVERLOOK = 148;
const SKIP_GATE = 140;
const SKIP_HUB = 90;
const SKIP_TERRACE = 140;
const SKIP_CANAL = 140;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const PARENTDOOR_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipOverlook: SKIP_OVERLOOK,
  skipGate: SKIP_GATE,
  skipHub: SKIP_HUB,
  skipTerrace: SKIP_TERRACE,
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
 * Parent-aim walking to the soft gate on empty ground DISTRICTS overlook → gate.
 * 4 CircleGeometry r=0.76 (coarse 2) MeshBasic gold 0xc4a060 opacity 0.17,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.26..0.74 of overlook(−880,220) →
 * gate(520,480). Skip hypot < 148 from overlook or < 140 from gate.
 * Also skip hypot < 90 from hub (0,0), < 140 from terrace (48,660),
 * < 140 from canal (−620,96). Aure keeps the city aimed; Kael keeps the
 * door uncounted. Do not move the parent. Leave. Return. No score.
 * Not hubaim. Not westmark. Not parentname. Not aimchorus. Not restgate.
 * Not hush. Not joinsoft. Not gateswild. Not seat. Not gates/veil. No tick.
 */
export function growParentdoor(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "parentdoor";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.parentdoorCounts = counts;
  root.userData.parentdoorCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipOverlook: SKIP_OVERLOOK,
    skipGate: SKIP_GATE,
    skipHub: SKIP_HUB,
    skipTerrace: SKIP_TERRACE,
    skipCanal: SKIP_CANAL,
  };

  const overlook = den("overlook") ?? { x: -880, z: 220 };
  const gate = den("gate") ?? { x: 520, z: 480 };
  const terrace = den("terrace") ?? { x: 48, z: 660 };
  const canal = den("canal") ?? { x: -620, z: 96 };

  const dx = gate.x - overlook.x;
  const dz = gate.z - overlook.z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = aimGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = overlook.x + dx * t;
    const z = overlook.z + dz * t;
    if (Math.hypot(x - overlook.x, z - overlook.z) < SKIP_OVERLOOK) continue;
    if (Math.hypot(x - gate.x, z - gate.z) < SKIP_GATE) continue;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < SKIP_TERRACE) continue;
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
  root.userData.parentdoorCount = positions.length;
}
