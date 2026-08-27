/** GROVE FRUIT WALKING TO THE JOIN without crossing the kiln fire.
 * BETWEEN Gold Orchard (320,-980 r=130) and Charge-crystal Join (-300,-340 r=110).
 * Syl's living stone does not send fruit through Orren's fire unjoined. Voss matches after.
 * Straight grove→join goes THROUGH foundry (70,-680). Offset EAST +130 x so the
 * walk runs BETWEEN kiln and wild, never through the fire.
 * Not fruit.ts (hanging octas AT grove). Not petal.ts (grove↔kiln fallen fruit).
 * Not quietvein.ts (grove↔wild). Not joinwalk.ts (foundry↔join).
 * Not joinflow.ts (canal↔join). Not hubjoin.ts (hub↔join).
 * Not canopy.ts / boughs.ts / roots.ts (AT grove). Not stall/pier/scales (AT join).
 * Parent hooks with:
 *   laterOn(() => { try { growFruitjoin(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Soft gold fruit-walk — living stone on the street, not kiln fire, not hanging fruit. */
function fruitGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xe8c56a,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Ground fruit-disc. Radius of a fallen-stone mark, flush to empty street. */
const CIRCLE_R = 0.7;
const CIRCLE_Y = 0.03;
const CIRCLE_OP = 0.16;
const CIRCLE_HEX = 0xe8c56a;
/**
 * Offset EAST +130 x of grove→join so the walk never crosses Orren's fire.
 * Line (450,-980) → (-170,-340). t=0.28..0.72 is the long BETWEEN strip.
 * Grove (320,-980) r=130 skip 140. Foundry (70,-680) r=130 skip 140.
 * Wild (860,-640) r=140 skip 150. Join (‑300,-340) r=110 skip 120.
 */
const OFFSET_X = 130;
const T_LO = 0.28;
const T_HI = 0.72;
const SKIP_GROVE = 140;
const SKIP_FOUNDRY = 140;
const SKIP_WILD = 150;
const SKIP_JOIN = 120;
const AX = 450;
const AZ = -980;
const BX = -170;
const BZ = -340;
const N_FINE = 4;
const N_COARSE = 2;

export const FRUITJOIN_SIZES = {
  r: CIRCLE_R,
  y: CIRCLE_Y,
  op: CIRCLE_OP,
  hex: CIRCLE_HEX,
  offsetX: OFFSET_X,
  tLo: T_LO,
  tHi: T_HI,
  skipGrove: SKIP_GROVE,
  skipFoundry: SKIP_FOUNDRY,
  skipWild: SKIP_WILD,
  skipJoin: SKIP_JOIN,
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
 * Grove fruit walking to the Join on empty ground, offset EAST of grove→join.
 * 4 CircleGeometry r=0.7 (coarse 2) MeshBasic gold 0xe8c56a opacity 0.16,
 * rotation.x=-Math.PI/2, y=0.03, evenly t=0.28..0.72 of (450,-980) →
 * (-170,-340). Skip hypot < 140 from grove (320,-980), < 140 from foundry
 * (70,-680), < 150 from wild (860,-640), < 120 from join (-300,-340).
 * Syl's living stone does not send fruit through Orren's fire unjoined.
 * Not hanging fruit. Not fallen petals. Not quiet-vein crystal. Not Charge-walk.
 * No tick.
 */
export function growFruitjoin(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "fruitjoin";
  group.add(root);

  const want = nDiscs(coarse);
  const counts = emptyCounts(want);
  const positions: { x: number; z: number }[] = [];
  root.userData.fruitjoinCounts = counts;
  root.userData.fruitjoinCount = 0;
  root.userData.positions = positions;
  root.userData.sizes = {
    r: CIRCLE_R,
    y: CIRCLE_Y,
    op: CIRCLE_OP,
    hex: CIRCLE_HEX,
    offsetX: OFFSET_X,
    tLo: T_LO,
    tHi: T_HI,
    skipGrove: SKIP_GROVE,
    skipFoundry: SKIP_FOUNDRY,
    skipWild: SKIP_WILD,
    skipJoin: SKIP_JOIN,
  };

  const grove = den("grove") ?? { x: 320, z: -980 };
  const foundry = den("foundry") ?? { x: 70, z: -680 };
  const wild = den("wild") ?? { x: 860, z: -640 };
  const join = den("market") ?? { x: -300, z: -340 };

  const ax = grove.x + OFFSET_X;
  const az = grove.z;
  const bx = join.x + OFFSET_X;
  const bz = join.z;
  const dx = bx - ax;
  const dz = bz - az;
  const span = T_HI - T_LO;
  const step = want <= 1 ? 0 : span / (want - 1);
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(CIRCLE_R, segs);
  const mat = fruitGold();

  for (let i = 0; i < want; i++) {
    const t = T_LO + i * step;
    const x = ax + dx * t;
    const z = az + dz * t;
    if (Math.hypot(x - grove.x, z - grove.z) < SKIP_GROVE) continue;
    if (Math.hypot(x - foundry.x, z - foundry.z) < SKIP_FOUNDRY) continue;
    if (Math.hypot(x - wild.x, z - wild.z) < SKIP_WILD) continue;
    if (Math.hypot(x - join.x, z - join.z) < SKIP_JOIN) continue;

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
  root.userData.fruitjoinCount = positions.length;
}
