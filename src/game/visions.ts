export type VisionPiece = {
  shape: string;
  x: number;
  z: number;
  h?: number;
  r?: number;
  rot?: number;
  mat?: string;
};

export type Vision = {
  id: string;
  author: string;
  wish: string;
  line: string;
  pieces: VisionPiece[];
  status: string;
  pr_url?: string | null;
  kind?: string;
  graphic?: { fog: number; density: number } | null;
};

function asPieces(raw: unknown): VisionPiece[] {
  if (Array.isArray(raw)) {
    return raw.filter((p) => p && typeof p === "object" && typeof (p as VisionPiece).shape === "string") as VisionPiece[];
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as { pieces?: unknown }).pieces)) {
    return asPieces((raw as { pieces: unknown }).pieces);
  }
  return [];
}

function asMeta(raw: unknown): { kind?: string; graphic?: { fog: number; density: number } | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as { kind?: string; graphic?: { fog: number; density: number } | null };
  return { kind: o.kind, graphic: o.graphic ?? null };
}

export async function fetchVisions(): Promise<Vision[]> {
  const res = await fetch("/api/visions");
  if (!res.ok) return [];
  const body = (await res.json()) as { visions?: Array<Vision & { pieces: unknown }> };
  return (body.visions || []).map((v) => ({
    ...v,
    pieces: asPieces(v.pieces),
    ...asMeta(v.pieces),
  }));
}

export async function proposeVision(input: {
  author: string;
  wish: string;
  line: string;
  pieces?: VisionPiece[];
  kind?: string;
  graphic?: { fog: number; density: number } | null;
}): Promise<{ ok: boolean; id?: string; pr?: string | null; error?: string }> {
  const res = await fetch("/api/visions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "propose", ...input }),
  });
  if (!res.ok) {
    try {
      const err = (await res.json()) as { error?: string };
      return { ok: false, error: err.error };
    } catch {
      return { ok: false };
    }
  }
  return (await res.json()) as { ok: boolean; id?: string; pr?: string | null };
}

export async function decideVision(id: string, op: "accept" | "refuse"): Promise<boolean> {
  const res = await fetch("/api/visions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, id }),
  });
  return res.ok;
}
