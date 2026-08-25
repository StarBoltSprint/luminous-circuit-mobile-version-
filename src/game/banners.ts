/** Civic BANNERS — thin gold/violet cloth hanging from posts at Hub plaza, Join, Gate.
 * Not photos. Not flags of nations. Civic crystal hang, not a shop SKU.
 * Parent hooks with:
 *   laterOn(() => { try { banners = growBanners(group, coarse); } catch { } });
 *   // in world.tick(t): try { banners?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS, HUB } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function darkPost() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a140c,
    roughness: 0.42,
    metalness: 0.34,
    emissive: 0x3a2c16,
    emissiveIntensity: 0.08,
    iridescence: 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    transparent: false,
  });
}

function goldCloth() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.22,
    metalness: 0.46,
    emissive: 0x5a4020,
    emissiveIntensity: 0.16,
    iridescence: 0.52,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.44,
    clearcoatRoughness: 0.26,
    transparent: false,
    side: THREE.DoubleSide,
  });
}

function violetCloth() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x141022,
    roughness: 0.2,
    metalness: 0.38,
    emissive: 0x322456,
    emissiveIntensity: 0.14,
    iridescence: 0.56,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.46,
    clearcoatRoughness: 0.24,
    transparent: false,
    side: THREE.DoubleSide,
  });
}

/** Thin civic cloth. BoxGeometry 0.08×3.6×1.4 — thickness, hang, face. */
const BANNER_T = 0.08;
const BANNER_H = 3.6;
const BANNER_W = 1.4;
const POST_H = 5.2;
const POST_R = 0.11;
const ARM_L = 0.86;
const ARM_T = 0.08;
const ARM_D = 0.12;
/** Hang pivot sits just under the arm. */
const HANG_Y = POST_H - ARM_T;
const BANNER_Y = HANG_Y - BANNER_H * 0.5;
/** Plaza apron — off fountain 0,0, off Nesh notice/lens. Join-ward. */
const PLAZA_R = Math.min(72, Math.max(64, HUB.radius + 16));
const JOIN_IN = 38;
const GATE_SIDE = 16;
const SWAY = 0.04;
const SWAY_SPEED = 0.82;
const N_FINE = 3;
const N_COARSE = 1;

