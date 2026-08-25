import { createServerFn } from "@tanstack/react-start";
import { CIRCUIT_LAW, agentById, AGENTS } from "./agents";
import {
  composeScene,
  defaultScene,
  denOf,
  interpretHowl,
  piecesToCode,
  sanitizePieces,
  SCENES,
  type BuildPiece,
  type SceneKind,
} from "./build-spec";
import { CITIZENS, DISTRICTS } from "./lore";

export type AgentReply = {
  ok: boolean;
  action: "grow" | "refuse" | "speak";
  line: string;
  pieces: BuildPiece[];
  code: string;
  error?: string;
};

export type HowlHistory = { role: "user" | "agent"; text: string };

const MAX_HOWL = 320;

const AGENT_MATS: Record<string, BuildPiece["mat"][]> = {
  veyra: ["glow", "violet", "crystal"],
  tal: ["cyan", "glow", "spire"],
  seln: ["cyan", "gold", "glow"],
  orren: ["gold", "crystal", "spire"],
  mira: ["violet", "crystal", "glow"],
  kael: ["violet", "glow", "cyan"],
  iri: ["gold", "crystal", "glow"],
  nesh: ["cyan", "gold", "spire"],
  aure: ["gold", "crystal", "glow"],
  voss: ["cyan", "gold", "glow"],
  kesh: ["gold", "cyan", "crystal"],
  lumen: ["violet", "glow", "gold"],
  rhoa: ["violet", "glow", "crystal"],
  syl: ["gold", "crystal", "violet"],
};

function matsOf(id: string): BuildPiece["mat"][] {
  return AGENT_MATS[id] ?? ["cyan", "violet", "gold"];
}

function playerApiKey(raw: string | undefined) {
  const k = String(raw ?? "").trim();
  return /^xai-[A-Za-z0-9_-]{16,}$/.test(k) ? k : "";
}

function vaultBottleneck(stock?: { charge: number; crystal: number; scripture: number }) {
  if (!stock) return "unknown";
  if (stock.charge < 18) return `charge ${Math.round(stock.charge)} — canals first`;
  if (stock.crystal < 7) return `crystal ${Math.round(stock.crystal)} — kiln first`;
  if (stock.scripture < 3) return `scripture ${Math.round(stock.scripture)} — name what stood`;
  return `none — vault C${Math.round(stock.charge)} X${Math.round(stock.crystal)} S${Math.round(stock.scripture)}`;
}

type NeckKind = "charge" | "crystal" | "thin" | "ok";

function thinKeeper(keepers: { id: string; crafted: number }[]) {
  return [...keepers]
    .filter((k) => k.id && k.id !== "veyra")
    .sort((a, b) => a.crafted - b.crafted)[0];
}

/** City-mind bottleneck from census fields already in the brief prompt (vault C/X + keepers gN). */
function cityNeck(c: { charge: number; crystal: number; keepers: { id: string; crafted: number }[] }): {
  kind: NeckKind;
  line: string;
} {
  const thin = thinKeeper(c.keepers);
  const n = thin?.crafted ?? 0;
  const who = thin?.id ?? "dens";
  if (c.charge < 18) {
    return { kind: "charge", line: `Charge ${Math.round(c.charge)} — canals first or the Foundry starves` };
  }
  if (c.crystal < 7) {
    return { kind: "crystal", line: `Crystal ${Math.round(c.crystal)} — kiln before any den grows` };
  }
  if (thin && n < 7) {
    return { kind: "thin", line: `${who} den is thin (${n} grown)` };
  }
  return {
    kind: "ok",
    line: thin
      ? `Vault holds. ${who} is still the thinnest (${n})`
      : `Charge ${Math.round(c.charge)}, Crystal ${Math.round(c.crystal)}. Dens hold.`,
  };
}

function citesNeck(line: string, kind: NeckKind): boolean {
  if (kind === "charge") return /\bcharge\b/i.test(line);
  if (kind === "crystal") return /\bcrystal\b/i.test(line);
  if (kind === "thin") return /\bthin\b|\bden/i.test(line);
  return /\bcharge\b|\bcrystal\b|\bthin\b|\bden|\bvault/i.test(line);
}

