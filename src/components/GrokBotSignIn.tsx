import { useEffect, useState } from "react";
import { CIRCUIT_MCP, pollPair, readPair, startPair, type PairRow } from "@/game/bot-pair";

export function GrokBotSignIn({ onClose }: { onClose: () => void }) {
  const [row, setRow] = useState<PairRow | null>(() => readPair());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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
            Pair <strong>your</strong> Grok Bot to this city. Not official xAI OAuth — your Bot adds our MCP, then howls the code.
          </p>
          {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
          {claimed ? (
            <p className="mt-4 text-sm text-accent">
              Signed in{row.botName ? ` as ${row.botName}` : ""}. Howl {row.code}. Keep this city open — then tell the Bot: appear, walk, say, howl, talk.
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
                Tell the Bot: <code className="text-accent">pair_with_howl {row?.code || "AROO-XXXX"}</code>
              </li>
            </ol>
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
