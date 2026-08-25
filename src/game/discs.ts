/** Light-disc travel pads. Soft landings at a dock, else Join + Soft Gates.
 * Not world.ts flying octahedra. Not mist veils. No cars.
 * Parent hooks with:
 *   laterOn(() => { try { discs = growDiscs(group, coarse); } catch { } });
 *   // in world.tick(t): try { discs?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function den(kind: string) {
  return DISTRICTS.find((d) => d.kind === kind) ?? null;
}

function padMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x163844,
    roughness: 0.18,
    metalness: 0.42,
    emissive: 0x2ee6ff,
    emissiveIntensity: 0.2,
    iridescence: 0.48,
    iridescenceIOR: 1.32,
    clearcoat: 0.44,
    clearcoatRoughness: 0.24,
    transparent: false,
  });
}

type Pad = {
  mesh: THREE.Mesh;
  speed: number;
  phase: number;
};

/**
 * Civic light-disc travel pads. CylinderGeometry r=5–7 h=0.18.
 * MeshPhysical cyan, emissive 0.2, not blinding.
 * Dock den if any; else market/join AND gate. coarse: 1 disc. fine: 2.
 * tick: slow rotation.y.
 */
export function growDiscs(group: THREE.Group, coarse: boolean): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "discs";
  group.add(root);

  const want = coarse ? 1 : 2;
  const dock = den("dock");
  const market = den("market");
  const gate = den("gate");

  const spots: { x: number; z: number; r: number }[] = [];
  if (dock) {
    for (let i = 0; i < want; i++) {
      const a = i * Math.PI + 0.62;
      const off = want === 1 ? 0 : 18;
      spots.push({
        x: dock.x + Math.cos(a) * off,
        z: dock.z + Math.sin(a) * off,
        r: 5 + (want === 1 ? 1.4 : i === 0 ? 2 : 0.6),
      });
    }
  } else {
    const dens = [market, gate].filter((d): d is NonNullable<typeof d> => !!d);
    for (let i = 0; i < want && i < dens.length; i++) {
      const d = dens[i]!;
      spots.push({
        x: d.x,
        z: d.z,
        r: 5 + (i === 0 ? 2 : 0.8),
      });
    }
  }

  if (!spots.length) return { tick() {} };

  const segs = coarse ? 10 : 16;
  const H = 0.18;
  const geo = new THREE.CylinderGeometry(1, 1, H, segs);
  const mat = padMat();
  const pads: Pad[] = [];

  for (let i = 0; i < spots.length; i++) {
    const s = spots[i]!;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.x, H * 0.5, s.z);
    mesh.scale.set(s.r, 1, s.r);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.renderOrder = 2;
    root.add(mesh);
    pads.push({
      mesh,
      speed: 0.14 + i * 0.04,
      phase: i * 1.17,
    });
  }

  root.userData.discCount = pads.length;

  return {
    tick(t: number) {
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i]!;
        p.mesh.rotation.y = t * p.speed + p.phase;
      }
    },
  };
}