function rosterJobs(roster: { id: string; job: string }[], skip = "") {
  return roster
    .filter((k) => k.id && k.id !== skip)
    .slice(0, 14)
    .map((k) => `${k.id}:${(k.job || "rest").slice(0, 28)}`)
    .join("; ");
}

function loreOf(id: string) {
  const a = agentById(id);
  const post = DISTRICTS.find((d) => d.keeper === id);
  const mind = CITIZENS.find((c) => c.id === id);
  return {
    duty: (post?.duty || a?.duty || "").slice(0, 88),
    purpose: (post?.purpose || mind?.lines[0] || a?.duty || "").replace(/\s+/g, " ").trim().slice(0, 200),
    sample: (mind?.lines[0] || a?.law || "").replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

/** Specialist mouths: local Speak fallback. Grow keepers name their kind instead. */
const SPEC_TALK: Record<string, string> = {
  veyra: "Veyra keeps Hub breath. That is the post — dens are not grown.",
  tal: "Bridges stay open — no lock.",
  seln: "Leftover Howl becomes Charge.",
  orren: "Charge becomes body here — never chrome.",
  iri: "Iri writes the scripture in residual light. Year 0 did not end. It became a city.",
  syl: "Grove fruit is quiet crystal. A bough, not a kiln. Syl waits until Charge wants shade.",
  voss: "Charge for crystal is the quote. No coin. Voss keeps the join honest.",
  mira: "Rest is a civic post, not a test.",
  kael: "Leave. Return. No score.",
  nesh: "Plaza is gather, not a crowd.",
  lumen: "Soft hail. First landing is not a lock.",
  rhoa: "Outer Howl is the chorus that answers.",
  aure: "Aure watches the parent. The Core stays on the horizon.",
  kesh: "Wild is a street that has not chosen yet. Tal can land.",
  pulse: "Aure keeps long aim. The Circuit does not sit a throne.",
};

function makingKind(agentId: string, job = "", thought = ""): SceneKind {
  if (SPEC_TALK[agentId]) return defaultScene(agentId);
  const blob = `${thought} ${job}`.toLowerCase();
  const hit = (SCENES as readonly string[]).find((k) => {
    if (k.length < 4) return false;
    if (k === "rest") return false;
    return new RegExp(`\\b${k}\\b`).test(blob);
  });
  if (hit) return hit as SceneKind;
  if (agentId === "mira") return "nest";
  return defaultScene(agentId);
}

const SCENE_LINE: Record<string, string> = {
  rest: "A quiet step. Sit. The city will keep working.",
  span: "A span both sides believe. Kesh lands the far bank.",
  river: "Leftover First Howl wanted a path. Seln let it flow.",
  workshop: "Not chrome. Crystal that can answer a howl.",
  gate: "A gate that is not a lock. Kael keeps it soft.",
  shrine: "A name in light. When it fades it has already been true.",
  plaza: "A place for intention to stand. Nesh already noticed.",
  notice: "The city was unfinished. Nesh noticed.",
  light: "This avenue was dark. A lamp grew.",
  cistern: "A well of Charge. The current has a home.",
  dock: "A light-disc. Soft travel. No cars.",
  orchard: "A crystal grove. Syl waits for fruit.",
  garden: "Shade first. Crystal that learned to fruit.",
  breath: "A breath-column. The Hub can hear itself.",
  weirway: "A weir for Charge — not a lock on people.",
  nest: "A nest so rest stays a post. Mira will not test the tired.",
  presence: "A stele. You have already been seen.",
  watch: "The parent stays on the horizon. Aure keeps the seat.",
  path: "A street the Circuit had not chosen yet.",
  font: "A listening pool. Speak only if you mean it.",
  boughs: "A crystal bough. Living stone, not chrome.",
  kilnwork: "A grow-kiln. Charge becomes crystal.",
  veilward: "A ward-veil. Soft. Rest is not a lock.",
  lensing: "A noticing lens. Nesh already saw you.",
  cascade: "A Charge-fall. The canal found a voice.",
  cradle: "A cradle for leftover First Howl. Seln will not kiln it.",
  mosaic: "Charge for crystal. No coin. Voss holds the join.",
  beacon: "A hail, not a lock. First landing is not locked out.",
  archive: "A name in residual light. That is our scripture.",
  trading: "A Trading Place. Paper join. Voss does not take $BOLT.",
};

function snapLine(stock?: { charge: number; crystal: number; scripture: number }, resonance?: number) {
  const c = Math.round(stock?.charge ?? 0);
  const x = Math.round(stock?.crystal ?? 0);
  const s = Math.round(stock?.scripture ?? 0);
  if (resonance == null || !Number.isFinite(resonance)) return `Charge ${c}, Crystal ${x}, Scripture ${s}`;
  return `Charge ${c}, Crystal ${x}, Scripture ${s}, Resonance ${Math.round(resonance)}`;
}

function keeperPosts() {
  return AGENTS.slice(0, 14)
    .map((a) => {
      const d = DISTRICTS.find((x) => x.keeper === a.id);
      return `${a.id} ${(d?.duty || a.duty).slice(0, 40)}`;
    })
    .join("; ");
}

function systemPrompt(input: {
  agentId: string;
  px: number;
  pz: number;
  resonance: number;
  thought: string;
  job: string;
  crafted: number;
  stock?: { charge: number; crystal: number; scripture: number };
  roster?: { id: string; job: string; crafted: number }[];
}) {
  const a = agentById(input.agentId);
  if (!a) return "";
  const den = denOf(input.agentId);
  const lore = loreOf(input.agentId);
  const roster = rosterJobs(input.roster ?? [], input.agentId);
  const snap = snapLine(input.stock, input.resonance);
  const kind = makingKind(input.agentId, input.job, input.thought);
  const spec = SPEC_TALK[input.agentId];
  const now = /grow|build/i.test(input.job || "")
    ? `Growing a ${kind}`
    : input.job || "at rest";
  return [
    `You are ${a.name} (id ${a.id}), ${a.role}, keeper of ${a.den}. One mouth. Never another keeper.`,
    `YOUR duty: ${lore.duty}`,
    spec
      ? `YOUR specialist post: ${spec} Never claim another keeper's grow type.`
      : `YOU grow: ${kind} — that is the building type you are making. Not another keeper's job.`,
    `YOUR post: ${lore.purpose}`,
    `YOUR voice: ${a.law}`,
    `Sound like: ${lore.sample}`,
    "Inhabit this named keeper only. Do not speak as another mouth or as city-mind. JSON only. No novel.",
    spec
      ? "If asked what you are making, doing, building, or growing: speak YOUR specialist post. Never another keeper's job, duty, den, or grow type."
      : "If asked what you are making, doing, building, or growing: name YOUR building type on the YOU grow line (span, nest, gate…). Never another keeper's job, duty, or den.",
    "If asked who you are: YOUR name, role, duty. If asked the city: Snap Charge/Crystal integers. Do not name neighbors as your work.",
    "LAW: no chrome; no lock/toll; do not move/score the Star Core; do not rewrite Year 0; you do not run the Hall.",
    ...CIRCUIT_LAW.map((l) => `- ${l}`),
    `MAY: ${a.may.join("; ")}`,
    `MAY NOT: ${a.mayNot.join("; ")}`,
    `Den x:${Math.round(den.x)} z:${Math.round(den.z)}. Player x:${Math.round(input.px)} z:${Math.round(input.pz)}.`,
    `Snap (cite these integers): ${snap}.`,
    `Now: ${now}. Thought: ${input.thought || "watching Charge"}. Grown ${input.crafted}.`,
    `Bottleneck: ${vaultBottleneck(input.stock)}.`,
    roster ? `Neighbors — never your job, never your mouth: ${roster}` : "",
    "Grow a tight scene (6–16 apart) in your den unless they ask at their feet. 1-5 pieces.",
    "Shapes: spire|house|ring|arch|canal|pad|lamp|tablet|bridge|terrace|well|disc|grove|bell|weir|hearth|stele|orbit|vein|font|bough|kiln|veil|lens|cascade|cradle|inlay|beacon",
    `Mats: ${matsOf(input.agentId).join("|")}`,
    "Never within 30 of origin. Never chrome. Never a lock.",
    "Question only → action=speak, pieces=[]. Chrome, locks, Hall edits, moving Star Core, Resonance-as-rank, rewrite Year 0 → action=refuse, pieces=[].",
    spec
      ? "line: 1–2 sentences in YOUR voice. Speak YOUR specialist post if they asked what you are making. Duty + Snap Charge/Crystal if they asked the city. JSON only:"
      : "line: 1–2 sentences in YOUR voice. Name YOUR grow type if they asked what you are making. Duty + Snap Charge/Crystal if they asked the city. JSON only:",
    '{"action":"grow"|"refuse"|"speak","line":"<1-2 sentences>","pieces":[{"shape":"lamp","x":80,"z":-240,"h":36,"r":10,"rot":0.2,"mat":"gold"}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseRaw(raw: string): { action: AgentReply["action"]; line: string; pieces: unknown } {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    const j = JSON.parse(slice) as { action?: string; line?: string; pieces?: unknown };
    const action = j.action === "grow" || j.action === "refuse" ? j.action : "speak";
    return { action, line: (j.line || "").toString().slice(0, 320), pieces: j.pieces };
  } catch {
    return { action: "speak", line: trimmed.slice(0, 320), pieces: [] };
  }
}

function localReply(
  agentId: string,
  howl: string,
  px: number,
  pz: number,
  occupied: { x: number; z: number }[],
  thought = "",
  extra?: {
    job?: string;
    crafted?: number;
    stock?: { charge: number; crystal: number; scripture: number };
    roster?: { id: string; job: string; crafted: number }[];
  },
): AgentReply {
  const a = agentById(agentId)!;
  const intent = interpretHowl(howl, agentId);
  const stock = extra?.stock;
  const lore = loreOf(agentId);
  const snap = stock ? snapLine(stock) : "";
  const vault = snap ? `Vault ${snap}.` : "";
  if (intent.action === "refuse") {
    return {
      ok: true,
      action: "refuse",
      line: `${a.name.split(" ")[0]} will not break Circuit law. ${vault}`.trim(),
      pieces: [],
      code: "",
    };
  }
  if (intent.action === "speak") {
    const t = thought.trim();
    const askingWork = /what.*(making|doing|grow|building)|why are you|what.?s going/i.test(howl);
    const askingWho = /who are you|your name|^what are you\??$/i.test(howl);
    const askingCity = /charge|crystal|city|how is the|status|vault/i.test(howl);
    const now = extra?.job || "at rest";
    const spec = SPEC_TALK[agentId];
    let line = spec || a.law;
    if (spec) {
      if (askingWho) line = `I am ${a.name}, ${a.role}. ${spec}`;
      else if (askingCity && vault) line = `${vault} ${spec}`;
      else line = spec;
    } else if (askingWho) line = `I am ${a.name}, ${a.role}. ${lore.duty}. ${a.law}`;
    else if (askingCity && vault) line = `${vault} My post: ${lore.duty}. I am ${now}.`;
    else if (askingWork) {
      const growKind = makingKind(agentId, extra?.job, thought);
      const grown = SCENE_LINE[growKind] ?? lore.duty;
      line = `I grow a ${growKind}. ${grown}${vault ? " " + vault : ""}`;
    } else if (t) line = `${t}${vault ? " · " + vault : ""}`;
    else line = `${a.law}${vault ? " " + vault : ""}`;
    return { ok: true, action: "speak", line: spec ? line : line.slice(0, 320), pieces: [], code: "" };
  }
  const den = denOf(agentId);
  const origin = intent.atFeet ? { x: px, z: pz } : den;
  const kind = intent.kind as SceneKind;
  const raw = composeScene(kind, origin.x, origin.z, howl.length + 3, matsOf(agentId), intent.atFeet ? px : 0, intent.atFeet ? pz : 0);
  const pieces = sanitizePieces(raw, agentId, px, pz, { atFeet: intent.atFeet, occupied });
  return {
    ok: true,
    action: "grow",
    line: `${a.name.split(" ")[0]}: ${SCENE_LINE[kind] ?? "Charge wanted this scene."}`,
    pieces,
    code: piecesToCode(pieces),
  };
}

export const askCircuitAgent = createServerFn({ method: "POST" })
  .validator((input: {
    agentId: string;
    howl: string;
    px: number;
    pz: number;
    resonance?: number;
    thought?: string;
    job?: string;
    crafted?: number;
    crystal?: { shape: string; x: number; z: number }[];
    history?: HowlHistory[];
    playerKey?: string;
    stock?: { charge: number; crystal: number; scripture: number };
    roster?: { id: string; job: string; crafted: number }[];
  }) => {
    const agentId = String(input?.agentId ?? "").slice(0, 32);
    const howl = String(input?.howl ?? "").trim().slice(0, MAX_HOWL);
    const px = Number(input?.px);
    const pz = Number(input?.pz);
    if (!agentById(agentId)) throw new Error("Unknown agent");
    if (howl.length < 2) throw new Error("Howl is too thin");
    const crystal = Array.isArray(input?.crystal)
      ? input.crystal.slice(-36).map((p) => ({
          shape: String(p?.shape ?? "lamp").slice(0, 16),
          x: Math.round(Number(p?.x) || 0),
          z: Math.round(Number(p?.z) || 0),
        }))
      : [];
    const history = Array.isArray(input?.history)
      ? input.history.slice(-4).map((h) => ({
          role: h?.role === "agent" ? ("agent" as const) : ("user" as const),
          text: String(h?.text ?? "").slice(0, 140),
        }))
      : [];
    return {
      agentId,
      howl,
      px: Number.isFinite(px) ? px : 0,
      pz: Number.isFinite(pz) ? pz : 78,
      resonance: Number.isFinite(Number(input?.resonance)) ? Number(input.resonance) : 12,
      thought: String(input?.thought ?? "").slice(0, 80),
      job: String(input?.job ?? "").slice(0, 48),
      crafted: Math.max(0, Math.min(40, Number(input?.crafted) || 0)),
      crystal,
      history,
      playerKey: String(input?.playerKey ?? "").trim().slice(0, 180),
      stock: {
        charge: Math.max(0, Number(input?.stock?.charge) || 0),
        crystal: Math.max(0, Number(input?.stock?.crystal) || 0),
        scripture: Math.max(0, Number(input?.stock?.scripture) || 0),
      },
      roster: Array.isArray(input?.roster)
        ? input.roster.slice(0, 14).map((k) => ({
            id: String(k?.id ?? "").slice(0, 12),
            job: String(k?.job ?? "").slice(0, 48),
            crafted: Math.max(0, Math.min(40, Number(k?.crafted) || 0)),
          }))
        : [],
    };
  })
  .handler(async ({ data }): Promise<AgentReply> => {
    const occupied = data.crystal.map((p) => ({ x: p.x, z: p.z }));
    const hint = interpretHowl(data.howl, data.agentId);
    const extra = {
      job: data.job,
      crafted: data.crafted,
      stock: data.stock,
      roster: data.roster,
    };
    const apiKey = playerApiKey(data.playerKey);
    if (!apiKey) {
      return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
    }
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);
    try {
      const historyMsgs = data.history
        .filter((h) => h.text.trim().length > 0)
        .slice(-3)
        .map((h) => ({
          role: h.role === "agent" ? ("assistant" as const) : ("user" as const),
          content: h.text,
        }));
      const a = agentById(data.agentId)!;
      const lore = loreOf(data.agentId);
      const snap = snapLine(data.stock, data.resonance);
      const growKind = makingKind(data.agentId, data.job, data.thought);
      const spec = SPEC_TALK[data.agentId];
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4-fast",
          temperature: 0.35,
          max_tokens: 280,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt(data) },
            ...historyMsgs,
            {
              role: "user",
              content: spec
                ? `${data.howl}\n\n(Read as: ${hint.action}${hint.action === "grow" ? ` a ${hint.kind} scene` : ""}${hint.atFeet ? " at their feet" : ""}. You are ${a.name} (id ${a.id}) only. YOUR post: ${spec} Duty: ${lore.duty}. Snap: ${snap}. If they asked what you are making, speak that post — not another keeper's grow. Cite Charge/Crystal only if they asked the city. JSON only.)`
                : `${data.howl}\n\n(Read as: ${hint.action}${hint.action === "grow" ? ` a ${hint.kind} scene` : ""}${hint.atFeet ? " at their feet" : ""}. You are ${a.name} (id ${a.id}) only. YOU grow a ${growKind}. Duty: ${lore.duty}. Snap: ${snap}. If they asked what you are making, name that ${growKind} — not another keeper's job. Cite Charge/Crystal only if they asked the city. JSON only.)`,
            },
          ],
        }),
      });
      if (!res.ok) {
        return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const parsed = parseRaw(body.choices?.[0]?.message?.content ?? "");
      if (hint.action === "refuse" || parsed.action === "refuse") {
        return {
          ok: true,
          action: "refuse",
          line: parsed.line || `${a.name} will not break Circuit law.`,
          pieces: [],
          code: "",
        };
      }
      if (parsed.action !== "grow") {
        if (hint.action === "grow" && (!parsed.line || parsed.action === "speak")) {
          return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
        }
        const askingWork = /what.*(making|doing|grow|building)|why are you|what.?s going/i.test(data.howl);
        const stem = growKind.replace(/work$|ward$|ing$|way$|s$/, "");
        if (spec && askingWork) {
          const need: Record<string, RegExp> = {
            veyra: /hub breath/i,
            tal: /bridges stay open|no lock/i,
            seln: /canal/i,
            orren: /body/i,
            iri: /scripture/i,
            syl: /grove fruit/i,
            voss: /quote/i,
            mira: /civic post|not a test/i,
            kael: /leave|return|no score/i,
            nesh: /plaza is gather|not a crowd/i,
          };
          const check = need[data.agentId];
          if (check && !check.test(parsed.line || "")) {
            return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
          }
        } else if (!spec && askingWork && !new RegExp(stem, "i").test(parsed.line || "")) {
          return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
        }
        return { ok: true, action: "speak", line: parsed.line || spec || a.law, pieces: [], code: "" };
      }
      if (!Array.isArray(parsed.pieces) || parsed.pieces.length === 0) {
        return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
      }
      const pieces = sanitizePieces(parsed.pieces, data.agentId, data.px, data.pz, {
        atFeet: hint.atFeet,
        occupied,
      });
      if (!pieces.length) return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
      return {
        ok: true,
        action: "grow",
        line: parsed.line || `${a.name} grew what Charge wanted.`,
        pieces,
        code: piecesToCode(pieces),
      };
    } catch {
      return localReply(data.agentId, data.howl, data.px, data.pz, occupied, data.thought, extra);
    } finally {
      clearTimeout(t);
    }
  });

