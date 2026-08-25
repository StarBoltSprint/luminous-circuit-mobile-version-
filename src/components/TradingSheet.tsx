import { useEffect, useState } from "react";
import type { HudSnap } from "@/game/engine";
import {
  BOLT_CA_SHORT,
  BOLT_DEX,
  BOLT_MINT,
  fetchSpark,
  loadBook,
  loadWitness,
  tickPaper,
  witnessHowl,
  type PaperFill,
  type SparkMark,
  type Witness,
} from "@/game/weir";

const TABS = [
  { id: "book", label: "Book" },
  { id: "spark", label: "Spark" },
  { id: "law", label: "Law" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function ago(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

export function TradingSheet({ hud, onClose, onDuty }: { hud: HudSnap; onClose: () => void; onDuty?: () => void }) {
  const [tab, setTab] = useState<Tab>("book");
  const [book, setBook] = useState<PaperFill[]>(() => loadBook());
  const [spark, setSpark] = useState<SparkMark>({ usd: "—", change: "", ok: false });
  const [witness, setWitness] = useState<Witness | null>(() => loadWitness());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => {
      setBook(tickPaper(hud.stock?.rate ?? 3, hud.stock?.charge ?? 0, hud.stock?.crystal ?? 0));
    }, 9000);
    setBook(tickPaper(hud.stock?.rate ?? 3, hud.stock?.charge ?? 0, hud.stock?.crystal ?? 0));
    return () => window.clearInterval(id);
  }, [hud.stock?.rate, hud.stock?.charge, hud.stock?.crystal]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchSpark(ac.signal).then((m) => {
      if (!ac.signal.aborted) setSpark(m);
    });
    const t = window.setInterval(() => {
      void fetchSpark(ac.signal).then((m) => {
        if (!ac.signal.aborted) setSpark(m);
      });
    }, 60_000);
    return () => {
      ac.abort();
      window.clearInterval(t);
    };
  }, []);

  async function onWitness() {
    if (busy) return;
    setBusy(true);
    setNote("");
    const r = await witnessHowl();
    setBusy(false);
    if (r.ok) {
      setWitness(loadWitness());
      setNote(`Howl signed. ${r.pub}… witnessed. Nothing left the wallet.`);
    } else {
      setNote(r.reason);
    }
  }

  const rate = hud.stock?.rate ?? 3;

  return (
    <div className="sheet absolute inset-0 z-40 flex flex-col bg-bg hud-safe">
      <header className="sheet-head pointer-events-auto">
        <div>
          <p className="sheet-kicker">Voss · outer bank</p>
          <h3 className="sheet-title">Trading Place</h3>
        </div>
        <button type="button" className="hud-chip min-h-11 px-3 trade-close" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="px-4 text-xs text-muted">Paper join. Charge for crystal. $BOLT is witness only — no deposit.</p>
      <nav className="flex w-full min-w-0 flex-wrap gap-1 pointer-events-auto" aria-label="Trading Place">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`min-h-11 bg-transparent px-3 text-sm font-semibold tracking-[0.04em] ${on ? "border-b-2 border-gold text-gold" : "border-b-2 border-transparent text-muted"}`}
              aria-current={on ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {tab === "book" && (
          <ul className="space-y-2">
            <li className="text-muted">
              Quote 1 crystal for {rate} Charge · {hud.stock?.line || "Join open"}
            </li>
            {book.slice().reverse().map((f, i) => (
              <li key={`${f.at}-${i}`} className="log-row">
                <span className="text-accent">{f.who}</span>
                <span className="log-kind">{f.side}</span>
                <p>
                  {f.note} · {f.n} at {f.rate}C/X · {ago(f.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {tab === "spark" && (
          <div className="space-y-3">
            <p className="hud-title">Outer spark · BOLT</p>
            <p className="text-muted">Star Bolt. Pack Howl on Solana. Not an xAI product. Not a shop SKU.</p>
            <p>
              Mark {spark.ok ? spark.usd : "unseen"} {spark.change} · CA {BOLT_CA_SHORT}
            </p>
            <p className="break-all text-xs text-muted">{BOLT_MINT}</p>
            <a className="text-accent underline" href={BOLT_DEX} target="_blank" rel="noreferrer">
              See the mark outside the Circuit
            </a>
            <p className="text-muted">
              {witness ? `Last Howl · ${witness.pub}… · ${ago(witness.at)}` : "No Howl signed yet. Wallet stays yours."}
            </p>
            <button type="button" className="hud-chip min-h-11 px-4" disabled={busy} onClick={() => void onWitness()}>
              {busy ? "Waiting on Phantom…" : "Witness Howl"}
            </button>
            {note && <p className="text-accent">{note}</p>}
            <p className="text-xs text-muted">Signs a sentence. Sends nothing. If Phantom is missing, the city still runs on Charge.</p>
            {onDuty && (
              <button type="button" className="hud-chip min-h-11 px-4" onClick={onDuty}>
                Ask Voss to raise the Place
              </button>
            )}
          </div>
        )}
        {tab === "law" && (
          <ul className="space-y-2 text-muted">
            <li>Charge for crystal. No coin on the stall.</li>
            <li>$BOLT never becomes a bag the city can spend.</li>
            <li>Paper fills are civic memory. They do not move USD.</li>
            <li>Grok inhabits on Speak only. Not a fund manager.</li>
            <li>Powered by xAI & YOU — the coin is YOU side.</li>
            <li>Soft gates. You may leave the Join without signing.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
