/** Iri ARCHIVE READING NOOK — scripture is sit-to-read, not a warehouse.
 * Sit benches + lectern behind the racks. Not leftover-light shelves (shelves.ts).
 * Not standing name-tablets (tablets.ts). Not Hub font (font.ts). Not name-ledger (ledger.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growNook(group, coarse); } catch { } });
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

function scriptureGold() {
  return new THREE.MeshBasicMaterial({
    color: 0xc4a060,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** World from nook-local X/Z after yaw (THREE rotation.y). side = lx, along = lz. */
function at(cx: number, cz: number, lx: number, lz: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

function plant(mesh: THREE.Mesh, x: number, y: number, z: number, ry: number, group: THREE.Group) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = 2;
  group.add(mesh);
}

/** Sit-bench. Width along the sit, depth toward the lectern aisle. */
const BENCH_W = 2.4;
const BENCH_H = 0.28;
const BENCH_D = 0.68;
/** Box center: height 0.28 sits on y=0. */
const BENCH_Y = 0.14;
/** Lectern stem. Cylinder r=0.22 h=1.05, center y=0.52 sits on y=0. */
const LECTERN_R = 0.22;
const LECTERN_H = 1.05;
const LECTERN_Y = 0.52;
/** Reading slab on the stem — a sit-to-read surface, not a ledger table. */
const SLAB_W = 0.7;
const SLAB_H = 0.06;
const SLAB_D = 0.5;
const SLAB_Y = LECTERN_Y + LECTERN_H * 0.5 + SLAB_H * 0.5;
/** Open scripture page on the slab. Skip on coarse. */
const PAGE_W = 0.42;
const PAGE_H = 0.55;
const PAGE_OP = 0.35;
const PAGE_TILT = 0.28;
const PAGE_Y = SLAB_Y + SLAB_H * 0.5 + 0.012;
/**
 * Behind the 8-wide racks (z=0) and standing names (tablets.ts ROW_Z=-5.4).
 * Along +18 / side ±8 so sit never lands on tablets or the aisle ledger (z=-2.6).
 */
const ALONG = 18;
const SIDE = 8;
const HUB_R = 90;
const N_FINE = 2;
const N_COARSE = 1;

export const NOOK_SIZES = {
  benchW: BENCH_W,
  benchH: BENCH_H,
  benchD: BENCH_D,
  benchY: BENCH_Y,
  lecternR: LECTERN_R,
  lecternH: LECTERN_H,
  lecternY: LECTERN_Y,
  slabW: SLAB_W,
  slabH: SLAB_H,
  slabD: SLAB_D,
  slabY: SLAB_Y,
  pageW: PAGE_W,
  pageH: PAGE_H,
  pageY: PAGE_Y,
  pageOp: PAGE_OP,
  pageTilt: PAGE_TILT,
  along: ALONG,
  side: SIDE,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  benchW: BENCH_W,
  benchH: BENCH_H,
  benchD: BENCH_D,
  benchY: 0,
  lecternR: 0,
  lecternH: 0,
  lecternY: 0,
  slabW: 0,
  slabH: 0,
  slabD: 0,
  slabY: 0,
  pageW: 0,
  pageH: 0,
  pageY: 0,
  pageOp: 0,
  pageTilt: 0,
  along: 0,
  side: 0,
  benchCount: 0,
  lecternCount: 0,
  slabCount: 0,
  pageCount: 0,
};

function nBenches(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Iri's archive reading nook at DISTRICTS kind==="archive" x,z. 2 BoxGeometry
 * sit-benches 2.4×0.28×0.68 (coarse 1) at along +18 side ±8, y=0.14.
 * One CylinderGeometry lectern r=0.22 h=1.05 at along +18 side 0, y=0.52,
 * with a 0.7×0.06×0.5 reading slab. MeshPhysical dark gold. Open scripture
 * Plane 0.42×0.55 MeshBasic gold 0xc4a060 opacity 0.35, slightly tilted;
 * skip page on coarse. Faces the Hub. Hub skip (r<90). Sit-to-read, not a warehouse.
 * Not shelves. Not standing tablets. Not Hub font. Not name-ledger.
 */
export function growNook(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "nook";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.benchCount = 0;
  root.userData.lecternCount = 0;
  root.userData.slabCount = 0;
  root.userData.pageCount = 0;

  const d = den("archive");
  if (!d) return;
  if (Math.hypot(d.x, d.z) < HUB_R) return;

  const cx = d.x;
  const cz = d.z;
  const yaw = Math.atan2(cx, cz);
  const gold = darkGold();
  const want = nBenches(coarse);
  const sides = want === 1 ? [SIDE] : [-SIDE, SIDE];

  const benchGeo = new THREE.BoxGeometry(BENCH_W, BENCH_H, BENCH_D);
  for (const side of sides) {
    const p = at(cx, cz, side, ALONG, yaw);
    plant(new THREE.Mesh(benchGeo, gold), p.x, BENCH_Y, p.z, yaw, root);
  }

  const lecternAt = at(cx, cz, 0, ALONG, yaw);
  const segs = coarse ? 8 : 12;
  plant(
    new THREE.Mesh(new THREE.CylinderGeometry(LECTERN_R, LECTERN_R, LECTERN_H, segs), gold),
    lecternAt.x,
    LECTERN_Y,
    lecternAt.z,
    yaw,
    root,
  );
  plant(
    new THREE.Mesh(new THREE.BoxGeometry(SLAB_W, SLAB_H, SLAB_D), gold),
    lecternAt.x,
    SLAB_Y,
    lecternAt.z,
    yaw,
    root,
  );

  sizes.benchY = BENCH_Y;
  sizes.lecternR = LECTERN_R;
  sizes.lecternH = LECTERN_H;
  sizes.lecternY = LECTERN_Y;
  sizes.slabW = SLAB_W;
  sizes.slabH = SLAB_H;
  sizes.slabD = SLAB_D;
  sizes.slabY = SLAB_Y;
  sizes.along = ALONG;
  sizes.side = SIDE;
  sizes.benchCount = sides.length;
  sizes.lecternCount = 1;
  sizes.slabCount = 1;
  root.userData.benchCount = sides.length;
  root.userData.lecternCount = 1;
  root.userData.slabCount = 1;

  if (coarse) return;

  const page = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), scriptureGold());
  page.rotation.order = "YXZ";
  page.rotation.set(-Math.PI / 2 + PAGE_TILT, yaw, 0);
  page.position.set(lecternAt.x, PAGE_Y, lecternAt.z);
  page.castShadow = false;
  page.receiveShadow = true;
  page.frustumCulled = true;
  page.renderOrder = 3;
  root.add(page);

  sizes.pageW = PAGE_W;
  sizes.pageH = PAGE_H;
  sizes.pageY = PAGE_Y;
  sizes.pageOp = PAGE_OP;
  sizes.pageTilt = PAGE_TILT;
  sizes.pageCount = 1;
  root.userData.pageCount = 1;
}