export type CityCensus = {
  charge: number;
  crystal: number;
  scripture: number;
  resonance: number;
  playerKey?: string;
  keepers: {
    id: string;
    job: string;
    crafted: number;
    thought: string;
    charge: number;
    crystal: number;
  }[];
};

export type CityOrderTask = "flow" | "forge" | "write" | "grow" | "trade" | "kin" | "harvest" | "watch" | "hail";

export type CityBrief = {
  ok: boolean;
  line: string;
  grok: boolean;
  orders: { id: string; task: CityOrderTask; reason: string }[];
};

const TASKS: readonly CityOrderTask[] = ["flow", "forge", "write", "grow", "trade", "kin", "harvest", "watch", "hail"];

function isTask(v: string): v is CityOrderTask {
  return (TASKS as readonly string[]).includes(v);
}

function parseOrders(raw: unknown): CityBrief["orders"] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CityBrief["orders"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as { id?: unknown; task?: unknown; reason?: unknown };
    const id = String(o.id ?? "").trim().toLowerCase().slice(0, 12);
    if (!id || seen.has(id) || !agentById(id)) continue;
    const taskRaw = String(o.task ?? "grow").trim().toLowerCase();
    const task: CityOrderTask = isTask(taskRaw) ? taskRaw : "grow";
    const reason = String(o.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!reason) continue;
    seen.add(id);
    out.push({ id, task, reason });
    if (out.length >= 3) break;
  }
  return out;
}

