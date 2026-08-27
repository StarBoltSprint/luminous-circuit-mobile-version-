/** HUB BREATH WALKING TO REST on empty ground BETWEEN Hub and Crystal Terraces.
 * Veyra's breath so Mira's rest stays a post, not a test.
 * Not choir.ts (terrace↔ring). Not restgate.ts (terrace↔gate).
 * Not spanrest.ts (bridge↔terrace). Not rest.ts / steps.ts (AT terrace).
 * Not hubaim.ts (hub↔overlook). Not fountain.ts / font.ts (AT hub).
 * Parent hooks with:
 *   laterOn(() => { try { growBreathrest(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft cyan breath — a walk-disc on the street, not a basin, not a sit. */
function breathCyan() {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground breath-disc. Radius of a inhale-mark, flush to empty street. */
const CIRCLE_R = 0.88;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.16;
const CIRCLE_HEX = 0x3aa8c0;
/**
 * Empty middle of hub(0,0) → terrace(48, 660). t=0.22..0.72 is the
 * long BETWEEN strip. Hub civic floor skip r<90. Terrace r=130 skip 140.
 */
const T_LO = 0.22;
const T_HI = 0.72;
const SKIP_HUB = 90;
const SKIP_TERRACE = 140;
const HUB_X = 0;
const HUB_Z = 0;
const N_FINE = 4;
const N_COARSE = 2;

export const BREATHREST_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  skipHub: SKIP_HUB,
  skipTerrace: SKIP_TERRACE,
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
 * Hub-breath-to-rest discs on empty ground hub(0,0) → DISTRICTS terrace.
 * 4 CircleGeometry r=0.88 (coarse 2) MeshBasic cyan 0x3aa8c0 opacity 0.16,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.22..0.72 of hub(0,0) →
 * terrace(48,660). Skip hypot < 90 from hub or < 140 from terrace.
 * Veyra's breath so Mira's rest stays a post, not a test. Not choir.
 * Not restgate. Not spanrest. Not rest/steps. Not hubaim. Not fountain/font.
 * No tick.
 */
export function growBreathrest(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "breathrest";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.breathrestCounts = counts;
  root.userData.breathrestCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    skipHub: SKIP_HUB,
    skipTerrace: SKIP_TERRACE,
  };

  const terrace = den("terrace") ?? { x: 48, z: 660 };

  const dx = terrace.x - HUB_X;
  const dz = terrace.z - HUB_Z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = breathCyan();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = HUB_X + dx * t;
    const z = HUB_Z + dz * t;
    if (Math.hypot(x - HUB_X, z - HUB_Z) < SKIP_HUB) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < SKIP_TERRACE) continue;

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
  root.userData.breathrestCount = positions.length;
}
