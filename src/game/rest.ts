/** Mira TERRACE REST — low sit benches at the Crystal Terraces den.
 * Sit without a trial. Not terrace steps (steps.ts). Not Aure parent-seat (seat.ts).
 * Parent hooks with:
 *   laterOn(() => { try { growRest(group, coarse); } catch { } });
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

type Pose = {
  x: number;
  y: number;
  z: number;
  ry: number;
};

function stamp(geo: THREE.BufferGeometry, material: THREE.Material, poses: Pose[], group: THREE.Group) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, poses.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  poses.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  group.add(mesh);
}

/** Low sit-bench. Width along the sit, depth toward the rest. */
const BENCH_W = 2.8;
const BENCH_H = 0.28;
const BENCH_D = 0.7;
/** Box center: height 0.28 sits on y=0. */
const BENCH_Y = BENCH_H * 0.5;
/** Open horseshoe around the den — gap faces Hub / arriving steps. */
const RING_R = 8;
const SPREAD = 0.72;
const HUB_R = 90;
const N_FINE = 3;
const N_COARSE = 1;

function nBenches(coarse: boolean): number {
  return coarse ? N_COARSE : N_FINE;
}

/**
 * Mira's rest benches at DISTRICTS kind==="terrace" x,z. 3 BoxGeometry
 * 2.8×0.28×0.7 (coarse 1) at the den. MeshPhysical dark gold. Open toward
 * Hub so sit is not a trial. Hub skip (r<90). Not terrace steps. Not Aure seat.
 */
export function growRest(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "rest";
  group.add(root);

  const want = nBenches(coarse);
  const counts = { n: 0, want, y: BENCH_Y, r: RING_R };
  root.userData.benchCounts = counts;
  root.userData.sizes = {
    w: BENCH_W,
    h: BENCH_H,
    d: BENCH_D,
    y: BENCH_Y,
    r: RING_R,
  };

  const terrace = den("terrace");
  if (!terrace) return;
  if (Math.hypot(terrace.x, terrace.z) < HUB_R) return;

  const cx = terrace.x;
  const cz = terrace.z;
  const poses: Pose[] = [];

  if (want === 1) {
    poses.push({
      x: cx,
      y: BENCH_Y,
      z: cz,
      ry: Math.atan2(cx, cz),
    });
  } else {
    const toHub = Math.atan2(-cz, -cx);
    const aMid = toHub + Math.PI;
    for (let i = 0; i < want; i++) {
      const a = aMid + (i - (want - 1) * 0.5) * SPREAD;
      const x = cx + Math.cos(a) * RING_R;
      const z = cz + Math.sin(a) * RING_R;
      if (Math.hypot(x, z) < HUB_R) continue;
      poses.push({
        x,
        y: BENCH_Y,
        z,
        ry: Math.atan2(cx - x, cz - z),
      });
    }
  }

  const geo = new THREE.BoxGeometry(BENCH_W, BENCH_H, BENCH_D);
  stamp(geo, darkGold(), poses, root);
  counts.n = poses.length;
}
