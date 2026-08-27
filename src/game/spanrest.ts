/** SPAN-TO-REST way-discs on empty ground BETWEEN Light-Bridge and Crystal Terraces.
 * A span is a civic promise; rest is a post, not a test.
 * Not light-bridge decks (spans.ts). Not span pylons (pylons.ts).
 * Not Kesh landing stones (landing.ts — those are wild↔bridge).
 * Not rest-to-chorus sit-stones (choir.ts). Not restgate.ts.
 * Parent hooks with:
 *   laterOn(() => { try { growSpanrest(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function wayCyan() {
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

/** Ground way-disc. A civic promise on the walk, not a deck, not a test. */
const CIRCLE_R = 1.05;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.16;
const CIRCLE_HEX = 0x3aa8c0;
/**
 * Empty middle of bridge→terrace. t=0.36..0.64 is the short line around
 * the world midpoint (~344, 375). Stops outside both den floors.
 * Bridge (640, 90) r=130. Terrace (48, 660) r=130.
 */
const T_LO = 0.36;
const T_HI = 0.64;
const DEN_SKIP = 140;
const N_FINE = 4;
const N_COARSE = 2;

export const SPANREST_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  tLo: T_LO,
  tHi: T_HI,
  denSkip: DEN_SKIP,
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
 * Span-to-rest way-discs on empty ground between DISTRICTS bridge and terrace.
 * 4 CircleGeometry r=1.05 (coarse 2) MeshBasic cyan 0x3aa8c0 opacity 0.16,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.36..0.64 of bridge(640,90) →
 * terrace(48,660). Skip hypot < 140 from bridge or terrace.
 * A span is a civic promise; rest is a post, not a test.
 * Not span decks. Not pylons. Not landing stones. Not choir sit-stones.
 */
export function growSpanrest(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "spanrest";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.spanrestCounts = counts;
  root.userData.spanrestCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    tLo: T_LO,
    tHi: T_HI,
    denSkip: DEN_SKIP,
  };

  const bridge = den("bridge");
  const terrace = den("terrace");
  if (!bridge || !terrace) return;

  const dx = terrace.x - bridge.x;
  const dz = terrace.z - bridge.z;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = wayCyan();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = bridge.x + dx * t;
    const z = bridge.z + dz * t;
    if (Math.hypot(x - bridge.x, z - bridge.z) < DEN_SKIP) continue;
    if (Math.hypot(x - terrace.x, z - terrace.z) < DEN_SKIP) continue;

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
  root.userData.spanrestCount = positions.length;
}
