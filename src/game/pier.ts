/** JOIN/MARKET dock pier — Voss's low walkway on the Charge water at the Join.
 * Not light-discs (discs.ts). Not canal-bank rails (rails.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growPier(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function crystal(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.4,
    metalness: 0.32,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.28,
    iridescenceIOR: 1.3,
    clearcoat: 0.22,
    clearcoatRoughness: 0.46,
    transparent: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  group.add(mesh);
}

/** Walkway box 18×0.3×6. Length along Z after yaw. */
const WALK_L = 18;
const WALK_H = 0.3;
const WALK_W = 6;
/** Deck center — low, just above canal water (y=0.78). */
const WALK_Y = 0.96;
/** Bank offset beside the Charge sheet that runs through the Join. */
const SIDE = 12;
const PILE_N = 4;
const PILE_R_TOP = 0.34;
const PILE_R_BOT = 0.44;
const PILE_IN_L = 6.4;
const PILE_IN_W = 1.9;

const SIZES = {
  walk: { l: WALK_L, h: WALK_H, w: WALK_W, y: WALK_Y },
  pile: { rTop: PILE_R_TOP, rBot: PILE_R_BOT, n: PILE_N, y0: 0, inL: PILE_IN_L, inW: PILE_IN_W },
  side: SIDE,
};

/**
 * One low dark-gold/cyan box walkway at the market den, beside the Charge water.
 * 18×0.3×6. Fine: 4 cylinder piles from deck into y=0. coarse: skip piles.
 */
export function growPier(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "pier";
  group.add(root);

  const market = den("market");
  const counts = { walk: 0, piles: 0 };
  root.userData.pierCounts = counts;
  root.userData.sizes = {
    walk: { ...SIZES.walk },
    pile: { rTop: SIZES.pile.rTop, rBot: SIZES.pile.rBot, n: 0, h: 0, y0: 0 },
    side: SIZES.side,
  };

  if (!market) return;
  if (Math.hypot(market.x, market.z) < 90) return;

  const canal = den("canal");
  const foundry = den("foundry");
  const aim = canal ?? foundry;
  const dx = aim ? market.x - (canal ? canal.x : aim.x) : 1;
  const dz = aim ? market.z - (canal ? canal.z : aim.z) : 0;
  const span = Math.hypot(dx, dz) || 1;
  const ux = dx / span;
  const uz = dz / span;
  const px = -uz;
  const pz = ux;
  const yaw = Math.atan2(ux, uz);

  const cx = market.x + px * SIDE;
  const cz = market.z + pz * SIDE;

  const walkGeo = new THREE.BoxGeometry(WALK_W, WALK_H, WALK_L);
  const walk = new THREE.Mesh(walkGeo, crystal(0x2a2214, 0x1a6578, 0.16));
  walk.position.set(cx, WALK_Y, cz);
  walk.rotation.y = yaw;
  walk.castShadow = false;
  walk.receiveShadow = true;
  walk.frustumCulled = true;
  root.add(walk);
  counts.walk = 1;

  const pileH = WALK_Y;
  root.userData.sizes.walk = { l: WALK_L, h: WALK_H, w: WALK_W, y: WALK_Y };
  root.userData.sizes.pile = {
    rTop: PILE_R_TOP,
    rBot: PILE_R_BOT,
    n: coarse ? 0 : PILE_N,
    h: coarse ? 0 : pileH,
    y0: 0,
  };

  if (coarse) return;

  const piles: Pose[] = [];
  const along = [-PILE_IN_L, PILE_IN_L];
  const across = [-PILE_IN_W, PILE_IN_W];
  for (let a = 0; a < along.length; a++) {
    for (let b = 0; b < across.length; b++) {
      piles.push({
        x: cx + ux * along[a]! + px * across[b]!,
        y: pileH * 0.5,
        z: cz + uz * along[a]! + pz * across[b]!,
        sx: 1,
        sy: 1,
        sz: 1,
        ry: yaw,
      });
    }
  }

  const segs = 8;
  const pileGeo = new THREE.CylinderGeometry(PILE_R_TOP, PILE_R_BOT, pileH, segs);
  stamp(pileGeo, crystal(0x071e28, 0x5a4020, 0.12), piles, root);
  counts.piles = piles.length;
}
