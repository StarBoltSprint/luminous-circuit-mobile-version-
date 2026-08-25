/** Iri ARCHIVE TABLETS — standing residual-light names at the archive den.
 * Not Iri's leftover-light racks (shelves.ts). Not Nesh's plaza stele (notice.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growTablets(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

/** Leftover gold. Intensity is set per tablet so residual light fades down the row. */
function residualGold(emissiveIntensity: number) {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0xd4a050,
    emissiveIntensity,
    iridescence: 0.5,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

function residualGlow(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0xd4a050,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** World from tablet-local X/Z after yaw (THREE rotation.y). */
function at(cx: number, cz: number, lx: number, lz: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

/** Standing name-tablet. Thin face toward Hub — leftover light, not a shelf plank. */
const TAB_W = 1.2;
const TAB_H = 2.4;
const TAB_D = 0.12;
/** Box center: height 2.4 sits on y=0. */
const TAB_Y = TAB_H * 0.5;
const PITCH = 1.7;
/** In front of the 8-wide archive racks, toward Hub. */
const ROW_Z = -5.4;
const GLOW_W = TAB_W * 0.86;
const GLOW_H = TAB_H * 0.86;
const GLOW_OFF = TAB_D * 0.5 + 0.02;
const HUB_R = 90;
const N_FINE = 4;
const N_COARSE = 2;
/** Residual light that fades along the row — oldest name is already true. */
const FADE_EMI = [0.18, 0.13, 0.09, 0.05];
const FADE_GLOW = [0.16, 0.11, 0.07, 0.04];

export const TABLET_SIZES = {
  w: TAB_W,
  h: TAB_H,
  d: TAB_D,
  y: TAB_Y,
  pitch: PITCH,
  rowZ: ROW_Z,
  nFine: N_FINE,
  nCoarse: N_COARSE,
};

const emptySizes = {
  w: TAB_W,
  h: TAB_H,
  d: TAB_D,
  y: 0,
  pitch: 0,
  rowZ: 0,
  tabletCount: 0,
  glowCount: 0,
};

function nTablets(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Iri's archive tablets at DISTRICTS kind==="archive" x,z. 4 BoxGeometry
 * 1.2×2.4×0.12 (coarse 2) standing in a short row. MeshPhysical gold.
 * Residual face-glow fades down the row. Faces the Hub. Hub skip (r<90).
 * Not shelves. Not a plaza stele.
 */
export function growTablets(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "tablets";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.tabletCount = 0;
  root.userData.glowCount = 0;

  const archive = den("archive");
  if (!archive) return;
  if (Math.hypot(archive.x, archive.z) < HUB_R) return;

  const yaw = Math.atan2(archive.x, archive.z);
  const cx = archive.x;
  const cz = archive.z;
  const n = nTablets(coarse);
  const geo = new THREE.BoxGeometry(TAB_W, TAB_H, TAB_D);
  const glowGeo = new THREE.PlaneGeometry(GLOW_W, GLOW_H);
  let glowCount = 0;

  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) * 0.5) * PITCH;
    const p = at(cx, cz, lx, ROW_Z, yaw);
    const fadeI = n === N_COARSE ? i * 2 : i;
    const tab = new THREE.Mesh(geo, residualGold(FADE_EMI[fadeI] ?? 0.05));
    tab.position.set(p.x, TAB_Y, p.z);
    tab.rotation.y = yaw;
    tab.castShadow = false;
    tab.receiveShadow = true;
    tab.frustumCulled = true;
    tab.renderOrder = 2;
    root.add(tab);

    const g = at(cx, cz, lx, ROW_Z - GLOW_OFF, yaw);
    const glow = new THREE.Mesh(glowGeo, residualGlow(FADE_GLOW[fadeI] ?? 0.04));
    glow.position.set(g.x, TAB_Y, g.z);
    glow.rotation.y = yaw;
    glow.castShadow = false;
    glow.receiveShadow = false;
    glow.frustumCulled = true;
    glow.renderOrder = 3;
    root.add(glow);
    glowCount += 1;
  }

  sizes.y = TAB_Y;
  sizes.pitch = PITCH;
  sizes.rowZ = ROW_Z;
  sizes.tabletCount = n;
  sizes.glowCount = glowCount;
  root.userData.tabletCount = n;
  root.userData.glowCount = glowCount;
}
