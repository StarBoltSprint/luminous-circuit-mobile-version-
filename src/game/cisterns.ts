/** Charge wells Seln tends — leftover Howl has a home that is not a pocket.
 * Dark torus lip + cylinder collar. Inner cyan disc y=0.4 opacity 0.3. Not a pool.
 * Parent hooks with:
 *   laterOn(() => { try { growCisterns(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function rimMat(hex: number, emit: number, eInt: number) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    roughness: 0.46,
    metalness: 0.28,
    emissive: emit,
    emissiveIntensity: eInt,
    iridescence: 0.22,
    iridescenceIOR: 1.3,
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    transparent: false,
  });
}

function chargeDisc(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: 0x3aa8c0,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

type Pose = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
};

function stamp(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  poses: Pose[],
  group: THREE.Group,
  order: number,
  shadow: boolean,
) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = shadow;
  mesh.frustumCulled = true;
  mesh.renderOrder = order;
  group.add(mesh);
}

/** Sit the well on the den's inner bank, off the raised pad, toward the Join. */
function bank(d: { x: number; z: number; radius: number }, tx: number, tz: number) {
  const dx = tx - d.x;
  const dz = tz - d.z;
  const len = Math.hypot(dx, dz) || 1;
  const off = Math.min(48, d.radius * 0.38);
  return { x: d.x + (dx / len) * off, z: d.z + (dz / len) * off };
}

/**
 * Charge cisterns. One well at canal den. One at foundry if not coarse.
 * Torus lip + open cylinder collar. Inner cyan disc y=0.4 opacity 0.3.
 * Dark crystal rim — not a swimming pool. Hub skip is implicit (dens sit out).
 */
export function growCisterns(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "cisterns";
  group.add(root);

  const canal = den("canal");
  const foundry = den("foundry");
  const join = den("market");
  const counts = { canal: 0, foundry: 0, total: 0 };
  root.userData.wellCounts = counts;

  if (!canal) return;

  const segs = coarse ? 12 : 22;
  const tubeSeg = coarse ? 5 : 8;
  const RIM_R = 9.6;
  const TUBE = 0.68;
  const WALL_H = 1.22;
  const DISC_R = 8.7;
  const DISC_Y = 0.4;
  const DISC_OP = 0.3;
  const FLAT = Math.PI / 2;

  const wallGeo = new THREE.CylinderGeometry(RIM_R, RIM_R, WALL_H, segs, 1, true);
  const lipGeo = new THREE.TorusGeometry(RIM_R, TUBE, tubeSeg, segs);
  const discGeo = new THREE.CircleGeometry(DISC_R, segs);
  discGeo.rotateX(-Math.PI / 2);

  const cyanRim = rimMat(0x071e28, 0x1a6578, 0.1);
  const goldRim = rimMat(0x2a2214, 0x584028, 0.1);
  const discMat = chargeDisc(DISC_OP);

  const wallCyan: Pose[] = [];
  const lipCyan: Pose[] = [];
  const wallGold: Pose[] = [];
  const lipGold: Pose[] = [];
  const discs: Pose[] = [];

  const aimX = join?.x ?? 0;
  const aimZ = join?.z ?? 0;

  const drop = (
    x: number,
    z: number,
    walls: Pose[],
    lips: Pose[],
  ) => {
    walls.push({
      x,
      y: WALL_H * 0.5,
      z,
      sx: 1,
      sy: 1,
      sz: 1,
      rx: 0,
      ry: 0,
      rz: 0,
    });
    lips.push({
      x,
      y: WALL_H,
      z,
      sx: 1,
      sy: 1,
      sz: 1,
      rx: FLAT,
      ry: 0,
      rz: 0,
    });
    discs.push({
      x,
      y: DISC_Y,
      z,
      sx: 1,
      sy: 1,
      sz: 1,
      rx: 0,
      ry: 0,
      rz: 0,
    });
  };

  const canalAt = bank(canal, aimX, aimZ);
  drop(canalAt.x, canalAt.z, wallCyan, lipCyan);
  counts.canal = 1;

  if (!coarse && foundry) {
    const foundryAt = bank(foundry, aimX, aimZ);
    drop(foundryAt.x, foundryAt.z, wallGold, lipGold);
    counts.foundry = 1;
  }

  counts.total = counts.canal + counts.foundry;

  stamp(wallGeo, cyanRim, wallCyan, root, 2, true);
  stamp(lipGeo, cyanRim, lipCyan, root, 2, true);
  stamp(wallGeo, goldRim, wallGold, root, 2, true);
  stamp(lipGeo, goldRim, lipGold, root, 2, true);
  stamp(discGeo, discMat, discs, root, 1, false);
}
