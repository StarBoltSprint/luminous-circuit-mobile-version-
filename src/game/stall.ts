/** Voss JOIN stall — paper table at the Charge-crystal Join. Not a shop SKU.
 * Parent hooks with:
 *   laterOn(() => { try { growStall(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { CITIZENS, DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function vossFeet() {
  const voss = CITIZENS.find((c) => c.id === "voss");
  return { vx: voss?.x ?? -288, vz: voss?.z ?? -328 };
}

function goldPaper() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.28,
    metalness: 0.42,
    emissive: 0x584028,
    emissiveIntensity: 0.14,
    iridescence: 0.42,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.4,
    clearcoatRoughness: 0.28,
    transparent: false,
  });
}

function goldLamp() {
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

const TABLE_W = 6;
const TABLE_H = 0.4;
const TABLE_D = 3;
const TABLE_Y = 1.1;
const PIER_OFF = 22;
const POST_H = 3.6;
const POST_R0 = 0.14;
const POST_R1 = 0.1;
const BULB_R = 0.32;
const LAMP_GAP = 0.38;

/**
 * One paper Join stall. BoxGeometry 6×0.4×3 at y=1.1 on the market den,
 * offset from the canal pier (water through the Join). MeshPhysical gold.
 * Gold lamp post beside the table. coarse: table only.
 * Voss's paper join — not a shop SKU, not the 10×4×8 market canopy.
 */
export function growStall(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "stall";
  group.add(root);

  const market = den("market");
  if (!market) {
    root.userData.stallCount = 0;
    root.userData.sizes = {
      w: TABLE_W,
      h: TABLE_H,
      d: TABLE_D,
      y: TABLE_Y,
      postH: 0,
      postR: 0,
      bulbR: 0,
      offset: 0,
    };
    return;
  }

  const canal = den("canal");
  const voss = vossFeet();
  const pierX = (canal?.x ?? market.x + 1) - market.x;
  const pierZ = (canal?.z ?? market.z) - market.z;
  const pierLen = Math.hypot(pierX, pierZ) || 1;
  const alongX = pierX / pierLen;
  const alongZ = pierZ / pierLen;
  const px = -alongZ;
  const pz = alongX;
  const toVossX = voss.vx - market.x;
  const toVossZ = voss.vz - market.z;
  const side = px * toVossX + pz * toVossZ >= 0 ? 1 : -1;
  const x = market.x + px * side * PIER_OFF;
  const z = market.z + pz * side * PIER_OFF;
  const yaw = Math.atan2(x - market.x, z - market.z);

  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, TABLE_H, TABLE_D), goldPaper());
  table.position.set(x, TABLE_Y, z);
  table.rotation.y = yaw;
  table.castShadow = false;
  table.receiveShadow = true;
  table.frustumCulled = true;
  root.add(table);

  if (!coarse) {
    const segs = 8;
    const lampX = x + alongX * (TABLE_W * 0.5 + LAMP_GAP);
    const lampZ = z + alongZ * (TABLE_W * 0.5 + LAMP_GAP);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(POST_R1, POST_R0, POST_H, segs),
      goldLamp(),
    );
    post.position.set(lampX, POST_H * 0.5, lampZ);
    post.castShadow = false;
    post.receiveShadow = true;
    post.frustumCulled = true;
    root.add(post);

    const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(BULB_R, 0), goldLamp());
    bulb.position.set(lampX, POST_H + BULB_R * 0.45, lampZ);
    bulb.castShadow = false;
    bulb.receiveShadow = true;
    bulb.frustumCulled = true;
    root.add(bulb);
  }

  root.userData.stallCount = 1;
  root.userData.sizes = {
    w: TABLE_W,
    h: TABLE_H,
    d: TABLE_D,
    y: TABLE_Y,
    postH: coarse ? 0 : POST_H,
    postR: coarse ? 0 : POST_R0,
    bulbR: coarse ? 0 : BULB_R,
    offset: PIER_OFF,
  };
}
