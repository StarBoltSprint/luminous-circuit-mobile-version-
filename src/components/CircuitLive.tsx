import { useEffect, useRef, useState } from "react";
import { useP2PRoom } from "@/lib/multiplayer";
import type { EngineHandle } from "@/game/engine";
import type { LiveMsg } from "@/game/live";

type Props = {
  engine: EngineHandle | null;
  onHud?: (line: string) => void;
};

export function CircuitLive({ engine, onHud }: Props) {
  const p2p = useP2PRoom({ room: "circuit", name: "walker" });
  const [role, setRole] = useState<"solo" | "host" | "guest">("solo");
  const hostId = useRef<string | null>(null);
  const roleRef = useRef(role);
  roleRef.current = role;
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!hostId.current) {
        hostId.current = p2p.selfId;
        setRole("host");
        p2p.setName("host");
        p2p.setHub(p2p.selfId);
        p2p.send({ t: "host", id: p2p.selfId });
      }
    }, 2200);
    p2p.send({ t: "who" });
    return () => window.clearTimeout(t);
  }, [p2p.selfId, p2p.send]);

  useEffect(() => {
    const sendWish = (msg: unknown) => {
      p2p.send(msg);
    };
    engineRef.current?.setLiveRole(role, role === "guest" ? sendWish : null);
    const n = p2p.peers.filter((p) => p.connectionState === "connected").length;
    const line =
      role === "host"
        ? `Live host · ${n + 1}`
        : role === "guest"
          ? `Live · ${n + 1}`
          : n
            ? `Joining live… ${n}`
            : "Solo land";
    onHud?.(line);
    return () => {
      engineRef.current?.setLiveRole("solo", null);
    };
  }, [role, p2p.peers, p2p.send, onHud]);

  useEffect(
    () =>
      p2p.onMessage((from, data) => {
        const msg = data as LiveMsg;
        if (!msg || typeof msg !== "object" || !("t" in msg)) return;
        if (msg.t === "who") {
          if (roleRef.current === "host") p2p.send({ t: "host", id: p2p.selfId }, from);
          return;
        }
        if (msg.t === "host") {
          const id = String(msg.id || from);
          if (!hostId.current || id < hostId.current) {
            hostId.current = id;
            const mine = id === p2p.selfId;
            setRole(mine ? "host" : "guest");
            p2p.setName(mine ? "host" : "walker");
            p2p.setHub(id);
          } else if (hostId.current === p2p.selfId && id > p2p.selfId) {
            p2p.setName("host");
            p2p.setHub(p2p.selfId);
            p2p.send({ t: "host", id: p2p.selfId }, from);
          }
          return;
        }
        if (msg.t === "wish" && roleRef.current === "host") {
          engineRef.current?.iterateFolk(msg.folkId, msg.wish);
          engineRef.current?.growFromWish(msg.wish, from);
          return;
        }
        if (msg.t === "birth" && roleRef.current === "host") {
          engineRef.current?.birthFolkRemote(msg.name, msg.crew, from);
          return;
        }
        if (msg.t === "snap" && roleRef.current === "guest") {
          engineRef.current?.applyLiveSnap(msg);
        }
      }),
    [p2p.onMessage, p2p.selfId, p2p.send],
  );

  useEffect(() => {
    if (role !== "host") return;
    let last = 0;
    let raf = 0;
    const loop = (now: number) => {
      if (now - last >= (p2p.peers.length > 12 ? 180 : 120)) {
        const snap = engineRef.current?.liveSnap();
        if (snap) {
          snap.host = p2p.selfId;
          p2p.broadcast(snap);
        }
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [role, p2p.broadcast, p2p.selfId, p2p.peers.length]);

  useEffect(() => {
    if (role !== "guest" || !hostId.current) return;
    const hid = hostId.current;
    const still = p2p.peers.some((p) => p.id === hid && p.connectionState !== "failed" && p.connectionState !== "closed");
    if (still) return;
    hostId.current = null;
    const t = window.setTimeout(() => {
      if (hostId.current) return;
      hostId.current = p2p.selfId;
      setRole("host");
      p2p.setName("host");
      p2p.setHub(p2p.selfId);
      p2p.send({ t: "host", id: p2p.selfId });
    }, 1600);
    return () => window.clearTimeout(t);
  }, [p2p.peers, role, p2p.selfId, p2p.send]);

  return null;
}
