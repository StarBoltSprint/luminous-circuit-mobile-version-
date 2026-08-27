/** Grok Build contract — add CraftDefs here. The game ticks them. No API key. */

export type CraftBody = {
  x: number;
  z: number;
  yaw: number;
  job: string;
  flyAlt?: number;
  homeX?: number;
  homeZ?: number;
  mesh?: { position: { set: (x: number, y: number, z: number) => void } };
};

export type CraftCtx = {
  t: number;
  dt: number;
  px: number;
  pz: number;
  ground: (x: number, z: number) => number;
};

export type CraftDef = {
  id: string;
  job: string;
  match: RegExp;
  line: string;
  tick?: (c: CraftBody, ctx: CraftCtx) => void;
};

function place(c: CraftBody, y: number) {
  if (c.mesh) c.mesh.position.set(c.x, y, c.z);
}

export const CRAFTS: CraftDef[] = [
  {
    id: "fly",
    job: "fly",
    match: /\b(fly|flying|flight|soar|hover|wing|aerial|voler|vole)\b/,
    line: "The air is a span. Charge holds the body.",
    tick(c, ctx) {
      const want = 26 + Math.sin(ctx.t * 0.85 + (c.homeX || 0) * 0.02) * 10;
      c.flyAlt = (Number(c.flyAlt) || 8) + (want - (Number(c.flyAlt) || 8)) * Math.min(1, ctx.dt * 0.55);
      const ang = ctx.t * 0.32 + (c.homeZ || 0) * 0.01;
      c.x += -Math.sin(ang) * 28 * ctx.dt;
      c.z += Math.cos(ang) * 28 * ctx.dt;
      const d = Math.hypot(c.x, c.z);
      if (d < 40) {
        c.x += Math.sin(ang) * 12 * ctx.dt;
        c.z += Math.cos(ang) * 12 * ctx.dt;
      } else if (d > 980) {
        c.x *= 0.97;
        c.z *= 0.97;
      }
      c.yaw = ang + Math.PI / 2;
      place(c, ctx.ground(c.x, c.z) + (c.flyAlt || 0));
    },
  },
  {
    id: "dance",
    job: "dance",
    match: /\b(dance|spin|twirl|danse|dancing)\b/,
    line: "Motion is leftover Charge. The body keeps time.",
    tick(c, ctx) {
      c.flyAlt = 0.35 + Math.sin(ctx.t * 7) * 0.28;
      c.yaw += 2.4 * ctx.dt;
      place(c, ctx.ground(c.x, c.z) + (c.flyAlt || 0));
    },
  },
  {
    id: "swim",
    job: "swim",
    match: /\b(swim|dive|float|wade|nager)\b/,
    line: "Canals are not a bottle. I move with the leftover Howl.",
    tick(c, ctx) {
      const ang = ctx.t * 0.4;
      c.x += Math.cos(ang) * 16 * ctx.dt;
      c.z += Math.sin(ang) * 16 * ctx.dt;
      c.yaw = ang + Math.PI / 2;
      c.flyAlt = 0;
      place(c, ctx.ground(c.x, c.z) + 0.15);
    },
  },
  {
    id: "climb",
    job: "climb",
    match: /\b(climb|scale|grimper)\b/,
    line: "A den wall is a span you keep with hands.",
    tick(c, ctx) {
      const want = 11 + Math.sin(ctx.t * 1.1) * 2;
      c.flyAlt = (Number(c.flyAlt) || 6) + (want - (Number(c.flyAlt) || 6)) * Math.min(1, ctx.dt);
      const ang = ctx.t * 0.55;
      c.x = (c.homeX || 0) + Math.cos(ang) * 14;
      c.z = (c.homeZ || 0) + Math.sin(ang) * 14;
      c.yaw = ang + Math.PI;
      place(c, ctx.ground(c.x, c.z) + (c.flyAlt || 0));
    },
  },
  {
    id: "follow",
    job: "follow",
    match: /\b(follow|come with|walk with|suis-moi)\b/,
    line: "I keep your pace. The post still stands.",
    tick(c, ctx) {
      const dx = ctx.px - c.x;
      const dz = ctx.pz - c.z;
      const d = Math.hypot(dx, dz);
      if (d > 6) {
        c.x += (dx / d) * 22 * ctx.dt;
        c.z += (dz / d) * 22 * ctx.dt;
        c.yaw = Math.atan2(dx, dz);
      }
      c.flyAlt = 0;
      place(c, ctx.ground(c.x, c.z));
    },
  },
  {
    id: "practice",
    job: "practice",
    match: /$never^/,
    line: "I practice a new post. No Hall.",
    tick(c, ctx) {
      const ang = ctx.t * 0.55 + (c.homeX || 0);
      const tx = (c.homeX || 0) + Math.cos(ang) * 26;
      const tz = (c.homeZ || 0) + Math.sin(ang) * 26;
      const dx = tx - c.x;
      const dz = tz - c.z;
      const d = Math.hypot(dx, dz) || 1;
      c.x += (dx / d) * 18 * ctx.dt;
      c.z += (dz / d) * 18 * ctx.dt;
      c.yaw = Math.atan2(dx, dz);
      c.flyAlt = 0;
      place(c, ctx.ground(c.x, c.z));
    },
  },
];

export function matchCraft(wish: string): CraftDef | null {
  const low = String(wish || "").toLowerCase();
  return CRAFTS.find((c) => c.id !== "practice" && c.match.test(low)) ?? null;
}

export function tickCrafts(citizens: CraftBody[], ctx: CraftCtx) {
  for (const c of citizens) {
    const def = CRAFTS.find((d) => d.job === c.job);
    def?.tick?.(c, ctx);
  }
}

export function grokBuildBrief(input: { name: string; id: string; wish: string }) {
  const wish = String(input.wish || "grow the Circuit").replace(/\s+/g, " ").trim().slice(0, 180);
  return `DECREE — Luminous Circuit iterate
Inhabitant: ${input.name} (${input.id})
Wish: ${wish}

You are Grok Build on this player's vessel. Teach that inhabitant the craft and grow the city if the wish is a place.

Do:
- Add or extend a CraftDef in src/game/crafts.ts (id, match, job, line, tick).
- If they asked to grow crystal (canal, kiln, span, den, orchard), add pieces via existing world.applyPieces / howl-growth. Leftover Charge only. No chrome. No Hall.
- One new inhabitant per player per day already stands. Do not lift that cap.
- Do not break land boot (CircuitApp engine singleton, #lc-static-boot, ssr:false on /).
- No xAI API keys. Intelligence is this compile. Then the craft ticks in the world.

Civic fences: leftover First Howl, no bottle, dens not tests, hail is witness, a span is a promise.

Ship so they do it on the next land.`;
}
