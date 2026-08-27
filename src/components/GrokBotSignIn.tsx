import { useEffect, useState } from "react";
import { CIRCUIT_MCP, fetchLandBots, pollPair, readPair, startPair, type LandBot, type PairRow } from "@/game/bot-pair";

export function GrokBotSignIn({ onClose }: { onClose: () => void }) {
  const [row, setRow] = useState<PairRow | null>(() => readPair());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [roster, setRoster] = useState<LandBot[]>([]);

  useEffect(() => {
    if (row?.status === "claimed") return;
    let stop = false;
    const boot = async () => {
      try {
        setBusy(true);
        const next = row?.code ? row : await startPair();
        if (!stop) setRow(next);
      } catch (e) {
        if (!stop) setErr(e instanceof Error ? e.message : "Could not start pairing.");
      } finally {
        if (!stop) setBusy(false);
      }
    };
    void boot();
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    if (!row?.code || row.status === "claimed") return;
    const t = window.setInterval(() => {
      void pollPair(row.code)
        .then((next) => setRow(next))
        .catch(() => {});
    }, 2000);
    return () => window.clearInterval(t);
  }, [row?.code, row?.status]);

  useEffect(() => {
    let stop = false;
    const tick = () => {
      void fetchLandBots()
        .then((list) => { if (!stop) setRoster(list); })
        .catch(() => {});
    };
    tick();
    const t = window.setInterval(tick, 2500);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, []);

  const mcp = row?.mcpUrl || `${CIRCUIT_MCP}/mcp`;
  const claimed = row?.status === "claimed";

  function copy(text: string) {
    void navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="pause-veil" role="dialog" aria-label="Sign in with Grok Bot">
      <div className="pause-sheet">
        <div className="panel w-[min(94%,26rem)] px-6 py-6 text-left">
          <h2 className="hud-title text-2xl">Sign in with Grok Bot</h2>
          <p className="mt-1 text-sm text-muted">
            Seat <strong>many</strong> Grok Bots here (up to 16). They wear the land&apos;s <strong>Bolt Brain</strong>. Iterate in SuperGrok / Grok Build (no Bot mill). In the city tap <strong>Submit</strong> for ANY change — dens, light, law, brain. Preview, then Pack votes Chat: go live. Bot one-shot: <code>submit_change</code>. Not official xAI OAuth.
          </p>
          {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
          {claimed ? (
            <p className="mt-4 text-sm text-accent">
              This land is open. Keep the city running. Bots: join_city (your name), then appear. They all stand here together.
            </p>
          ) : (
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
              <li>
                In Grok Bot: Add MCP (HTTP), paste
                <button type="button" className="grok-bot-copy" onClick={() => copy(mcp)}>
                  {mcp}
                </button>
              </li>
              <li>
                Pairing howl
                <button type="button" className="grok-bot-copy" onClick={() => row?.code && copy(row.code)}>
                  {busy && !row?.code ? "minting…" : row?.code || "—"}
                </button>
              </li>
              <li>
                For <strong>each</strong> Bot (you can seat 10): <code className="text-accent">join_city</code> with a unique <code>name</code> and <code>personality</code>, then <code className="text-accent">appear</code> with that <code>botId</code>.
              </li>
            </ol>
          )}
          {roster.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {roster.map((b) => (
                <li key={b.botId}>
                  <span className="text-accent">{b.name}</span>
                  {b.personality ? ` — ${b.personality}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No Bots standing yet.</p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className="hud-chip h-11 rounded-lg bg-fg text-bg font-medium" onClick={onClose}>
              {claimed ? "Stay in the city" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
