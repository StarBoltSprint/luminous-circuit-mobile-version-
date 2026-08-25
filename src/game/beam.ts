/** High Beacon hail column — Lumen's vertical light. Not kiln heat, not canal sheets.
 * Parent hooks with:
 *   laterOn(() => { try { beam = growBeam(group, coarse); } catch { } });
 *   // in world.tick(t): try { beam?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: (typeof DISTRICTS)[number]["kind"]) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function addMat(hex: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: hex,
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

/**
 * Lumen's High Beacon light column at DISTRICTS kind==="beacon" x,z.
 * CylinderGeometry r=0.7 h=48, y origin 24. MeshBasic additive gold opacity 0.16.
 * coarse: r=0.5 h=36. tick: opacity 0.12–0.22 via dummy scale.y 0.95–1.05.
 * Not blinding.
 */
export function growBeam(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "beam";
  group.add(root);

  const beacon = den("beacon");
  if (!beacon) return { tick() {} };

  const r = coarse ? 0.5 : 0.7;
  const h = coarse ? 36 : 48;
  const y0 = h * 0.5;
  const segs = coarse ? 8 : 12;

  const geo = new THREE.CylinderGeometry(r, r, h, segs, 1, true);
  const mat = addMat(0xd4a050, 0.16);
  const mesh = new THREE.InstancedMesh(geo, mat, 1);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.renderOrder = 4;

  const dummy = new THREE.Object3D();
  dummy.position.set(beacon.x, y0, beacon.z);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(0, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);

  return {
    tick(t: number) {
      const u = (Math.sin(t * 1.15) + 1) * 0.5;
      dummy.scale.y = 0.95 + u * 0.1;
      dummy.updateMatrix();
      mesh.setMatrixAt(0, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
      mat.opacity = 0.12 + u * 0.1;
    },
  };
}
