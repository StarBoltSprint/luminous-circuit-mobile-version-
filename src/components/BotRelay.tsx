import { useEffect } from "react";
import type { EngineHandle, HudSnap } from "@/game/engine";
import { ackCmds, pushHud, readPair, SHARED_LAND } from "@/game/bot-pair";

/** Pulls Grok Bot commands into this running land. Player tab is the host. */
export function BotRelay({ engine, hud }: { engine: EngineHandle | null; hud: HudSnap }) {
  useEffect(() => {
    if (!engine) return;
    let stop = false;
    const tick = async () => {
      const pair = readPair();
      const land = SHARED_LAND;
      try {
        const cmds = await pushHud(land, {
          zone: hud.zone,
          nearby: hud.nearby,
          stock: hud.stock,
          px: hud.px,
          pz: hud.pz,
          mode: hud.mode,
          toast: hud.toast,
        });
        if (stop || !cmds.length) return;
        const ids: string[] = [];
        for (const cmd of cmds) {
          engine.applyBotCmd(cmd);
          if (cmd.id) ids.push(cmd.id);
        }
        await ackCmds(land, ids);
        if (pair?.code && pair.code !== land) await pushHud(pair.code, { zone: hud.zone }).catch(() => {});
      } catch {
        /* relay optional */
      }
    };
    const id = window.setInterval(() => { void tick(); }, 900);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [engine, hud.zone, hud.px, hud.pz, hud.mode, hud.nearby, hud.stock, hud.toast]);
  return null;
}
