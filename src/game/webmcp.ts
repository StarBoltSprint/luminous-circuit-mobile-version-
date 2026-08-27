/** WebMCP + window.__LC_TOOLS__ so Grok Bot can drive Core Spire from the play page. */

export type AgentHud = {
  mode?: string;
  zone?: string | null;
  toast?: string | null;
  nearby?: { id: string; name: string; role: string; line: string; job: string } | null;
  stock?: { charge: number; crystal: number; scripture: number; line: string } | null;
};

export type AgentHandle = {
  land: () => void;
  talk: () => void;
  howl: (held: boolean) => void;
  openMap: () => void;
  hud: () => AgentHud;
};

type Tool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (args?: Record<string, unknown>) => Promise<unknown> | unknown;
};

declare global {
  interface Window {
    __LC_TOOLS__?: Record<string, Tool>;
    __LC_AGENT__?: AgentHandle;
  }
  interface Navigator {
    modelContext?: { registerTool?: (t: unknown) => Promise<void> | void };
  }
}

let bound: AgentHandle | null = null;

export function bindAgentHandle(h: AgentHandle | null) {
  bound = h;
  if (typeof window !== "undefined") {
    if (h) window.__LC_AGENT__ = h;
    else delete window.__LC_AGENT__;
  }
}

function need(): AgentHandle {
  if (!bound) throw new Error("City is not awake yet. Open the play page and wait for land.");
  return bound;
}

const TOOLS: Tool[] = [
  {
    name: "land_in_city",
    description: "Leave the title veil and land in Core Spire City.",
    execute() {
      need().land();
      return { ok: true, next: "Call get_city_hud after a second." };
    },
  },
  {
    name: "get_city_hud",
    description: "Read zone, vault Charge/crystal/scripture, nearby keeper, toast.",
    execute() {
      return need().hud();
    },
  },
  {
    name: "talk_nearby",
    description: "Talk to the nearest keeper if one is in reach.",
    execute() {
      const n = need().hud().nearby;
      if (!n) return { ok: false, reason: "No keeper in reach. Walk closer." };
      need().talk();
      return { ok: true, who: n.name, role: n.role, job: n.job };
    },
  },
  {
    name: "howl",
    description: "Hold a Hub Howl for about 1.1 seconds (gold window).",
    async execute() {
      const h = need();
      h.howl(true);
      await new Promise((r) => setTimeout(r, 1100));
      h.howl(false);
      return { ok: true };
    },
  },
  {
    name: "open_map",
    description: "Open the Circuit map sheet.",
    execute() {
      need().openMap();
      return { ok: true };
    },
  },
  {
    name: "get_play_url",
    description: "Canonical play URL and agent docs.",
    execute() {
      return {
        play: "https://starboltsprint.github.io/luminous-circuit-mobile-version-/",
        llms: "https://starboltsprint.github.io/luminous-circuit-mobile-version-/llms.txt",
        agent: "https://starboltsprint.github.io/luminous-circuit-mobile-version-/agent.md",
      };
    },
  },
];

export async function installWebMcp() {
  if (typeof window === "undefined") return;
  const bag: Record<string, Tool> = {};
  for (const t of TOOLS) bag[t.name] = t;
  window.__LC_TOOLS__ = bag;

  const mc = navigator.modelContext;
  if (mc?.registerTool) {
    for (const t of TOOLS) {
      try {
        await mc.registerTool({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema ?? { type: "object", properties: {} },
          execute: (args: Record<string, unknown>) => t.execute(args),
        });
      } catch {
        /* page still has window.__LC_TOOLS__ */
      }
    }
  }
}