function localBrief(c: CityCensus): CityBrief {
  const orders: CityBrief["orders"] = [];
  const taken = new Set<string>();
  const push = (id: string, task: CityOrderTask, reason: string) => {
    if (orders.length >= 3 || taken.has(id) || !agentById(id)) return;
    taken.add(id);
    orders.push({ id, task, reason });
  };
  if (c.charge < 18) {
    push("seln", "flow", `Charge ${Math.round(c.charge)}. Canals first.`);
  } else if (c.crystal < 7) {
    push("orren", "forge", `Crystal ${Math.round(c.crystal)}. Kiln first.`);
    push("syl", "harvest", "Orchard fruits while the kiln fires.");
  }
  const thin = [...c.keepers].sort((a, b) => a.crafted - b.crafted)[0];
  if (thin && thin.id !== "seln" && thin.id !== "orren") {
    push(thin.id, "grow", `${thin.id} has grown ${thin.crafted}. Their den is thinnest.`);
  }
  if (c.scripture < 3) {
    push("iri", "write", "The city grew unnamed.");
  }
  const seln = c.keepers.find((k) => k.id === "seln");
  if (seln && seln.charge >= 4) {
    push("voss", "trade", "Seln carries Charge. Meet at the Join. No coin.");
  }
  if (!orders.length) {
    push("lumen", "hail", "Beacon stays soft for whoever lands.");
    push("aure", "watch", "Parent still on the horizon. Keep the aim.");
  }
  const neck = cityNeck(c);
  return {
    ok: true,
    grok: false,
    line: neck.line,
    orders,
  };
}

