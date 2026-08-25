import { buzz, setHapticMuted } from "./haptics";

export type AudioBus = {
  unlock: () => void;
  howl: () => void;
  talk: () => void;
  land: () => void;
  foot: (speed: number) => void;
  canal: () => void;
  kiln: () => void;
  grow: () => void;
  setMuted: (m: boolean) => void;
  muted: () => boolean;
  dispose: () => void;
};

type Voice = {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  delay?: number;
};

export function createAudio(): AudioBus {
  let ctx: AudioContext | null = null;
  let muted = false;
  let lastFoot = 0;
  let blocked = false;
  let drone: { osc: OscillatorNode; fifth: OscillatorNode; pad: OscillatorNode; gain: GainNode; gain5: GainNode; gainPad: GainNode } | null = null;

  function Ctor(): typeof AudioContext | null {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    return w.AudioContext || w.webkitAudioContext || null;
  }

  function ac(): AudioContext | null {
    if (blocked) return null;
    if (ctx && ctx.state === "closed") ctx = null;
    if (ctx) return ctx;
    try {
      const C = Ctor();
      if (!C) {
        blocked = true;
        return null;
      }
      ctx = new C();
      return ctx;
    } catch {
      // Samsung Internet / autoplay policy: constructor throws until a gesture.
      blocked = true;
      ctx = null;
      return null;
    }
  }

  function play(fn: (c: AudioContext) => void) {
    if (muted) return;
    try {
      const c = ac();
      if (!c) return;
      if (c.state === "suspended") void c.resume().catch(() => {});
      fn(c);
    } catch {
      /* Samsung / blocked AudioContext — never throw into the loop */
    }
  }

  function voice(c: AudioContext, spec: Voice) {
    const type = spec.type ?? "sine";
    const gain = spec.gain ?? 0.08;
    const attack = spec.attack ?? 0.02;
    const delay = spec.delay ?? 0;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(spec.freq, t0);
    if (spec.to && spec.to > 0) {
      o.frequency.exponentialRampToValueAtTime(spec.to, t0 + spec.dur * 0.92);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + spec.dur + 0.05);
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain = 0.08, attack = 0.02) {
    play((c) => {
      voice(c, { freq, dur, type, gain, attack });
    });
  }

  return {
    unlock() {
      blocked = false;
      try {
        const c = ac();
        if (!c) return;
        if (c.state === "suspended") void c.resume().catch(() => {});
        if (!drone && !muted) {
          const o = c.createOscillator();
          const o5 = c.createOscillator();
          const op = c.createOscillator();
          const g = c.createGain();
          const g5 = c.createGain();
          const gp = c.createGain();
          o.type = "sine";
          o.frequency.value = 72;
          o5.type = "sine";
          o5.frequency.value = 108; // quiet fifth — richer, not louder
          op.type = "sine";
          op.frequency.value = 54; // pad — sub, not louder
          g.gain.value = 0.015;
          g5.gain.value = 0.004;
          gp.gain.value = 0.005;
          o.connect(g);
          o5.connect(g5);
          op.connect(gp);
          g.connect(c.destination);
          g5.connect(c.destination);
          gp.connect(c.destination);
          o.start();
          o5.start();
          op.start();
          drone = { osc: o, fifth: o5, pad: op, gain: g, gain5: g5, gainPad: gp };
        }
      } catch {
        /* Samsung / autoplay — city stays silent, never throws */
      }
    },
    howl() {
      play((c) => {
        const t0 = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(220, t0);
        o.frequency.exponentialRampToValueAtTime(88, t0 + 0.9);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.12, t0 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + 1.2);
        // Quiet fifth — civic overtone, not a beep. Short and thin.
        try {
          const o5 = c.createOscillator();
          const g5 = c.createGain();
          o5.type = "sine";
          o5.frequency.setValueAtTime(330, t0);
          o5.frequency.exponentialRampToValueAtTime(132, t0 + 0.42);
          g5.gain.setValueAtTime(0, t0);
          g5.gain.linearRampToValueAtTime(0.028, t0 + 0.05);
          g5.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);
          o5.connect(g5);
          g5.connect(c.destination);
          o5.start(t0);
          o5.stop(t0 + 0.52);
        } catch {
          /* Samsung — overtone optional, howl still sounds */
        }
        try {
          voice(c, { freq: 73, dur: 0.45, type: "sine", gain: 0.007, attack: 0.08, delay: 0.4 });
        } catch {
          /* Samsung — overtone optional, howl still sounds */
        }
        try {
          voice(c, { freq: 98, dur: 0.4, type: "sine", gain: 0.006, attack: 0.06, delay: 0.2 });
        } catch {
          /* Samsung — overtone optional, howl still sounds */
        }
        try {
          voice(c, { freq: 176, dur: 0.42, type: "sine", gain: 0.007, attack: 0.06, delay: 0.32 });
        } catch {
          /* Samsung — overtone optional, howl still sounds */
        }
      });
      buzz("howl");
    },
    talk() {
      // Short glass chime — a word, not a beep. Softer and thinner than howl.
      play((c) => {
        voice(c, { freq: 523.3, to: 392, dur: 0.3, type: "sine", gain: 0.03, attack: 0.012 });
        try {
          voice(c, { freq: 784, to: 659.3, dur: 0.24, type: "sine", gain: 0.012, attack: 0.016, delay: 0.05 });
        } catch {
          /* Samsung — overtone optional, chime still sounds */
        }
        try {
          voice(c, { freq: 523, dur: 0.22, type: "sine", gain: 0.01, attack: 0.02, delay: 0.18 });
        } catch {
          /* Samsung — overtone optional, chime still sounds */
        }
        try {
          voice(c, { freq: 261, dur: 0.22, type: "sine", gain: 0.007, attack: 0.02, delay: 0.12 });
        } catch {
          /* Samsung — overtone optional, chime still sounds */
        }
        try {
          voice(c, { freq: 349, dur: 0.2, type: "sine", gain: 0.006, attack: 0.02, delay: 0.08 });
        } catch {
          /* Samsung — overtone optional, chime still sounds */
        }
      });
      buzz("talk");
    },
    land() {
      // Arrival — short low fifth then a quiet high glass. Crystal city, not a UI beep.
      play((c) => {
        voice(c, { freq: 110, dur: 0.28, type: "sine", gain: 0.05, attack: 0.025 });
        voice(c, { freq: 165, dur: 0.26, type: "sine", gain: 0.03, attack: 0.03, delay: 0.02 });
        try {
          voice(c, { freq: 1318.5, to: 1046.5, dur: 0.36, type: "sine", gain: 0.012, attack: 0.008, delay: 0.22 });
        } catch {
          /* Samsung — glass optional, fifth still lands */
        }
        try {
          voice(c, { freq: 392, dur: 0.22, type: "sine", gain: 0.01, attack: 0.02, delay: 0.22 });
        } catch {
          /* Samsung — overtone optional, fifth still lands */
        }
        try {
          voice(c, { freq: 440, dur: 0.24, type: "sine", gain: 0.008, attack: 0.02, delay: 0.12 });
        } catch {
          /* Samsung — overtone optional, fifth still lands */
        }
      });
      buzz("land");
    },
    foot(speed) {
      if (muted || speed < 4) return;
      const now = performance.now();
      const gap = speed > 22 ? 280 : 420;
      if (now - lastFoot < gap) return;
      lastFoot = now;
      tone(90 + Math.random() * 20, 0.07, "sine", 0.015);
      try {
        tone(60, 0.05, "sine", 0.006);
      } catch {
        /* Samsung */
      }
    },
    canal() {
      // Cyan current — leftover First Howl given banks. Soft flow, not a splash.
      play((c) => {
        voice(c, { freq: 164.8, to: 196, dur: 1.05, type: "sine", gain: 0.036, attack: 0.08 });
        voice(c, { freq: 246.9, to: 220, dur: 1.1, type: "sine", gain: 0.022, attack: 0.12, delay: 0.04 });
        voice(c, { freq: 329.6, to: 392, dur: 0.7, type: "triangle", gain: 0.016, attack: 0.18, delay: 0.1 });
        voice(c, { freq: 659.3, to: 523.3, dur: 0.45, type: "sine", gain: 0.012, attack: 0.04, delay: 0.22 });
        try {
          voice(c, { freq: 196, dur: 0.55, type: "sine", gain: 0.008, attack: 0.08, delay: 0.4 });
        } catch {
          /* Samsung — overtone optional, canal still sounds */
        }
        try {
          voice(c, { freq: 147, dur: 0.4, type: "sine", gain: 0.007, attack: 0.06, delay: 0.15 });
        } catch {
          /* Samsung — overtone optional, canal still sounds */
        }
      });
    },
    kiln() {
      // Gold transmute — Charge hearing itself into crystal. Warm body, then a quiet gold ping.
      play((c) => {
        voice(c, { freq: 110, to: 196, dur: 0.95, type: "triangle", gain: 0.045, attack: 0.06 });
        voice(c, { freq: 246.9, to: 392, dur: 0.85, type: "sine", gain: 0.028, attack: 0.08, delay: 0.06 });
        voice(c, { freq: 329.6, to: 523.3, dur: 0.7, type: "sine", gain: 0.02, attack: 0.1, delay: 0.16 });
        voice(c, { freq: 659.3, dur: 0.38, type: "triangle", gain: 0.018, attack: 0.02, delay: 0.52 });
        try {
          voice(c, { freq: 196, dur: 0.45, type: "sine", gain: 0.008, attack: 0.06, delay: 0.28 });
        } catch {
          /* Samsung — overtone optional, kiln still sounds */
        }
        try {
          voice(c, { freq: 110, dur: 0.4, type: "sine", gain: 0.007, attack: 0.06, delay: 0.14 });
        } catch {
          /* Samsung — overtone optional, kiln still sounds */
        }
        try {
          voice(c, { freq: 196, dur: 0.38, type: "sine", gain: 0.006, attack: 0.05, delay: 0.52 });
        } catch {
          /* Samsung — overtone optional, kiln still sounds */
        }
      });
      buzz("kiln");
    },
    grow() {
      // Short rising crystal ping — a den standing. Quiet glass, never a beep.
      play((c) => {
        voice(c, { freq: 1046.5, to: 1568, dur: 0.18, type: "sine", gain: 0.018, attack: 0.006 });
        try {
          voice(c, { freq: 1568, to: 2093, dur: 0.14, type: "sine", gain: 0.009, attack: 0.004 });
        } catch {
          /* Samsung — sparkle optional, ping still sounds */
        }
        try {
          voice(c, { freq: 784, dur: 0.22, type: "triangle", gain: 0.008, attack: 0.01, delay: 0.12 });
        } catch {
          /* Samsung — sparkle optional, ping still sounds */
        }
        try {
          voice(c, { freq: 261, dur: 0.22, type: "sine", gain: 0.009, attack: 0.02, delay: 0.18 });
        } catch {
          /* Samsung — sparkle optional, ping still sounds */
        }
        try {
          voice(c, { freq: 196, dur: 0.22, type: "sine", gain: 0.008, attack: 0.02, delay: 0.16 });
        } catch {
          /* Samsung — sparkle optional, ping still sounds */
        }
        try {
          voice(c, { freq: 82, dur: 0.22, type: "sine", gain: 0.006, attack: 0.02, delay: 0.16 });
        } catch {
          /* Samsung — sparkle optional, ping still sounds */
        }
      });
      buzz("grow");
    },
    setMuted(m) {
      muted = m;
      try {
        setHapticMuted(m);
      } catch {
        /* ok */
      }
      try {
        if (drone) {
          drone.gain.gain.value = m ? 0 : 0.015;
          drone.gain5.gain.value = m ? 0 : 0.004;
          drone.gainPad.gain.value = m ? 0 : 0.005;
        }
      } catch {
        /* ok */
      }
    },
    muted: () => muted,
    dispose() {
      try {
        drone?.osc.stop();
      } catch {
        /* ok */
      }
      try {
        drone?.fifth.stop();
      } catch {
        /* ok */
      }
      try {
        drone?.pad.stop();
      } catch {
        /* ok */
      }
      drone = null;
      try {
        void ctx?.close();
      } catch {
        /* ok */
      }
      ctx = null;
      blocked = false;
    },
  };
}
