/** Voss JOIN SCALES — Charge and crystal meet here, not coin.
 * One balance at the market/Join den. Not stall (stall.ts). Not pier (pier.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growScales(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function goldJoin() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.18,
    metalness: 0.52,
    emissive: 0xd4a050,
    emissiveIntensity: 0.22,
    iridescence: 0.48,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

function goldCharge() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.46,
    emissive: 0x1a6578,
    emissiveIntensity: 0.18,
    iridescence: 0.44,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function goldCrystal() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a2c16,
    roughness: 0.16,
    metalness: 0.5,
    emissive: 0xd4a050,
    emissiveIntensity: 0.2,
    iridescence: 0.56,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

/** Thin beam 2.2×0.08×0.08. Pans sit on the ends. */
const BEAM_L = 2.2;
const BEAM_T = 0.08;
const BEAM_Y = 1.4;
const PAN_R = 0.55;
const PAN_H = 0.08;
/** Pan centers at beam ends. */
const PAN_OFF = BEAM_L * 0.5;
const POST_R = 0.07;
const POST_H = BEAM_Y;
/**
 * Along the Charge sheet through the Join, inner bank — not pier SIDE=12
 * (perp), not stall PIER_OFF=22 (perp toward Voss). Clears market light-disc r=7.
 */
const JOIN_OFF = 16;
const HUB_R = 90;

export const SCALES_SIZES = {
  beamL: BEAM_L,
  beamT: BEAM_T,
  y: BEAM_Y,
  panR: PAN_R,
  panH: PAN_H,
  panOff: PAN_OFF,
  postR: POST_R,
  postH: POST_H,
  offset: JOIN_OFF,
};

const emptySizes = {
  beamL: BEAM_L,
  beamT: BEAM_T,
  y: 0,
  panR: PAN_R,
  panH: PAN_H,
  panOff: PAN_OFF,
  postR: 0,
  postH: 0,
  offset: 0,
  scaleCount: 0,
  panCount: 0,
  beamCount: 0,
  postCount: 0,
  x: 0,
  z: 0,
};

/**
 * One Voss Join-scale at DISTRICTS kind==="market" x,z. BoxGeometry beam
 * 2.2×0.08×0.08 at y=1.4, MeshPhysical gold. Two CylinderGeometry pans
 * r=0.55 h=0.08 on the beam (Charge pan + crystal pan — not coin).
 * Thin fulcrum post. coarse: skip one pan. Not stall. Not pier.
 */
export function growScales(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "scales";
  group.add(root);

  const sizes = { ...emptySizes };
  root.userData.sizes = sizes;
  root.userData.scaleCount = 0;
  root.userData.panCount = 0;

  const market = den("market");
  if (!market) return;
  if (Math.hypot(market.x, market.z) < HUB_R) return;

  const canal = den("canal");
  const foundry = den("foundry");
  const dx = (canal?.x ?? market.x - 1) - market.x;
  const dz = (canal?.z ?? market.z) - market.z;
  const span = Math.hypot(dx, dz) || 1;
  const alongX = dx / span;
  const alongZ = dz / span;
  /** Inner Join, opposite the canal water — unique from pier bank and stall. */
  const cx = market.x - alongX * JOIN_OFF;
  const cz = market.z - alongZ * JOIN_OFF;
  /** Beam length along Charge (canal) ↔ crystal (foundry) meet. */
  const fx = (foundry?.x ?? market.x + 1) - market.x;
  const fz = (foundry?.z ?? market.z) - market.z;
  const meetX = fx - dx;
  const meetZ = fz - dz;
  const meetLen = Math.hypot(meetX, meetZ) || 1;
  const yaw = Math.atan2(-meetZ / meetLen, meetX / meetLen);

  const gold = goldJoin();
  const segs = coarse ? 8 : 12;

  const rig = new THREE.Group();
  rig.position.set(cx, 0, cz);
  rig.rotation.y = yaw;
  root.add(rig);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(POST_R * 0.85, POST_R, POST_H, segs),
    gold,
  );
  post.position.set(0, POST_H * 0.5, 0);
  post.castShadow = false;
  post.receiveShadow = true;
  post.frustumCulled = true;
  rig.add(post);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(BEAM_L, BEAM_T, BEAM_T), gold);
  beam.position.set(0, BEAM_Y, 0);
  beam.castShadow = false;
  beam.receiveShadow = true;
  beam.frustumCulled = true;
  rig.add(beam);

  const panY = BEAM_Y + BEAM_T * 0.5 + PAN_H * 0.5;
  const panGeo = new THREE.CylinderGeometry(PAN_R, PAN_R, PAN_H, segs);

  /** Charge pan — leftover Howl, canal-ward (−X). Always present. */
  const chargePan = new THREE.Mesh(panGeo, goldCharge());
  chargePan.position.set(-PAN_OFF, panY, 0);
  chargePan.castShadow = false;
  chargePan.receiveShadow = true;
  chargePan.frustumCulled = true;
  rig.add(chargePan);

  let panCount = 1;
  if (!coarse) {
    /** Crystal pan — Foundry body, kiln-ward (+X). coarse skips this pan. */
    const crystalPan = new THREE.Mesh(panGeo, goldCrystal());
    crystalPan.position.set(PAN_OFF, panY, 0);
    crystalPan.castShadow = false;
    crystalPan.receiveShadow = true;
    crystalPan.frustumCulled = true;
    rig.add(crystalPan);
    panCount = 2;
  }

  sizes.y = BEAM_Y;
  sizes.postR = POST_R;
  sizes.postH = POST_H;
  sizes.offset = JOIN_OFF;
  sizes.scaleCount = 1;
  sizes.panCount = panCount;
  sizes.beamCount = 1;
  sizes.postCount = 1;
  sizes.x = cx;
  sizes.z = cz;
  root.userData.scaleCount = 1;
  root.userData.panCount = panCount;
  root.userData.beamCount = 1;
}
