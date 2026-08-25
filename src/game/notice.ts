/** Plaza notice stele — Nesh's stone. Tall thin box at the Hub plaza. Not an archive tablet.
 * Parent hooks with:
 *   laterOn(() => { try { growNotice(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { CITIZENS, HUB } from "./lore";

function neshAim() {
  const nesh = CITIZENS.find((c) => c.id === "nesh");
  const nx = nesh?.x ?? -24;
  const nz = nesh?.z ?? 128;
  const len = Math.hypot(nx, nz) || 1;
  return { nx: nx / len, nz: nz / len };
}

function goldViolet() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x2c2212,
    roughness: 0.22,
    metalness: 0.46,
    emissive: 0x322456,
    emissiveIntensity: 0.14,
    iridescence: 0.48,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [90, 360],
    clearcoat: 0.42,
    clearcoatRoughness: 0.26,
    transparent: false,
  });
}

function violetLens() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x141022,
    roughness: 0.16,
    metalness: 0.4,
    emissive: 0x5a4020,
    emissiveIntensity: 0.16,
    iridescence: 0.58,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [80, 340],
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    transparent: false,
  });
}

const STELE_W = 1.2;
const STELE_H = 8;
const STELE_D = 0.4;
const PLAZA_Y = 3.1;
const LENS_R = 0.48;
const LENS_TUBE = 0.07;

/**
 * One plaza notice stele. BoxGeometry 1.2×8×0.4 on the Hub plaza apron,
 * MeshPhysical gold/violet. Small torus lens disc on top. coarse: skip lens.
 * Nesh's stone — not Iri's archive tablet.
 */
export function growNotice(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "notice";
  group.add(root);

  const aim = neshAim();
  const R = Math.min(96, Math.max(74, HUB.radius + 36));
  const x = aim.nx * R;
  const z = aim.nz * R;
  const yaw = Math.atan2(x, z);

  const stele = new THREE.Mesh(new THREE.BoxGeometry(STELE_W, STELE_H, STELE_D), goldViolet());
  stele.position.set(x, PLAZA_Y + STELE_H * 0.5, z);
  stele.rotation.y = yaw;
  stele.castShadow = false;
  stele.receiveShadow = true;
  stele.frustumCulled = true;
  root.add(stele);

  if (!coarse) {
    const segs = 16;
    const lens = new THREE.Mesh(
      new THREE.TorusGeometry(LENS_R, LENS_TUBE, 8, segs),
      violetLens(),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, PLAZA_Y + STELE_H + LENS_TUBE, z);
    lens.castShadow = false;
    lens.receiveShadow = true;
    lens.frustumCulled = true;
    root.add(lens);
  }

  root.userData.steleCount = 1;
  root.userData.sizes = {
    w: STELE_W,
    h: STELE_H,
    d: STELE_D,
    plazaY: PLAZA_Y,
    r: R,
    lensR: coarse ? 0 : LENS_R,
    lensTube: coarse ? 0 : LENS_TUBE,
  };
}