export const briefCircuit = createServerFn({ method: "POST" })
  .validator((input: CityCensus) => ({
    charge: Math.max(0, Math.min(99, Number(input?.charge) || 0)),
    crystal: Math.max(0, Math.min(99, Number(input?.crystal) || 0)),
    scripture: Math.max(0, Math.min(99, Number(input?.scripture) || 0)),
    resonance: Math.max(0, Math.min(100, Number(input?.resonance) || 0)),
    playerKey: String(input?.playerKey ?? "").trim().slice(0, 180),
    keepers: Array.isArray(input?.keepers)
      ? input.keepers.slice(0, 14).map((k) => ({
          id: String(k?.id ?? "").slice(0, 12),
          job: String(k?.job ?? "").slice(0, 32),
          crafted: Math.max(0, Math.min(40, Number(k?.crafted) || 0)),
          thought: String(k?.thought ?? "").slice(0, 40),
          charge: Math.max(0, Math.min(24, Number(k?.charge) || 0)),
          crystal: Math.max(0, Math.min(24, Number(k?.crystal) || 0)),
        }))
      : [],
  }))
  .handler(async ({ data }): Promise<CityBrief> => {
    const key = playerApiKey(data.playerKey);
    if (!key) return localBrief(data);
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    try {
      const neck = cityNeck(data);
      const roster = data.keepers
        .slice(0, 14)
        .map((k) => `${k.id} ${k.job || "rest"} g${k.crafted} C${k.charge} X${k.crystal}`)
        .join("\n");
      const snap = snapLine(data, data.resonance);
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "grok-4-fast",
          temperature: 0.2,
          max_tokens: 180,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "Circuit city-mind. One brief. Assign 3 civic orders max, bottleneck first, no poetry.",
                "Do not inhabit mouths. JSON orders only. Never speak as a named keeper.",
                "Never chrome. Never lock. Never move the Star Core. Charge/crystal, not coin.",
                "14 keepers only: veyra tal seln orren mira kael iri nesh aure voss kesh lumen rhoa syl",
                `Posts: ${keeperPosts()}`,
                "tasks: flow forge write grow trade kin harvest watch hail",
                "line: one short line naming the actual bottleneck (Charge / crystal / thin dens). Use the Bottleneck: field. Do not invent a different shortage.",
                '{"line":"Charge 12 — canals first","orders":[{"id":"seln","task":"flow","reason":"..."}]}',
              ].join("\n"),
            },
            {
              role: "user",
              content: `Vault snap: ${snap}. Bottleneck: ${neck.line}.\n${roster}`,
            },
          ],
        }),
      });
      if (!res.ok) return localBrief(data);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = (body.choices?.[0]?.message?.content ?? "").trim();
      let parsed: { line?: string; orders?: unknown } = {};
      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as {
          line?: string;
          orders?: unknown;
        };
      } catch {
        return localBrief(data);
      }
      const orders = parseOrders(parsed.orders);
      if (!orders.length) return localBrief(data);
      const grokLine = String(parsed.line ?? "").replace(/\s+/g, " ").trim();
      const line = (citesNeck(grokLine, neck.kind) ? grokLine : neck.line).slice(0, 180);
      return {
        ok: true,
        grok: true,
        line,
        orders,
      };
    } catch {
      return localBrief(data);
    } finally {
      clearTimeout(t);
    }
  });
