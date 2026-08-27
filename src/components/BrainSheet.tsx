import { useMemo, useState } from "react";
import type { EngineHandle } from "@/game/engine";
import {
  activePack,
  grokBuildBrief,
  loadDraft,
  loadPreview,
  loadQueue,
  makeLive,
  pickLine,
  pushSubmitRemote,
  refuseSubmit,
  saveDraft,
  setPreview,
  submitDraft,
  voteSubmit,
  type BoltBrainPack,
} from "@/game/bolt-brain";

export function BrainSheet({
  engine,
  onClose,
}: {
  engine: EngineHandle | null;
  onClose: () => void;
}) {
  const [pack, setPack] = useState<BoltBrainPack>(() => loadDraft());
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState("walker");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [queue, setQueue] = useState(() => loadQueue());
  const [preview, setPrev] = useState(() => loadPreview());
  const liveHint = useMemo(() => pickLine(activePack(), "help"), [preview, queue]);

  function persist(next: BoltBrainPack) {
    setPack(next);
    saveDraft(next);
  }

  function applyLocal() {
    saveDraft(pack);
    engine?.applyBrainPack?.(pack);
  }

  async function submit() {
    setErr("");
    saveDraft(pack);
    const sent = submitDraft(author, note || pack.personality);
    if (!sent.ok || !sent.row) {
      setErr(sent.error || "Could not submit.");
      return;
    }
    await pushSubmitRemote(sent.row);
    setQueue(loadQueue());
    setPreview(sent.row);
    setPrev(sent.row);
    engine?.applyBrainPack?.(sent.row.pack);
  }

  function previewRow(id: string) {
    const row = loadQueue().find((r) => r.id === id);
    if (!row) return;
    setPreview(row);
    setPrev(row);
    engine?.applyBrainPack?.(row.pack);
  }

  function clearPreview() {
    setPreview(null);
    setPrev(null);
    engine?.applyBrainPack?.(null);
  }

  function vote(id: string) {
    voteSubmit(id);
    setQueue(loadQueue());
  }

  function goLive(id: string) {
    const r = makeLive(id);
    if (!r.ok) {
      setErr(r.error || "Could not go live.");
      return;
    }
    setQueue(loadQueue());
    setPrev(null);
    engine?.applyBrainPack?.(null);
  }

  async function copyBrief() {
    const text = grokBuildBrief(pack);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* samsung */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  const pending = queue.filter((r) => r.status === "pending");

  return (
    <div className="inhabit-veil pointer-events-auto" role="dialog" aria-label="Bolt Brain">
      <div className="inhabit-sheet">
        <div className="inhabit-head">
          <p className="hud-slim-name">Bolt Brain</p>
          <button type="button" className="hud-slim-textbtn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="inhabit-note">
          Any paired Grok Bot can wear this pack. Iterate here or in SuperGrok / Grok Build —{" "}
          <strong>not</strong> Grok Bot chat, so Bot quota stays clean. Submit, preview, then the Pack votes what goes live.
        </p>
        {preview ? (
          <p className="inhabit-note" style={{ color: "var(--color-accent)" }}>
            PREVIEW on · {preview.author}: {preview.pack.name}
          </p>
        ) : null}
        <p className="inhabit-note">{liveHint}</p>

        <label className="inhabit-note" htmlFor="brain-name">
          Name
        </label>
        <input
          id="brain-name"
          className="inhabit-input"
          maxLength={32}
          value={pack.name}
          onChange={(e) => persist({ ...pack, name: e.target.value })}
        />
        <label className="inhabit-note" htmlFor="brain-person">
          Personality
        </label>
        <input
          id="brain-person"
          className="inhabit-input"
          maxLength={280}
          value={pack.personality}
          onChange={(e) => persist({ ...pack, personality: e.target.value })}
        />
        <label className="inhabit-note" htmlFor="brain-greet">
          Greet line (one)
        </label>
        <input
          id="brain-greet"
          className="inhabit-input"
          maxLength={140}
          value={(pack.lines.greet && pack.lines.greet[0]) || ""}
          onChange={(e) => {
            const greet = [...(pack.lines.greet || [])];
            greet[0] = e.target.value;
            persist({ ...pack, lines: { ...pack.lines, greet } });
          }}
        />
        <label className="inhabit-note" htmlFor="brain-author">
          Your name on the submit
        </label>
        <input
          id="brain-author"
          className="inhabit-input"
          maxLength={24}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <label className="inhabit-note" htmlFor="brain-note">
          What changed
        </label>
        <input
          id="brain-note"
          className="inhabit-input"
          maxLength={240}
          placeholder="Quieter Howl. Kinder help. Still Pack first."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {err ? <p className="inhabit-note">{err}</p> : null}

        <div className="hud-slim-row inhabit-crew">
          <button type="button" className="hud-slim-textbtn inhabit-go" onClick={applyLocal}>
            Use on this land
          </button>
          <button type="button" className="hud-slim-textbtn inhabit-go" onClick={() => void copyBrief()}>
            {copied ? "Copied — paste in Grok Build" : "Copy Grok Build (no Bot quota)"}
          </button>
          <button type="button" className="hud-slim-textbtn inhabit-go" onClick={() => void submit()}>
            Submit + preview
          </button>
          {preview ? (
            <button type="button" className="hud-slim-textbtn" onClick={clearPreview}>
              End preview
            </button>
          ) : null}
        </div>

        <p className="hud-slim-name" style={{ marginTop: 16 }}>
          Submitted brains
        </p>
        <p className="inhabit-note">Preview first. Vote Chat: go live. Then Put live on this land.</p>
        <ul className="inhabit-list">
          {pending.length === 0 ? (
            <li className="inhabit-note">No pending brains. Submit yours.</li>
          ) : (
            pending.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="inhabit-folk"
                  data-on={preview?.id === r.id ? "true" : undefined}
                  onClick={() => previewRow(r.id)}
                >
                  {r.pack.name} · {r.author}
                  <span>
                    {r.note} · {r.votes} vote{r.votes === 1 ? "" : "s"}
                  </span>
                </button>
                <div className="hud-slim-row inhabit-crew">
                  <button type="button" className="hud-slim-textbtn" onClick={() => previewRow(r.id)}>
                    Preview
                  </button>
                  <button type="button" className="hud-slim-textbtn" onClick={() => vote(r.id)}>
                    Chat: go live
                  </button>
                  <button type="button" className="hud-slim-textbtn inhabit-go" onClick={() => goLive(r.id)}>
                    Put live
                  </button>
                  <button
                    type="button"
                    className="hud-slim-textbtn"
                    onClick={() => {
                      refuseSubmit(r.id);
                      setQueue(loadQueue());
                      if (preview?.id === r.id) clearPreview();
                    }}
                  >
                    Refuse
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
