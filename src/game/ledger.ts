/** Iri NAME LEDGER — low writing table at the Residual Archive den.
 * Crystal remembers here. Not leftover-light racks (shelves.ts).
 * Not standing name-tablets (tablets.ts). Not Nesh's plaza stele (notice.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growLedger(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.24,
    metalness: 0.48,
    emissive: 0x5a4020,
    emissiveIntensity: 0.14,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function tabletGold() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0xd4a050,
    emissiveIntensity: 0.16,
    iridescence: 0.5,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

/** World from ledger-local X/Z after yaw (THREE rotation.y). */
function at(cx: number, cz: number, lx: number, lz: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

/** Low writing table. Crystal remembers on this slab, not a shelf plank. */
const TABLE_W = 2.4;
const TABLE_H = 0.12;
const TABLE_D = 1.1;
/** Box center: height 0.12 sits near y=0.9. */
const TABLE_Y = 0.9;
/** Thin name-tablet lying on the table — not a standing 1.2×2.4×0.12. */
const TAB_W = 0.7;
const TAB_H = 0.04;
const TAB_D = 1.0;
const TAB_Y = TABLE_Y + TABLE_H * 0.5 + TAB_H * 0.5;
/**
 * Aisle toward Hub: not the 8-wide racks at z=0, not standing names at ROW_Z=-5.4.
 */
const AISLE_Z = -2.6;
const HUB_R = 90;

export const LEDGER_SIZES = {
  w: TABLE_W,
  h: TABLE_H,
  d: TABLE_D,
  y: TABLE_Y,
  tabletW: TAB_W,
  tabletH: TAB_H,
  tabletD: TAB_D,
  tabletY: TAB_Y,
  aisleZ: AISLE_Z,
};

const emptySizes = {
  w: TABLE_W,
  h: TABLE_H,
  d: TABLE_D,
  y: 0,
  tabletW: 0,
  tabletH: 0,
  tabletD: 0,
  tabletY: 0,
  aisleZ: 0,
  ledgerCount: 0,
  tabletCount: 0,
};

/**
 * One Iri name-ledger at DISTRICTS kind==="archive" x,z. BoxGeometry
 * 2.4×0.12×1.1 at y=0.9, MeshPhysical dark gold. One thin tablet
 * 0.7×0.04×1.0 on top (crystal remembers here). coarse: skip the top tablet.
 * Faces the Hub. Hub skip (r<90). Not shelves. Not standing tablets. Not a stele.
 */
export function growLedger(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "ledger";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.ledgerCount = 0;
  root.userData.tabletCount = 0;

  const archive = den("archive");
  if (!archive) return;
  if (Math.hypot(archive.x, archive.z) < HUB_R) return;

  const cx = archive.x;
  const cz = archive.z;
  const yaw = Math.atan2(cx, cz);
  const p = at(cx, cz, 0, AISLE_Z, yaw);

  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, TABLE_H, TABLE_D), darkGold());
  table.position.set(p.x, TABLE_Y, p.z);
  table.rotation.y = yaw;
  table.castShadow = false;
  table.receiveShadow = true;
  table.frustumCulled = true;
  table.renderOrder = 2;
  root.add(table);

  sizes.y = TABLE_Y;
  sizes.aisleZ = AISLE_Z;
  sizes.ledgerCount = 1;
  root.userData.ledgerCount = 1;

  if (!coarse) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(TAB_W, TAB_H, TAB_D), tabletGold());
    tab.position.set(p.x, TAB_Y, p.z);
    tab.rotation.y = yaw;
    tab.castShadow = false;
    tab.receiveShadow = true;
    tab.frustumCulled = true;
    tab.renderOrder = 2;
    root.add(tab);

    sizes.tabletW = TAB_W;
    sizes.tabletH = TAB_H;
    sizes.tabletD = TAB_D;
    sizes.tabletY = TAB_Y;
    sizes.tabletCount = 1;
    root.userData.tabletCount = 1;
  }
}
