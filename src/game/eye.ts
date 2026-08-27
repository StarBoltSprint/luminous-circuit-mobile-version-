/** Eye rig — 2.5D city (SimCity angle) and 3D keeper vision. Same crystal. */

export type EyeKind = "city" | "keeper";

export type EyeRig = {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
};

export const EYE_SEC = 0.82;

export function keeperStance(id: string) {
  switch (id) {
    case "seln":
      return { height: 1.28, dist: 3.1, lift: 0.22, fov: 64 };
    case "orren":
      return { height: 1.48, dist: 3.0, lift: 0.18, fov: 56 };
    case "voss":
      return { height: 1.62, dist: 3.6, lift: 0.4, fov: 58 };
    case "iri":
      return { height: 1.7, dist: 3.8, lift: 0.55, fov: 52 };
    case "tal":
      return { height: 1.55, dist: 4.4, lift: 0.45, fov: 60 };
    case "mira":
      return { height: 1.42, dist: 3.3, lift: 0.28, fov: 57 };
    case "kael":
      return { height: 1.5, dist: 3.5, lift: 0.32, fov: 58 };
    case "nesh":
      return { height: 1.52, dist: 3.4, lift: 0.3, fov: 59 };
    case "aure":
      return { height: 1.85, dist: 4.8, lift: 0.7, fov: 54 };
    case "kesh":
      return { height: 1.4, dist: 3.6, lift: 0.25, fov: 62 };
    case "lumen":
      return { height: 1.72, dist: 4.0, lift: 0.5, fov: 55 };
    case "rhoa":
      return { height: 1.5, dist: 3.9, lift: 0.35, fov: 61 };
    case "syl":
      return { height: 1.38, dist: 3.2, lift: 0.22, fov: 60 };
    default:
      return { height: 1.55, dist: 3.5, lift: 0.35, fov: 58 };
  }
}

export function clampPull(v: number) {
  return Math.max(0.28, Math.min(22, v));
}

export function cityRig(px: number, py: number, pz: number, orbit: number, pull = 1): EyeRig {
  const p = clampPull(pull);
  const dist = 58 * p;
  const height = 46 * p;
  const ox = Math.sin(orbit) * dist;
  const oz = Math.cos(orbit) * dist;
  return {
    posX: px + ox,
    posY: py + height,
    posZ: pz + oz,
    lookX: px,
    lookY: py + 1.2,
    lookZ: pz,
    fov: 42 + Math.min(20, Math.max(0, p - 1) * 1.15),
  };
}

export function keeperRig(
  px: number,
  py: number,
  pz: number,
  yaw: number,
  pitch: number,
  id: string,
  pull = 1,
): EyeRig {
  const s = keeperStance(id);
  const p = clampPull(pull);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const dist = s.dist * p;
  return {
    posX: px - fx * dist,
    posY: py + s.lift * p + Math.sin(pitch) * 1.4,
    posZ: pz - fz * dist,
    lookX: px + fx * 5.5,
    lookY: py + s.height * 0.55 + pitch * 4,
    lookZ: pz + fz * 5.5,
    fov: s.fov,
  };
}

export function easeEye(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function mixRig(a: EyeRig, b: EyeRig, t: number): EyeRig {
  const u = Math.max(0, Math.min(1, t));
  return {
    posX: a.posX + (b.posX - a.posX) * u,
    posY: a.posY + (b.posY - a.posY) * u,
    posZ: a.posZ + (b.posZ - a.posZ) * u,
    lookX: a.lookX + (b.lookX - a.lookX) * u,
    lookY: a.lookY + (b.lookY - a.lookY) * u,
    lookZ: a.lookZ + (b.lookZ - a.lookZ) * u,
    fov: a.fov + (b.fov - a.fov) * u,
  };
}
