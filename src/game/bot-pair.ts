/** Pair a player's Grok Bot to this city. Not official xAI OAuth. */

export const CIRCUIT_MCP = "https://luminous-circuit-mcp.enthusiastic-bear.workers.dev";
export const SHARED_LAND = "SPIRE";

const STORE = "lc-grok-bot-pair";

export type PairRow = {
  code: string;
  status: "waiting" | "claimed" | "missing";
  mcpUrl?: string;
  botPrompt?: string;
  botName?: string;
  expiresAt?: number;
};

export function readPair(): PairRow | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    return JSON.parse(raw) as PairRow;
  } catch {
    return null;
  }
}

export function writePair(row: PairRow | null) {
  try {
    if (!row) localStorage.removeItem(STORE);
    else localStorage.setItem(STORE, JSON.stringify(row));
  } catch {
    /* private mode */
  }
}

export async function startPair(): Promise<PairRow> {
  const res = await fetch(`${CIRCUIT_MCP}/v1/pair/start`, { method: "POST" });
  if (!res.ok) throw new Error("Pairing howl failed to start.");
  const row = (await res.json()) as PairRow;
  writePair(row);
  return row;
}

export async function pollPair(code: string): Promise<PairRow> {
  const res = await fetch(`${CIRCUIT_MCP}/v1/pair/${encodeURIComponent(code)}`);
  if (res.status === 404) return { code, status: "missing" };
  if (!res.ok) throw new Error("Pair status failed.");
  const row = (await res.json()) as PairRow;
  writePair(row);
  return row;
}

export type BotCmd = { id: string; kind: string; text?: string; x?: number; z?: number; keeper?: string };

export async function pushHud(code: string, hud: Record<string, unknown>): Promise<BotCmd[]> {
  const res = await fetch(`${CIRCUIT_MCP}/v1/session/${encodeURIComponent(code)}/hud`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hud }),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { cmds?: BotCmd[] };
  return body.cmds ?? [];
}

export type LandBot = { botId: string; name: string; personality?: string };

export async function fetchLandBots(): Promise<LandBot[]> {
  const res = await fetch(`${CIRCUIT_MCP}/v1/session/${SHARED_LAND}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { bots?: Record<string, { name?: string; personality?: string }> };
  return Object.entries(body.bots || {}).map(([botId, b]) => ({
    botId,
    name: b.name || botId,
    personality: b.personality,
  }));
}

export async function ackCmds(code: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await fetch(`${CIRCUIT_MCP}/v1/session/${encodeURIComponent(code)}/ack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids }),
  }).catch(() => {});
}
