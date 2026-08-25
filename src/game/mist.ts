/** Low ground mist discs BETWEEN dens. Not Hub (r<90). Dark cyan/violet veils. Not a fog wall.
 * Parent hooks with:
 *   laterOn(() => { try { growMist(group, coarse); } catch { } });
 * Dispose is world group.clear(). No tick. No photos. No vibrate.
 */
import * as THREE from "three";
import { DISTRICTS } from "./lore";

function hash(i: number, s: number) {
  const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Corridors that already live between dens. Midpoints sit off Hub. */
const GAPS: [string, string][] = [
  ["zone-canal", "zone-market"],
  ["zone-market", "zone-foundry"],
  ["zone-foundry", "zone-grove"],
  ["zone-wild", "zone-bridge"],
  ["zone-bridge", "zone-gate"],
  ["zone-gate", "zone-beacon"],
  ["zone-gate", "zone-terrace"],
  ["zone-terrace", "zone-ring"],
  ["zone-archive", "zone-market"],
  ["zone-archive", "zone-overlook"],
];

function veil(hex: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    fog: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function inHub(x: number, z: number) {
  return Math.hypot(x, z) < 90;
}

function onDen(x: number, z: number) {
  return DISTRICTS.some((d) => Math.hypot(x - d.x, z - d.z) < d.radius * 0.58);
}

function nDiscs(coarse: boolean): number {
  if (coarse) return 4;
  return 6 + Math.min(4, Math.floor(hash(7, 21) * 5));
}

/**
 * Ground-hugging mist sheets in the gaps dens leave. Hub skip (r<90).
 * 6–10 discs (coarse 4). PlaneGeometry, y=0.35, opacity 0.07–0.11, cyan/violet.
 * Dark MeshBasic. depthWrite false. Not a fog wall.
 */
export function growMist(group: THREE.Group, coarse: boolean): void {
  const root = new THREE.Group();
  root.name = "mist";
  group.add(root);

  const byId = new Map(DISTRICTS.map((d) => [d.id, d]));
  const want = nDiscs(coarse);
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);

  const cyan = 0x0c3340;
  const violet = 0x161228;

  let placed = 0;
  for (let i = 0; i < GAPS.length && placed < want; i++) {
    const pair = GAPS[i]!;
    const a = byId.get(pair[0]);
    const b = byId.get(pair[1]);
    if (!a || !b) continue;
    if (inHub(a.x, a.z) || inHub(b.x, b.z)) continue;

    const t = 0.44 + hash(i, 5) * 0.12;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const bulge = (hash(i, 9) - 0.5) * 42;
    const x = a.x + dx * t + px * bulge;
    const z = a.z + dz * t + pz * bulge;
    if (inHub(x, z) || onDen(x, z)) continue;

    const op = 0.07 + hash(i, 13) * 0.04;
    const hex = hash(i, 3) > 0.5 ? cyan : violet;
    const mesh = new THREE.Mesh(geo, veil(hex, op));
    const s = 96 + hash(i, 17) * 84;
    mesh.position.set(x, 0.35, z);
    mesh.rotation.y = hash(i, 11) * Math.PI * 2;
    mesh.scale.set(s, 1, s * (0.68 + hash(i, 19) * 0.44));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = -1;
    root.add(mesh);
    placed += 1;
  }
}