const SIZES = {
  t: BANNER_T,
  h: BANNER_H,
  w: BANNER_W,
  postH: POST_H,
  postR: POST_R,
  armL: ARM_L,
  hangY: HANG_Y,
  bannerY: BANNER_Y,
  plazaR: PLAZA_R,
  sway: SWAY,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

type Site = {
  x: number;
  z: number;
  yaw: number;
  violet: boolean;
};

type Sway = {
  hang: THREE.Group;
  phase: number;
  speed: number;
};

function nBanners(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

function siteHub(): Site {
  const join = den("market");
  const gx = join?.x ?? -300;
  const gz = join?.z ?? -340;
  const len = Math.hypot(gx, gz) || 1;
  const x = (gx / len) * PLAZA_R;
  const z = (gz / len) * PLAZA_R;
  return { x, z, yaw: Math.atan2(x, z), violet: false };
}

function siteJoin(): Site | null {
  const market = den("market");
  if (!market) return null;
  if (Math.hypot(market.x, market.z) < 90) return null;
  const len = Math.hypot(market.x, market.z) || 1;
  const x = market.x - (market.x / len) * JOIN_IN;
  const z = market.z - (market.z / len) * JOIN_IN;
  return { x, z, yaw: Math.atan2(x, z), violet: false };
}

function siteGate(): Site | null {
  const gate = den("gate");
  if (!gate) return null;
  if (Math.hypot(gate.x, gate.z) < 90) return null;
  const yaw = Math.atan2(gate.x, gate.z);
  const x = gate.x + GATE_SIDE * Math.cos(yaw);
  const z = gate.z - GATE_SIDE * Math.sin(yaw);
  return { x, z, yaw, violet: true };
}

function stampBanner(
  site: Site,
  i: number,
  geos: { post: THREE.BufferGeometry; arm: THREE.BufferGeometry; cloth: THREE.BufferGeometry },
  postMat: THREE.Material,
  gold: THREE.Material,
  violet: THREE.Material,
  root: THREE.Group,
  swayers: Sway[],
) {
  const rig = new THREE.Group();
  rig.position.set(site.x, 0, site.z);
  rig.rotation.y = site.yaw;
  root.add(rig);

  const post = new THREE.Mesh(geos.post, postMat);
  post.position.set(0, POST_H * 0.5, 0);
  post.castShadow = false;
  post.receiveShadow = true;
  post.frustumCulled = true;
  post.renderOrder = 2;
  rig.add(post);

  const arm = new THREE.Mesh(geos.arm, postMat);
  arm.position.set(ARM_L * 0.5, POST_H - ARM_T * 0.5, 0);
  arm.castShadow = false;
  arm.receiveShadow = true;
  arm.frustumCulled = true;
  arm.renderOrder = 2;
  rig.add(arm);

  const hang = new THREE.Group();
  hang.position.set(ARM_L, HANG_Y, 0);
  rig.add(hang);

  const cloth = new THREE.Mesh(geos.cloth, site.violet ? violet : gold);
  cloth.position.set(BANNER_T * 0.5, -BANNER_H * 0.5, 0);
  cloth.castShadow = false;
  cloth.receiveShadow = true;
  cloth.frustumCulled = true;
  cloth.renderOrder = 2;
  hang.add(cloth);

  swayers.push({
    hang,
    phase: i * 1.37,
    speed: SWAY_SPEED + i * 0.11,
  });
}

/**
 * Civic banners at Hub plaza, Join, and Gate dens. 3 BoxGeometry 0.08×3.6×1.4
 * (coarse 1 — plaza only) hanging from CylinderGeometry posts. MeshPhysical
 * gold/violet cloth. tick: hang rotation.y sway ±0.04. Not photos. Not nations.
 */
export function growBanners(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "banners";
  group.add(root);

  const want = nBanners(coarse);
  const counts = { n: 0, posts: 0, want, sway: SWAY };
  root.userData.bannerCount = 0;
  root.userData.postCount = 0;
  root.userData.sizes = {
    t: SIZES.t,
    h: SIZES.h,
    w: SIZES.w,
    postH: SIZES.postH,
    postR: SIZES.postR,
    armL: SIZES.armL,
    hangY: SIZES.hangY,
    bannerY: SIZES.bannerY,
    plazaR: SIZES.plazaR,
    sway: SIZES.sway,
    nFine: SIZES.nFine,
    nCoarse: SIZES.nCoarse,
    segs: coarse ? 6 : 8,
  };

  const sites: Site[] = [siteHub()];
  if (want > 1) {
    const join = siteJoin();
    if (join) sites.push(join);
    const gate = siteGate();
    if (gate) sites.push(gate);
  }
  const placed = sites.slice(0, want);
  if (!placed.length) {
    root.userData.bannerCounts = counts;
    return { tick() {} };
  }

  const segs = coarse ? 6 : 8;
  const geos = {
    post: new THREE.CylinderGeometry(POST_R, POST_R, POST_H, segs),
    arm: new THREE.BoxGeometry(ARM_L, ARM_T, ARM_D),
    cloth: new THREE.BoxGeometry(BANNER_T, BANNER_H, BANNER_W),
  };
  const postMat = darkPost();
  const gold = goldCloth();
  const violet = violetCloth();
  const swayers: Sway[] = [];

  for (let i = 0; i < placed.length; i++) {
    stampBanner(placed[i]!, i, geos, postMat, gold, violet, root, swayers);
  }

  counts.n = swayers.length;
  counts.posts = swayers.length;
  root.userData.bannerCount = counts.n;
  root.userData.postCount = counts.posts;
  root.userData.bannerCounts = counts;

  return {
    tick(t: number) {
      for (let i = 0; i < swayers.length; i++) {
        const s = swayers[i]!;
        s.hang.rotation.y = Math.sin(t * s.speed + s.phase) * SWAY;
      }
    },
  };
}

export { SIZES as BANNER_SIZES };
