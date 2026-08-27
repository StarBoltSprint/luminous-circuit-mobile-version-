/** Star Core ORBIT SHARDS — living crystal circling the parent.
 * Not atmos.ts icosa heart / octa cage. Not corona rays. Not plaza facets.ts.
 * Parent hooks with:
 *   laterOn(() => { try { shards = growShards(group, coarse); } catch { } });
 *   // in world.tick(t): try { shards?.tick(t); } catch { }
 * Dispose is world group.clear(). No vibrate. No photos.
 */
import * as THREE from "three";
import { STAR_CORE } from "./atmos";

const LOOK_Y = 190;
const SHARD_N = 10;
const SHARD_N_COARSE = 5;
const RING_R = 260;
const SCALE_MIN = 4.2;
const SCALE_MAX = 7.8;
const Y_AMP = 12;
const SPIN = 0.09;

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function goldShard() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8c888,
    emissive: 0xc49038,
    emissiveIntensity: 0.4,
    roughness: 0.18,
    metalness: 0.62,
    fog: false,
    toneMapped: false,
  });
}

/**
 * Star Core orbit shards at STAR_CORE (-4050, 540, 195). Group lookAt(0, 190, 0).
 * 10 OctahedronGeometry(1, 0) (coarse 5) MeshPhysical gold 0xe8c888 emissive
 * 0xc49038 intensity 0.4, roughness 0.18, metalness 0.62, fog false.
 * Ring radius 78, scale 4.2–7.8 (hash), y-offset ±12.
 * tick: orbit.rotation.y = t * 0.09. coarse: still plant, skip tick.
 */
export function growShards(
  group: THREE.Group,
  coarse: boolean,
): { tick: (t: number) => void } {
  const root = new THREE.Group();
  root.name = "shards";
  group.add(root);

  const n = coarse ? SHARD_N_COARSE : SHARD_N;

  const pose = new THREE.Group();
  pose.name = "shard-core";
  pose.position.set(STAR_CORE.x, STAR_CORE.y, STAR_CORE.z);
  pose.lookAt(0, LOOK_Y, 0);
  pose.frustumCulled = false;
  pose.castShadow = false;
  pose.receiveShadow = false;

  const orbit = new THREE.Group();
  orbit.name = "shard-orbit";
  orbit.frustumCulled = false;

  const geo = new THREE.OctahedronGeometry(1, 0);
  const mat = goldShard();
  const span = SCALE_MAX - SCALE_MIN;

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = SCALE_MIN + hash(i, 6) * span;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(a) * RING_R, (hash(i, 12) * 2 - 1) * Y_AMP, Math.sin(a) * RING_R);
    mesh.scale.setScalar(s);
    mesh.rotation.set(
      (hash(i, 14) - 0.5) * 1.2,
      hash(i, 16) * Math.PI * 2,
      (hash(i, 18) - 0.5) * 0.9,
    );
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    orbit.add(mesh);
  }

  pose.add(orbit);
  root.add(pose);

  root.userData.shardCount = n;
  root.userData.breathing = !coarse;
  root.userData.sizes = {
    x: STAR_CORE.x,
    y: STAR_CORE.y,
    z: STAR_CORE.z,
    lookY: LOOK_Y,
    n,
    ringR: RING_R,
    scaleMin: SCALE_MIN,
    scaleMax: SCALE_MAX,
    yAmp: Y_AMP,
    spin: coarse ? 0 : SPIN,
  };

  if (coarse) return { tick() {} };

  return {
    tick(t: number) {
      orbit.rotation.y = t * SPIN;
    },
  };
}
