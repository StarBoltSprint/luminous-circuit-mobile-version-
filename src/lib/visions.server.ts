import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { loreCheck } from "@/game/lore-gate";
import { listVisionPullRequests, openVisionPullRequest } from "@/lib/github-vision";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const pieceSchema = z.object({
  shape: z.string().max(24),
  x: z.number(),
  z: z.number(),
  h: z.number().optional(),
  r: z.number().optional(),
  rot: z.number().optional(),
  mat: z.string().max(16).optional(),
});
const proposeSchema = z.object({
  op: z.literal("propose"),
  author: ID,
  wish: z.string().min(8).max(800),
  line: z.string().max(240).optional(),
  kind: z.enum(["crystal", "graphic", "law", "brain"]).optional(),
  pieces: z.array(pieceSchema).max(6).optional(),
  graphic: z.object({ fog: z.number(), density: z.number() }).optional(),
});
const decideSchema = z.object({
  op: z.enum(["accept", "refuse"]),
  id: ID,
});
const postSchema = z.discriminatedUnion("op", [proposeSchema, decideSchema]);

const globalRef = globalThis as typeof globalThis & {
  __visionSchemaPromise2__?: Promise<void>;
};

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__visionSchemaPromise2__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS circuit_visions (
         id TEXT PRIMARY KEY,
         author TEXT NOT NULL,
         wish TEXT NOT NULL,
         line TEXT NOT NULL DEFAULT '',
         pieces JSONB NOT NULL,
         status TEXT NOT NULL DEFAULT 'pending',
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS circuit_vision_prs (
         id TEXT PRIMARY KEY,
         pr_url TEXT NOT NULL
       )`,
    );
  })().catch((err) => {
    globalRef.__visionSchemaPromise2__ = undefined;
    throw err;
  });
  return globalRef.__visionSchemaPromise2__;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export type VisionRow = {
  id: string;
  author: string;
  wish: string;
  line: string;
  pieces: unknown;
  status: string;
  pr_url?: string | null;
};

async function listPending(sql: Sql): Promise<VisionRow[]> {
  const rows = await sql.query<{
    id: string;
    author: string;
    wish: string;
    line: string;
    pieces: unknown;
    status: string;
    pr_url?: string | null;
  }>(
    `SELECT id, author, wish, line, pieces, status FROM circuit_visions
     WHERE status = 'pending'
     ORDER BY created_at DESC LIMIT 24`,
  );
  const links = await sql.query<{ id: string; pr_url: string }>(`SELECT id, pr_url FROM circuit_vision_prs`);
  const prs = await listVisionPullRequests();
  return rows.map((r) => {
    const link = links.find((l) => l.id === r.id);
    const hit = prs.find((p) => p.id === r.id || (link && p.html_url === link.pr_url));
    return { ...r, pr_url: link?.pr_url || hit?.html_url || null };
  });
}

export async function handleVisions(request: Request): Promise<Response> {
  try {
    const sql = await getSql();
    await ensureSchema(sql);
    if (request.method === "GET") {
      return json({ visions: await listPending(sql) });
    }
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid request" }, 400);
    const msg = parsed.data;
    if (msg.op === "propose") {
      const gate = loreCheck(msg.wish);
      if (!gate.ok) return json({ error: gate.reason }, 400);
      const id = `v-${Math.random().toString(36).slice(2, 10)}`;
      const line = msg.line || msg.wish.slice(0, 180);
      const blob = {
        kind: msg.kind || "law",
        pieces: msg.pieces || [],
        graphic: msg.graphic || null,
        brief: msg.wish,
      };
      let prUrl: string | null = null;
      try {
        prUrl = await openVisionPullRequest({
          id,
          author: msg.author,
          wish: msg.wish,
          line,
          pieces: blob,
        });
      } catch (err) {
        console.error("[visions] github pr", err);
      }
      await sql.query(
        `INSERT INTO circuit_visions (id, author, wish, line, pieces, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [id, msg.author, msg.wish, line, JSON.stringify(blob)],
      );
      if (prUrl) {
        await sql.query(`INSERT INTO circuit_vision_prs (id, pr_url) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET pr_url = EXCLUDED.pr_url`, [
          id,
          prUrl,
        ]);
      }
      return json({ ok: true, id, pr: prUrl });
    }
    await sql.query(`UPDATE circuit_visions SET status = $1 WHERE id = $2 AND status = 'pending'`, [
      msg.op === "accept" ? "accepted" : "refused",
      msg.id,
    ]);
    return json({ ok: true });
  } catch (error) {
    console.error("[visions]", error);
    return json({ error: "visions failed", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
}
