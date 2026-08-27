/** FALLEN ORCHARD PETALS — quiet crystal that learned to fruit, on the walk between grove and foundry.
 * Not fruit.ts hanging fruit. Not boughs.ts. Not canopy.ts shade ring (that's AT the grove).
 * Lying on the walk so the kiln path is not chrome.
 * Parent hooks with:
 *   laterOn(() => { try { growPetal(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

const CX = 195;
const CZ = -830;
const Y = 0.04;
const R = 0.42;
const OP = 0.28;
const HEX = 0xe8c56a;
const SPREAD = 48;
const DEN_SKIP = 140;
const GROVE = { x: 320, z: -980 };
const FOUNDRY = { x: 70, z: -680 };
const N_FINE = 12;
const N_COARSE = 6;

function petalMat() {
  return new THREE.MeshBasicMaterial({
    color: HEX,
    transparent: true,
    opacity: OP,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * Fallen orchard petals on empty ground between grove (320,-980) and foundry (70,-680).
 * 12 CircleGeometry r=0.42 (coarse 6) MeshBasic gold 0xe8c56a opacity 0.28,
 * rotation.x = -PI/2, y=0.04. Scatter hash ±24 around (195,-830).
 * Skip hypot < 140 from either den. Quiet crystal that learned to fruit.
 */
export function growPetal(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "petal";
  group.add(root);

  const want = coarse ? N_COARSE : N_FINE;
  const segs = coarse ? 8 : 12;
  const geo = new THREE.CircleGeometry(R, segs);
  const mat = petalMat();
  let planted = 0;

  for (let i = 0; i < want; i++) {
    const dx = (hash(i, 1) - 0.5) * SPREAD;
    const dz = (hash(i, 2) - 0.5) * SPREAD;
    const x = CX + dx;
    const z = CZ + dz;
    if (Math.hypot(x - GROVE.x, z - GROVE.z) < DEN_SKIP) continue;
    if (Math.hypot(x - FOUNDRY.x, z - FOUNDRY.z) < DEN_SKIP) continue;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, Y, z);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    root.add(mesh);
    planted += 1;
  }

  root.userData.petalCount = planted;
  root.userData.want = want;
}
