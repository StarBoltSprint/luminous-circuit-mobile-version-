/** SKY SHEEN — unused vault texture written on the dome.
 * sky-veil.jpg additive BackSide sphere inside atmos sky. Leftover First Howl
 * as gold / cyan / violet rivers on the vault. Not atmos vertex-color sky,
 * not aurora veils, not vault dusk discs.
 * Parent hooks with:
 *   laterOn(() => { try { sheen = growSheen(group, coarse); } catch { } });
 *   // in world.tick(t): try { sheen?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { SKY_R } from "./atmos";

const SHEEN_R = SKY_R * 0.98;
const SHEEN_OP = 0.34;
const SHEEN_OP_COARSE = 0.22;
const PULSE = 0.11;
const TEX = `${import.meta.env.BASE_URL}luminous-circuit/sky-veil.jpg`.replace(/\/{2,}/g, "/");

function loadVeil() {
  const map = new THREE.TextureLoader().load(TEX);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.repeat.set(1.15, 1);
  map.anisotropy = 4;
  return map;
}

export const SHEEN_SIZES = {
  r: SHEEN_R,
  op: SHEEN_OP,
};

/**
 * Inner vault sheen. Black in the map stays night; gold/cyan/violet lift.
 * SphereGeometry BackSide, additive, renderOrder -19 (in front of atmos sky).
 * tick: slow yaw + opacity 0.26–0.42. coarse: still plant, skip tick.
 */
export function growSheen(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "sheen";
  group.add(root);

  const map = loadVeil();
  const op = coarse ? SHEEN_OP_COARSE : SHEEN_OP;
  const mat = new THREE.MeshBasicMaterial({
    map,
    color: 0xffffff,
    transparent: true,
    opacity: op,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.BackSide,
    toneMapped: false,
  });

  const segs = coarse ? 24 : 40;
  const rings = coarse ? 14 : 24;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SHEEN_R, segs, rings), mat);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = -19;
  // Aim the painted gold band toward the parent west horizon.
  mesh.rotation.y = 1.22;
  mesh.rotation.z = 0.08;
  root.add(mesh);

  if (coarse) return { tick() {} };

  return {
    tick(t: number) {
      mesh.rotation.y = 1.22 + t * 0.004;
      const u = (Math.sin(t * PULSE) + 1) * 0.5;
      mat.opacity = 0.26 + u * 0.16;
    },
  };
}
